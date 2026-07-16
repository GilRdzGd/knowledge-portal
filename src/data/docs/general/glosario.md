# Glosario y nomenclaturas

Vocabulario común de la plataforma. El objetivo es que todos los perfiles usen los mismos términos con el mismo significado.

> Para las convenciones de nombres de tablas y columnas, consulta también la sección **Nomenclaturas** del portal.

## Conceptos de arquitectura

| Término | Definición |
| --- | --- |
| **Capa** | Etapa del flujo de datos con un propósito y calidad definidos. |
| **Multi-hop** | Diseño en el que el dato pasa por varias capas ganando calidad. |
| **Medallion** | Patrón de capas bronce/plata/oro por nivel de calidad. |
| **Lineage (linaje)** | Trazabilidad del dato: de dónde viene y cómo se transformó. |
| **Semántica** | Capa que expresa el dato en lenguaje de negocio. |

## Conceptos de Data Vault

| Término | Definición |
| --- | --- |
| **Hub** | Entidad de negocio única identificada por su llave de negocio. |
| **Link** | Relación entre dos o más Hubs. |
| **Satellite** | Atributos descriptivos e historia de un Hub o Link. |
| **Hash key** | Llave técnica derivada (hash) de la llave de negocio. |
| **Hash diff** | Hash de atributos usado para detectar cambios. |
| **Load date** | Fecha en que el dato entró a la plataforma. |
| **Record source** | Origen funcional del registro. |
| **PIT** | *Point-In-Time*: tabla que facilita ver el estado en un momento dado. |
| **Bridge** | Tabla que simplifica y acelera relaciones múltiples. |
| **Raw Vault** | Data Vault sin reglas de negocio (integración historizada). |
| **Business Vault** | Data Vault con reglas de negocio aplicadas. |

## Conceptos de procesamiento

| Término | Definición |
| --- | --- |
| **Batch** | Procesamiento por lotes en intervalos. |
| **Streaming** | Procesamiento continuo de eventos. |
| **Delta / incremental** | Cargar solo los datos nuevos desde la última ejecución. |
| **Checkpoint** | Marca del último dato procesado para cargas incrementales. |
| **Aplanamiento** | Desanidar estructuras complejas a un formato tabular. |
| **Auditoría** | Metadata de control (fecha de carga, origen, proceso). |

## Modelo dimensional

| Término | Definición |
| --- | --- |
| **Dimensión** | Tabla de contexto (cliente, tiempo, producto). |
| **Hecho (fact)** | Tabla de métricas asociadas a eventos. |
| **Esquema estrella** | Modelo con hechos al centro y dimensiones alrededor. |
| **Grano** | Nivel de detalle de una tabla de hechos. |

## Distinción On-Premise / Nube

| Término | Definición |
| --- | --- |
| **On-Premise** | Infraestructura propia; hoy sobre Cloudera. |
| **Nube** | Servicios administrados; a futuro sobre AWS. |

> Los términos técnicos específicos de cada tecnología (servicios, motores, herramientas) se agregarán a este glosario cuando documentemos cada plataforma.

---

### Cómo contribuir al glosario

Este glosario es un archivo Markdown. Para agregar o corregir un término, edita `docs/general/glosario.md` y vuelve a construir el portal.
