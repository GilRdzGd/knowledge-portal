# Capa Fuentes

Las **fuentes** son los sistemas de origen que producen el dato operativo que alimenta la plataforma. Es el punto de partida del flujo.

| Propiedad | Valor |
| --- | --- |
| Propósito | Producir el dato operativo original |
| Contiene | Bases transaccionales, archivos, APIs, eventos |
| Transforma | No |
| Consumidor | La capa de Ingesta |

## Qué caracteriza a una fuente

- Es **dueña del dato operativo**; la plataforma no la modifica.
- Puede ser interna (core bancario, CRM) o externa (proveedores, reguladores).
- Cada fuente tiene un **origen lógico** (`recordsource`) y un **sistema físico** (`systemsource`) que se propagan como metadatos a lo largo del vault para trazabilidad.

> **Buena práctica:** la plataforma nunca debe escribir de vuelta en la fuente ni depender de su disponibilidad para consultas analíticas.

## Distinción On-Premise / Nube

El concepto de fuente es el mismo en Cloudera y AWS; cambian los conectores y mecanismos de extracción.

> **Pendiente de detalle:** el inventario de fuentes específicas y sus características se documentará en una fase posterior.
