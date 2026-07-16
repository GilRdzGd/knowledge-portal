# Capa Raw

La capa **Raw** toma el dato del Staging y realiza dos operaciones acotadas: **aplanar** la estructura y **agregar metadata de auditoría**. **No aplica reglas de negocio.**

| Propiedad | Valor |
| --- | --- |
| Propósito | Aplanamiento del dato + auditoría |
| Contiene | Dato aplanado (desanidado) con columnas de control |
| Transforma | Solo aplana; sin reglas de negocio |
| Consumidor | La capa Raw Vault |

## Qué hace exactamente

- **Aplanamiento:** desanida estructuras complejas (JSON, anidados) a un formato tabular plano y consultable.
- **Auditoría:** agrega columnas de control como fecha de carga, origen del dato y fecha de proceso.

> **Regla clave:** en Raw **no** se interpretan ni corrigen datos. Solo aplanamiento y auditoría. Cualquier regla de negocio pertenece a Business Vault o Crystal.

## Diferencia con Raw Vault

No confundir esta capa con el **Raw Vault**:

- **Raw** = dato aplanado + auditoría (aún parecido a la fuente).
- **Raw Vault** = dato ya modelado en Hubs, Links y Satellites (integrado e historizado).

## Distinción On-Premise / Nube

El aplanamiento y la auditoría son conceptuales; su implementación difiere entre Cloudera y AWS.

> **Pendiente de detalle:** las columnas de auditoría específicas y el proceso de aplanamiento por objeto se documentarán en una fase posterior.
