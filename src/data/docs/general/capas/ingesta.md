# Capa Ingesta

La **ingesta** trae el dato desde las fuentes hacia la plataforma de forma confiable y repetible. Su único trabajo es **mover el dato**, no interpretarlo.

| Propiedad | Valor |
| --- | --- |
| Propósito | Extraer y aterrizar el dato en la plataforma |
| Contiene | Procesos de extracción (batch o streaming) |
| Transforma | No |
| Consumidor | La capa de Staging |

## Principios

- **No transformar aquí.** La limpieza y las reglas van en capas superiores.
- **Repetible e idempotente:** una re-ejecución no debe duplicar ni corromper datos.
- **Trazable:** cada carga registra su origen y su cosecha para auditoría.

## Modos de ingesta

| Modo | Cuándo | Característica |
| --- | --- | --- |
| **Batch** | Cargas periódicas (diaria/semanal) | Procesa lotes por cosecha |
| **Streaming** | Eventos en tiempo casi real | Procesa registros de forma continua |
| **Incremental (delta)** | Grandes volúmenes | Trae solo lo nuevo desde el último checkpoint |

## Distinción On-Premise / Nube

El concepto es el mismo; cambian las herramientas de extracción y orquestación entre Cloudera y AWS.

> **Pendiente de detalle:** las herramientas, conectores y frecuencias específicas se documentarán en una fase posterior.
