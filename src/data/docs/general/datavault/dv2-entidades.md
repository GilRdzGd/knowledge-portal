# Entidades del modelo

Data Vault se apoya en tres entidades fundamentales. Usa el **toggle On-Premise / Cloud** (arriba a la derecha) para ver cómo cambian los tipos de datos, estructuras y tecnologías en cada entorno.

> Regla mental: **Hub = qué existe · Link = cómo se relaciona · Satellite = cómo cambia en el tiempo.**

## Hub — el concepto de negocio

El Hub es la entidad central del vault. Almacena las **claves de negocio únicas** de una entidad del dominio (cliente, cuenta, producto, pedido). No almacena atributos descriptivos.

**Estructura obligatoria (lógica)**

| Campo | Obligatorio | Descripción |
| --- | --- | --- |
| `{entidad}hashkey` | Sí | Hash Key: SHA-512 de la business key. Llave primaria del Hub. |
| `{bk}` | Sí | Business Key: clave natural del negocio (ej. `id_cliente`, `num_cuenta`). |
| `loaddate` | Sí | Fecha/hora de ingreso al vault (fecha de proceso de la cosecha). |
| `recordsource` | Sí | Fuente lógica de origen (ej. `SIEBEL`, `CORE_BANCARIO`). |
| `systemsource` | Sí | Sistema físico de origen (host/plataforma). |
| `fifecha` | Sí | Fecha funcional de la cosecha (partición lógica de la carga). |

**Definición física y ejemplo**

:::onprem
Tipos: `STRING`, `BIGINT`. Almacenamiento: HDFS + Parquet. Motor: Hive / Impala.

```sql
CREATE TABLE raw.h_baz_credito_cliente (
  clientehashkey  STRING   COMMENT 'SHA-512 de la business key',
  id_cliente      STRING   COMMENT 'Business Key natural',
  loaddate        BIGINT   COMMENT 'Fecha de proceso de la cosecha',
  recordsource    STRING   COMMENT 'Fuente logica de origen',
  systemsource    STRING   COMMENT 'Sistema fisico de origen',
  fifecha         BIGINT   COMMENT 'Fecha funcional de cosecha'
)
STORED AS PARQUET;
```
:::

:::cloud
Tipos: `VARCHAR`, `BIGINT`. Almacenamiento: Amazon S3 + Parquet (tabla Iceberg / externa). Motor: Athena / Redshift.

```sql
CREATE TABLE raw.h_baz_credito_cliente (
  clientehashkey  VARCHAR   COMMENT 'SHA-512 de la business key',
  id_cliente      VARCHAR   COMMENT 'Business Key natural',
  loaddate        BIGINT    COMMENT 'Fecha de proceso de la cosecha',
  recordsource    VARCHAR   COMMENT 'Fuente logica de origen',
  systemsource    VARCHAR   COMMENT 'Sistema fisico de origen',
  fifecha         BIGINT    COMMENT 'Fecha funcional de cosecha'
)
LOCATION 's3://.../raw/h_baz_credito_cliente/'
TBLPROPERTIES ('table_type'='ICEBERG');
```

> Propuesta preliminar; se confirmará al definir la arquitectura AWS.
:::

> **Regla:** un Hub contiene UNA sola Business Key. Si una entidad tiene múltiples identificadores alternativos, usar Satellites para los alias, no columnas adicionales en el Hub.

## Link — la relación

El Link representa una **relación entre dos o más Hubs**. Modela asociaciones, transacciones y eventos de negocio. No almacena atributos descriptivos, pero **sí puede incluir business keys** dependientes propias de la relación.

**Estructura obligatoria (lógica)**

| Campo | Obligatorio | Descripción |
| --- | --- | --- |
| `{ent1}{ent2}lnkhashkey` | Sí | Hash Key del Link: hash compuesto de todas las HK participantes. |
| `{ent1}hashkey` | Sí | Hash Key del primer Hub participante. |
| `{entN}hashkey` | Sí | Hash Key del N-ésimo Hub participante. |
| `loaddate` / `recordsource` / `systemsource` / `fifecha` | Sí | Metadatos obligatorios. |
| `{bk}` *(opcional)* | Cond. | Business key dependiente propia de la relación, cuando aplique. |

**Definición física y ejemplo**

:::onprem
```sql
CREATE TABLE raw.l_baz_credito_cliente_pedido (
  clientepedidolnkhashkey  STRING  COMMENT 'SHA-512(clientehashkey - pedidohashkey)',
  clientehashkey           STRING  COMMENT 'FK a h_baz_credito_cliente',
  pedidohashkey            STRING  COMMENT 'FK a h_baz_credito_pedido',
  loaddate                 BIGINT,
  recordsource             STRING,
  systemsource             STRING,
  fifecha                  BIGINT
)
STORED AS PARQUET;
```
:::

:::cloud
```sql
CREATE TABLE raw.l_baz_credito_cliente_pedido (
  clientepedidolnkhashkey  VARCHAR  COMMENT 'SHA-512(clientehashkey - pedidohashkey)',
  clientehashkey           VARCHAR  COMMENT 'FK a h_baz_credito_cliente',
  pedidohashkey            VARCHAR  COMMENT 'FK a h_baz_credito_pedido',
  loaddate                 BIGINT,
  recordsource             VARCHAR,
  systemsource             VARCHAR,
  fifecha                  BIGINT
)
LOCATION 's3://.../raw/l_baz_credito_cliente_pedido/'
TBLPROPERTIES ('table_type'='ICEBERG');
```

> Propuesta preliminar; se confirmará al definir la arquitectura AWS.
:::

> **Regla:** los Links son inmutables. Si una relación cambia, NO se actualiza; se genera un nuevo registro. Las fechas de vigencia van en un Satellite (Status / Effectivity).

## Satellite — estructura base

El Satellite almacena los **atributos descriptivos que cambian en el tiempo**, asociados a un Hub o Link. Es la única entidad que modela el historial de cambios.

| Campo | Obligatorio | Descripción |
| --- | --- | --- |
| `{padre}hashkey` | Sí | Hash Key del Hub o Link padre. Parte de la PK. |
| `loaddate` | Sí | Fecha/hora de carga. Parte de la PK. Identifica la versión. |
| `hashdiff` | Rec. | Hash SHA-512 de los atributos descriptivos. Detecta cambios. |
| `recordsource` / `systemsource` / `fifecha` | Sí | Metadatos obligatorios. |
| `{atributos_negocio}` | Sí | Campos descriptivos propios de la entidad. |

**Clave primaria:** `({padre}hashkey, loaddate)`.

> **No usamos `loadenddate`.** La vigencia (fin de versión) se calcula en vistas / PIT, no se materializa en RAW.

## Subtipos de Satellite

DV2 define variantes especializadas, cada una con reglas de PK, `hashdiff` y lógica de carga distintas. Elegir el tipo correcto es una decisión de arquitectura.

| Subtipo | Prefijo | Cuándo usarlo | PK | HashDiff |
| --- | --- | --- | --- | --- |
| SAT estándar | `s_` | Atributos con historial (CDC). El más común. | hashkey + loaddate | Sí |
| Multi-Active (MAS) | `s_ma_` | Varios valores activos del mismo atributo, con historial. | hashkey + loaddate + subsequence | No |
| Non-Historized (NHS) | `s_nh_` | Append-only / upsert sin historial (eventos, alto volumen). | hashkey + loaddate + subsequence | No |
| Status Tracking (ST) | `s_st_` | Solo cambios de estado/estatus. | hashkey + loaddate | Sí |
| Computed (CS) | `s_cs_` | Atributos calculados/derivados. Vive en CURATED. | hashkey + loaddate | Sí |
| Record Tracking (RT) | `s_rt_` | Presencia/ausencia del registro en la fuente por cosecha. | hashkey + loaddate | No |

**Variantes conceptuales adicionales:**

- **Effectivity Satellite** — ST/SAT sobre un Link que modela fechas de vigencia (`fecha_inicio_vig`, `fecha_fin_vig`, `activo`).
- **Extended Record Tracking** — RT que agrega payload-hash, versión de esquema y metadatos de pipeline para auditoría forense/regulatoria (CNBV, Banxico).

**Árbol de decisión — ¿qué subtipo usar?**

```
¿Múltiples registros activos por BK al mismo tiempo?
├── SÍ → ¿Se necesita historial?
│        ├── SÍ → Multi-Active (s_ma_)
│        └── NO → Non-Historized (s_nh_)
└── NO → ¿Atributos calculados/derivados?
         ├── SÍ → Computed (s_cs_) — va en CURATED
         └── NO → ¿Solo rastrea presencia/ausencia en la fuente?
                  ├── SÍ → Record Tracking (s_rt_)
                  └── NO → ¿Los atributos son estados/estatus?
                           ├── SÍ → Status Tracking (s_st_)
                           └── NO → SAT estándar (s_)
```

---

*Fuente: Marco de Referencia Data Vault 2.0 — Arquitectura de Datos, Banco Azteca / Grupo Salinas.*
