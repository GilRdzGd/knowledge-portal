# Capa Semántica

La capa **Semántica** traduce el modelo a **lenguaje de negocio**. Es la capa de consumo donde el negocio encuentra métricas y definiciones consistentes, sin necesidad de conocer la estructura física subyacente.

| Propiedad | Valor |
| --- | --- |
| Propósito | Expresar el dato en lenguaje de negocio |
| Contiene | Métricas certificadas, definiciones comunes, vistas y agregaciones |
| Transforma | Sí (agrega y renombra a términos de negocio) |
| Consumidor | Áreas de negocio, reportería, autoservicio |

## Qué aporta

- **Un lenguaje único:** una misma métrica significa lo mismo para todas las áreas.
- **Métricas certificadas:** definiciones acordadas y confiables.
- **Abstracción:** el negocio consulta conceptos, no tablas técnicas.

> Objetivo de fondo: asegurar **consistencia semántica** para que el negocio pueda confiar plenamente en el dato.

## Distinción On-Premise / Nube

La capa semántica es conceptual; las herramientas que la implementan (vistas, capas semánticas de BI) difieren entre Cloudera y AWS.

> **Pendiente de detalle:** las métricas y definiciones específicas se documentarán en una fase posterior.
