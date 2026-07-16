# Metodología de carga

> El orden y los patrones de carga siguen la metodología ágil del equipo: entidades independientes se cargan en paralelo, respetando únicamente la dependencia padre-hijo.

## Orden de carga obligatorio

```
STG → Hubs → Links → SATs de Hub → SATs de Link → Business Vault (PIT/Bridge)
```

| Paso | Entidad | Condición |
| --- | --- | --- |
| 1 | Staging (STG) | Carga completa desde fuente. Trunca en cada ejecución. |
| 2 | Hubs | Antes que cualquier Link o Satellite. Garantiza la BK. |
| 3 | Links | Después de Hubs. Todos los Hubs referenciados deben existir. |
| 4 | Satellites de Hub | Después de su Hub. |
| 5 | Satellites de Link | Después de su Link. |
| 6 | PIT / Bridge | Al final, tras un Raw Vault completo y consistente. |

**Carga paralela permitida:** Hubs de distintos dominios entre sí; Links entre sí; Satellites de distintos padres entre sí. La única restricción es la dependencia padre-hijo.

## Patrón Insert-Only

- **NUNCA** ejecutar `UPDATE` sobre una tabla del Raw Vault.
- **NUNCA** ejecutar `DELETE` sobre una tabla del Raw Vault.
- Si un dato llegó incorrecto de la fuente, se inserta tal cual.
- La corrección se modela en un Computed Satellite en CURATED; el registro original permanece intacto.

## Manejo de cosechas (batch)

- El `loaddate` es la fecha-hora de **inicio de la cosecha**, no la de proceso individual de cada registro.
- Usar una variable de cosecha centralizada en el orquestador.
- Registrar la cosecha en una tabla de control (`audit_log`): inicio, fin, registros, estado.
- En reprocess, el `loaddate` debe ser el original de la cosecha.
- El pipeline debe ser **idempotente**.

## Patrones de carga por tipo de objeto

:::onprem
Ejemplos en SQL para Hive / Impala (variables `${COSECHA}` y `${FIFECHA}` inyectadas por el orquestador).

**Hub — insertar solo BKs nuevas**

```sql
INSERT INTO raw.h_baz_credito_cliente
SELECT
  stg.clientehashkey, stg.id_cliente,
  ${COSECHA} AS loaddate, 'CORE_BANCARIO' AS recordsource,
  'ALNOVA' AS systemsource, ${FIFECHA} AS fifecha
FROM staging.stg_baz_credito_cliente stg
LEFT JOIN raw.h_baz_credito_cliente hub
  ON stg.clientehashkey = hub.clientehashkey
WHERE hub.clientehashkey IS NULL;   -- solo BKs nunca vistas
```

**Satellite (SAT estándar) — insertar solo si cambió el hashdiff**

```sql
WITH ultimo_estado AS (
  SELECT clientehashkey, hashdiff
  FROM raw.s_h_baz_credito_cliente_datos_pers s
  WHERE loaddate = (
    SELECT MAX(s2.loaddate) FROM raw.s_h_baz_credito_cliente_datos_pers s2
    WHERE s2.clientehashkey = s.clientehashkey
  )
)
INSERT INTO raw.s_h_baz_credito_cliente_datos_pers
SELECT
  stg.clientehashkey, ${COSECHA} AS loaddate, stg.hashdiff,
  'CORE_BANCARIO' AS recordsource, 'ALNOVA' AS systemsource, ${FIFECHA} AS fifecha,
  stg.nombre_cliente, stg.apellido_pat, stg.fecha_nac
FROM staging.stg_baz_credito_cliente stg
LEFT JOIN ultimo_estado ue ON stg.clientehashkey = ue.clientehashkey
WHERE ue.clientehashkey IS NULL       -- registro nuevo
   OR stg.hashdiff != ue.hashdiff;    -- hubo cambio
```
:::

:::cloud
La lógica es idéntica (insert-only + comparación de hashdiff), ejecutada con Spark sobre Glue / EMR y tablas Iceberg en S3. El `INSERT` puede expresarse como `MERGE INTO` de Iceberg para el control de duplicados, manteniendo el patrón append para el historial.

> Propuesta preliminar; se confirmará al definir la arquitectura AWS.
:::

**Variantes por subtipo:** MAS inserta/borra el set completo por `hashkey+fecha`; NHS hace MERGE/UPSERT (sin historial); ST inserta si cambió el estatus; CS inserta si cambió el valor calculado; RT inserta en cada cosecha indicando presencia (1) o ausencia (0).

---

*Fuente: Marco de Referencia Data Vault 2.0 — Arquitectura de Datos, Banco Azteca / Grupo Salinas.*
