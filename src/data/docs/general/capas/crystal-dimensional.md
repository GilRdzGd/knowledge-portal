# Capa Crystal Dimensional

La capa **Crystal** (Information Mart) expone el dato curado en un **modelo dimensional** (esquema estrella), optimizado para consulta analítica y BI.

| Propiedad | Valor |
| --- | --- |
| Propósito | Exponer el dato en un modelo fácil de consultar |
| Contiene | Dimensiones y hechos (esquema estrella) |
| Transforma | Sí (modela para consumo) |
| Consumidor | Herramientas de BI y analistas |

## Componentes

- **Dimensiones:** tablas de contexto (cliente, tiempo, producto, zona). Responden al *quién, qué, cuándo, dónde*.
- **Hechos (facts):** tablas de métricas asociadas a eventos (montos, conteos, saldos). Responden al *cuánto*.
- **Esquema estrella:** los hechos al centro, rodeados de dimensiones.
- **Grano:** el nivel de detalle de cada tabla de hechos (una fila por transacción, por día, etc.).

> Crystal se alimenta del **Business Vault**, aprovechando PIT y Bridge para simplificar los joins temporales y de relaciones.

## Distinción On-Premise / Nube

El modelado dimensional es agnóstico; cambian el motor de consulta y el almacenamiento entre Cloudera y AWS.

> **Pendiente de detalle:** las dimensiones y hechos concretos del entorno se documentarán en una fase posterior.
