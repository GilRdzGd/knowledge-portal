# Raw Vault — Visión general

El **Raw Vault** es la parte del curado donde el dato se **integra e historiza** usando Data Vault 2.0, en su forma más pura: **Hubs, Links y Satellites**. Aquí **no se aplican reglas de negocio**.

| Propiedad | Valor |
| --- | --- |
| Contiene | Hubs (`h_`), Links (`l_`), Satellites (`s_…`) |
| Patrón de escritura | Insert-Only |
| Reglas de negocio | No |
| Consumidor | Business Vault y Crystal |

> **Regla de oro:** nunca escribas lógica de negocio en el Raw Vault. Si un campo requiere interpretación, pertenece a Business Vault o Crystal.

## Qué encontrarás en este grupo

- **Entidades del modelo** — Hub, Link, Satellite y subtipos (con definiciones y ejemplos On-Premise / Cloud).
- **Metadatos obligatorios** — hash key, hash diff y auditoría.
- **Metodología de carga** — orden de carga, insert-only, cosechas y patrones SQL.
- **Estándares de nomenclatura** — cómo se nombran los objetos.
