# Arquitectura por capas

La plataforma organiza el dato en **capas**, donde cada una incrementa la calidad, la estructura y el valor de negocio. Este patrón —conocido como arquitectura por capas o *multi-hop*— permite asignar responsabilidades claras y que el negocio confíe en el dato final ([Databricks](https://docs.databricks.com/en/lakehouse-architecture/guiding-principles.html)).

> Idea central: **el dato entra crudo y sale listo para el negocio**, ganando confianza en cada paso.

## Visión general del flujo

```
Fuentes  ->  Ingesta  ->  Staging  ->  Raw  ->  Raw Vault (DV)  ->  Business Vault (DV)  ->  Crystal Dimensional  ->  Semántica  ->  Consumo
```

## Las capas de un vistazo

| Capa | Propósito | Qué contiene |
| --- | --- | --- |
| **Fuentes** | Sistemas de origen | Datos operativos, archivos, APIs |
| **Ingesta** | Traer el dato a la plataforma | Extracción y aterrizaje |
| **Staging (STG)** | Zona de paso técnica | Copia efímera del dato tal como llegó |
| **Raw** | Aplanamiento + auditoría | Dato aplanado con metadata de control |
| **Raw Vault** | Integración historizada | Hubs, Links y Satellites |
| **Business Vault** | Reglas de negocio | PITs, Bridges y satélites calculados |
| **Crystal Dimensional** | Modelo analítico | Dimensiones y hechos (estrella) |
| **Semántica** | Lenguaje de negocio | Métricas, vistas y capa de consumo |

## Relación con el modelo "medallion"

Si conoces el patrón *medallion* (bronce/plata/oro), esta es la correspondencia aproximada. El medallion define tres capas de calidad creciente: bronce (crudo), plata (refinado) y oro (listo para negocio) ([Microsoft Fabric](https://learn.microsoft.com/en-us/fabric/onelake/onelake-medallion-lakehouse-architecture)).

| Medallion | Nuestra plataforma |
| --- | --- |
| Bronce (raw) | Staging + Raw |
| Plata (refinado) | Raw Vault + Business Vault |
| Oro (listo para negocio) | Crystal Dimensional + Semántica |

> La diferencia clave es que nuestra plataforma usa **Data Vault 2.0** para la integración historizada (plata), lo que aporta auditoría, escalabilidad y trazabilidad superiores frente a un refinado tradicional.

## Por qué tantas capas

- **Aislar el cambio**: si una fuente cambia, el impacto se contiene en las primeras capas.
- **Reprocesar sin perder historia**: el Raw Vault permite reconstruir sin volver a las fuentes.
- **Separar "lo que pasó" de "lo que significa"**: el Raw Vault guarda hechos crudos; el Business Vault aplica reglas de negocio.
- **Entregar rápido al negocio**: las capas Crystal y Semántica están optimizadas para consulta.

## Distinción On-Premise / Nube

El **modelo por capas es el mismo** en On-Premise (Cloudera) y en la nube (AWS). Lo que cambia es la tecnología que implementa cada capa (almacenamiento, cómputo, orquestación), y eso se documenta por separado al hablar de cada plataforma.

## Siguiente paso

Profundiza en **Objetos del modelo** para entender Hubs, Links y Satellites, o revisa el **Recorrido por capas** para ver cada capa en detalle.

---

### Referencias

- Databricks / Azure Databricks — arquitectura por capas (multi-hop). *(Parafraseado.)*
- Microsoft Fabric — Medallion Lakehouse Architecture.
