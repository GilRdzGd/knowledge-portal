# Recorrido por capas (fuente a semántica)

Esta página recorre cada capa a nivel conceptual: **propósito, qué contiene y quién la consume**. El detalle técnico (tablas, esquemas, consultas) se documentará por capa en fases posteriores.

```
Fuentes -> Ingesta -> Staging -> Raw -> Raw Vault -> Business Vault -> Crystal Dimensional -> Semántica -> Consumo
```

## 1. Fuentes

- **Propósito**: sistemas de origen que producen el dato operativo.
- **Contiene**: bases transaccionales, archivos, APIs, eventos.
- **Consume**: nadie aún; es el punto de partida.

## 2. Ingesta

- **Propósito**: traer el dato desde las fuentes a la plataforma.
- **Contiene**: procesos de extracción y aterrizaje (batch o streaming).
- **Buenas prácticas**: no transformar aquí; solo mover el dato de forma confiable y repetible.

## 3. Staging (STG)

- **Propósito**: zona técnica de paso donde el dato aterriza **tal como llegó**.
- **Contiene**: copias efímeras por ejecución, alineadas a la estructura de la fuente.
- **Nota**: es transitoria; no es fuente de verdad ni guarda historia.

## 4. Raw

- **Propósito**: **aplanar** el dato y agregar **metadata de auditoría**.
- **Contiene**: el dato aplanado (desanidado) más columnas de control como fecha de carga, origen y fecha de proceso.
- **Regla clave**: en Raw **no se aplican reglas de negocio**; solo aplanamiento y auditoría.

## 5. Raw Vault (Data Vault)

- **Propósito**: integrar e historizar el dato sin interpretarlo.
- **Contiene**: **Hubs** (conceptos), **Links** (relaciones) y **Satellites** (atributos e historia).
- **Valor**: trazabilidad total y capacidad de reprocesar sin volver a las fuentes.
- Ver **Objetos del modelo** para el detalle de estos objetos.

## 6. Business Vault (Data Vault)

- **Propósito**: aplicar **reglas de negocio** sobre el Raw Vault.
- **Contiene**:
  - **PIT (Point-In-Time)**: tablas que facilitan consultar el estado de una entidad en un momento dado, evitando *joins* complejos entre satélites.
  - **Bridge**: tablas que simplifican relaciones múltiples y aceleran la navegación entre Hubs y Links.
  - **Satélites calculados**: atributos derivados de reglas de negocio.
- **Valor**: acelera el consumo y centraliza la lógica de negocio.

## 7. Crystal Dimensional

- **Propósito**: exponer el dato en un **modelo dimensional** (esquema estrella) fácil de consultar.
- **Contiene**: **dimensiones** (contexto: cliente, tiempo, producto) y **hechos** (métricas de eventos).
- **Consume**: herramientas de BI y reportería.

## 8. Semántica

- **Propósito**: traducir el modelo a **lenguaje de negocio**.
- **Contiene**: métricas certificadas, definiciones comunes, vistas y agregaciones de consumo.
- **Valor**: que el negocio hable un lenguaje único y consistente ([Azure Databricks](https://learn.microsoft.com/en-us/azure/databricks/lakehouse-architecture/guiding-principles)).

## Resumen de responsabilidades

| Capa | ¿Transforma? | ¿Guarda historia? | Consumidor típico |
| --- | --- | --- | --- |
| Fuentes | — | — | — |
| Ingesta | No | No | Plataforma |
| Staging | No | No (efímera) | Procesos internos |
| Raw | Solo aplana + audita | Según diseño | Raw Vault |
| Raw Vault | No (integra) | Sí (completa) | Business Vault |
| Business Vault | Sí (reglas) | Sí | Crystal / Semántica |
| Crystal | Sí (modela) | Sí | BI / Analistas |
| Semántica | Sí (agrega) | Según diseño | Negocio |

## Distinción On-Premise / Nube

El recorrido es idéntico en Cloudera y en AWS. Las tecnologías que implementan cada capa cambian y se documentan por separado.

> **Pendiente por capa**: en las próximas fases documentaremos cada capa con sus esquemas, tablas y ejemplos reales, corroborados contra el entorno.

---

### Referencias

- Estuary — Data lake architecture (flujo fuente → ingesta → raw → curado). *(Parafraseado.)*
- Azure Databricks — consistencia semántica y dato como producto.
