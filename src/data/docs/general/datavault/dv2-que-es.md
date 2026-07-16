# Qué es Data Vault 2.0

Data Vault 2.0 (DV2) es una metodología de modelado orientada a la construcción de Data Warehouses empresariales **altamente escalables, auditables y resistentes al cambio**. Fue diseñada por Dan Linstedt y extendida en su segunda versión para incorporar principios ágiles, integración con Big Data y soporte para plataformas cloud.

> **Filosofía central.** Todo cambio en el negocio debe poder absorberse en el modelo sin rediseños. El Data Vault almacena todo lo que llega de las fuentes, **sin filtrar, sin transformar la verdad del negocio** —incluso cuando los datos parecen incorrectos—. La corrección ocurre en capas superiores.

## Principios fundamentales

| # | Principio | Descripción |
| --- | --- | --- |
| 1 | Insert-Only | Nunca se actualiza ni elimina un registro existente; cada cambio genera un nuevo registro. |
| 2 | Trazabilidad completa | Cada registro lleva metadatos de quién lo cargó, cuándo y desde qué fuente. |
| 3 | Separación de preocupaciones | Estructura (Hubs), relaciones (Links) y contexto (Satellites) viven en tablas distintas. |
| 4 | Carga paralela | Las entidades del vault son independientes entre sí y pueden cargarse en paralelo. |
| 5 | Escalabilidad | El modelo crece añadiendo entidades sin romper lo existente. |
| 6 | Sin transformaciones en RAW | La limpieza y reglas de negocio pertenecen a capas superiores, nunca al Raw Vault. |

## Por qué lo usamos

- **Absorbe el cambio**: nuevas fuentes o atributos se agregan sin rediseñar lo existente.
- **Auditoría total**: cada dato es trazable hasta su origen y su momento de carga.
- **Historia completa**: nada se sobrescribe; el vault es el registro histórico oficial.
- **Cargas paralelas**: acelera el procesamiento en entornos de alto volumen.

## Índice de esta sección

Esta documentación reproduce el marco de referencia unificado de Data Vault 2.0:

1. Qué es Data Vault 2.0 *(esta página)*
2. Arquitectura de capas
3. Entidades del modelo
4. Entidades del Business Vault
5. Metadatos obligatorios
6. Metodología de carga
7. Estándares de nomenclatura
8. Anti-patrones
9. Checklist de validación
10. Glosario

---

*Fuente: Marco de Referencia Data Vault 2.0 — Arquitectura de Datos, Banco Azteca / Grupo Salinas.*
