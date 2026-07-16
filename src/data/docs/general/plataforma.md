# Qué es la Plataforma de Datos

La Plataforma de Datos es el ecosistema donde la organización **ingiere, integra, historiza, transforma y expone** la información para analítica, reportería y modelos. Su objetivo es entregar datos **confiables, trazables y listos para el negocio**, sin importar de qué sistema fuente provengan.

> En una frase: convertir datos crudos y dispersos en información gobernada y reutilizable.

## Para qué sirve

- **Una sola verdad**: integrar fuentes heterogéneas en un modelo consistente.
- **Historia completa**: conservar cómo cambian los datos en el tiempo (auditoría e historización).
- **Trazabilidad (linaje)**: saber de dónde viene cada dato y cómo se transformó.
- **Autoservicio confiable**: que analistas y áreas de negocio consuman datos sin depender de los sistemas operativos.

## Principios que seguimos

Estos principios son transversales a toda la plataforma y guían cada decisión de diseño:

1. **La calidad mejora capa por capa.** El dato crudo entra sin alterarse y va ganando estructura, limpieza y contexto de negocio conforme avanza. Este enfoque por capas (o *multi-hop*) es una práctica recomendada de las arquitecturas lakehouse modernas ([Databricks](https://docs.databricks.com/en/lakehouse-architecture/guiding-principles.html)).
2. **El dato se trata como un producto**, con definición, esquema y ciclo de vida claros ([Azure Databricks](https://learn.microsoft.com/en-us/azure/databricks/lakehouse-architecture/guiding-principles)).
3. **Auditabilidad e historización primero.** Nunca perdemos el origen ni la versión histórica del dato.
4. **Separación de responsabilidades por capa.** Cada capa tiene un dueño y un propósito acotado.

## Dos mundos: On-Premise y Nube

La plataforma vive hoy en **On-Premise** y evolucionará hacia **la nube**. Los conceptos de esta sección aplican a ambos; las diferencias técnicas concretas se documentan en las guías de cada tecnología.

| Aspecto | On-Premise (hoy) | Nube (a futuro) |
| --- | --- | --- |
| Plataforma | Cloudera | AWS |
| Enfoque | Clúster propio, almacenamiento distribuido | Servicios administrados y almacenamiento de objetos |
| Detalle técnico | Ver guías de Ingeniería / Arquitectura | Se documentará al abordar tecnologías específicas |

> **Importante:** los nombres de servicios y herramientas específicos (motores de cómputo, almacenamiento, orquestación) se tratan más adelante, cuando hablemos de cada tecnología. Aquí nos quedamos en los conceptos que no cambian entre On-Premise y nube.

## Cómo está organizada esta documentación

- **General** (esta sección): conceptos y arquitectura para toda la organización.
- **Arquitectura de Datos**: documentación operativa (linaje, motor de notebooks, uso de Kiro).
- **Ingeniería de Datos**: cómo desarrollar y operar las cargas.
- **Gobierno de Datos**: calidad, catálogo, políticas y datos sensibles.

## Siguiente paso

Continúa con **Arquitectura por capas** para entender el recorrido del dato desde la fuente hasta el consumo.

---

### Referencias

- Databricks — Guiding principles for the lakehouse. *(Contenido parafraseado para cumplir con restricciones de licenciamiento.)*
- Microsoft Learn — Guiding principles, Azure Databricks lakehouse.
