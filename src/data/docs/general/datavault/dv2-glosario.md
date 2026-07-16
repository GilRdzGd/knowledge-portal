# Glosario

Términos específicos de Data Vault 2.0.

| Término | Sigla | Definición |
| --- | --- | --- |
| Business Key | BK | Clave natural de negocio que identifica unívocamente a una entidad en su sistema de origen. |
| Hash Key | HK | Valor hash (SHA-512) de la Business Key. Llave primaria surrogada del vault. |
| Load Date | LDTS | Marca de tiempo de ingesta (fecha de proceso de la cosecha). |
| Record Source | RSRC | Identificador lógico del sistema fuente del registro. |
| System Source | — | Sistema físico de origen (host/plataforma). |
| Fecha funcional | `fifecha` | Fecha funcional de la cosecha; partición lógica de la carga. |
| Hash Diff | HDIFF | Hash de los atributos descriptivos de un Satellite. Detecta cambios. |
| Subsequence | — | Discriminador de PK para MAS/NHS cuando hay múltiples registros por hashkey+loaddate. |
| Hub | `h_` | Tabla que almacena Business Keys únicas de una entidad de negocio. |
| Link | `l_` | Tabla que modela relaciones entre dos o más Hubs. |
| Satellite | `s_` | Tabla que almacena atributos descriptivos históricos de un Hub o Link. |
| Multi-Active Satellite | MAS / `s_ma_` | Satellite con múltiples valores activos simultáneos del mismo atributo, con historial. |
| Non-Historized Satellite | NHS / `s_nh_` | Satellite append-only / upsert, sin historial. |
| Status Tracking Satellite | ST / `s_st_` | Satellite que registra únicamente cambios de estado/estatus. |
| Record Tracking Satellite | RT/RTS / `s_rt_` | Satellite que rastrea presencia/ausencia de un registro en la fuente por cosecha. |
| Computed Satellite | CS / `s_cs_` | Satellite derivado de reglas de negocio. Vive en CURATED. |
| Point-In-Time | PIT / `pit_` | Tabla de soporte que consolida los `loaddate` de Satellites para consultas temporales. |
| Bridge Table | `br_` | Tabla que precomputa joins entre Links y Hubs en redes complejas. |
| Insert-Only | — | Patrón de escritura donde solo se hacen INSERTs; nunca UPDATEs ni DELETEs. |
| Cosecha | — | Proceso periódico de ingesta de datos desde sistemas fuente al vault. |
| Golden Record | MDM | Registro maestro consolidado de una entidad, resultado de la canonización de identidad. |
| Raw Vault | RAW | Capa que almacena datos en su forma más pura, sin reglas de negocio. |
| Business Vault | CURATED | Capa donde se aplican reglas de negocio ligeras y se construyen entidades de soporte. |
| Information Mart | CRYSTAL | Capa de consumo orientada al usuario final con modelos dimensionales y mallas BI. |

---

*Fuente: Marco de Referencia Data Vault 2.0 — Arquitectura de Datos, Banco Azteca / Grupo Salinas.*
