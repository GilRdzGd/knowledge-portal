# Arquitectura de capas

El ecosistema DV2 se organiza en capas con responsabilidades claramente delimitadas. Internamente seguimos la nomenclatura **RAW / CURATED / CRYSTAL**.

```
┌─────────────────────────────────────────────────────────┐
│ CRYSTAL  │ Information Mart — Consumo / BI                 │
├──────────┼────────────────────────────────────────────────┤
│ CURATED  │ Business Vault — PIT, Bridge, Computed, MDM     │
├──────────┼────────────────────────────────────────────────┤
│ RAW      │ Raw Vault — Hubs, Links, Satellites            │
├──────────┼────────────────────────────────────────────────┤
│ STG      │ Staging — Landing temporal, trunca             │
└─────────────────────────────────────────────────────────┘
```

| Capa | Nombre interno | Responsabilidad |
| --- | --- | --- |
| Staging | STG / Landing | Aterrizaje temporal de datos crudos desde fuentes. Sin transformación, sin hash. Trunca en cada carga. |
| Raw Vault | RAW | Hubs, Links y Satellites en forma pura. Insert-Only. Metadatos de carga obligatorios. Sin reglas de negocio. |
| Business Vault | CURATED | PIT Tables, Bridge Tables, Computed Satellites, MDM / Golden Record. Reglas de negocio ligeras. |
| Information Mart | CRYSTAL | Modelos dimensionales, mallas BI, vistas de consumo. Orientado al usuario final. |

> **Regla de oro:** NUNCA escribas lógica de negocio (cálculos, derivaciones, correcciones) en la capa RAW. Si un campo requiere interpretación, pertenece a CURATED o CRYSTAL.

## Relación con las capas de la plataforma

En el recorrido general de la plataforma existen además las capas de **Fuentes**, **Ingesta** y una capa **Raw** de aplanamiento previa al Raw Vault. Esta sección se concentra en las capas propias de Data Vault (RAW / CURATED / CRYSTAL).

## Cómo se implementa físicamente

La arquitectura lógica es la misma en On-Premise y en la nube; cambia la tecnología que materializa cada capa.

:::onprem
- **Cómputo SQL:** Hive / Impala.
- **Cargas:** Spark (PySpark).
- **Almacenamiento:** HDFS, formato **Parquet**.
- **Orquestación:** notebooks + agenda batch (cosechas).
:::

:::cloud
- **Cómputo SQL:** Athena / Redshift.
- **Cargas:** Spark en Glue / EMR.
- **Almacenamiento:** Amazon **S3**, formato **Parquet** (tablas externas / Iceberg).
- **Orquestación:** servicios administrados (Step Functions / MWAA).

> Propuesta preliminar; se confirmará al definir la arquitectura AWS.
:::

---

*Fuente: Marco de Referencia Data Vault 2.0 — Arquitectura de Datos, Banco Azteca / Grupo Salinas.*
