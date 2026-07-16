# Anti-patrones

Errores comunes en la implementación de Data Vault y su alternativa correcta.

| Anti-patrón | Alternativa correcta |
| --- | --- |
| Hacer `UPDATE` en tablas del Raw Vault | Insertar un Computed Satellite con el valor corregido en CURATED. |
| Guardar atributos descriptivos en un Hub | Moverlos a un Satellite correspondiente. |
| Calcular la Hash Key de forma inconsistente | Centralizar la lógica en una UDF compartida (SHA-512, lower, `-`, `__null__`). |
| Cargar Satellites antes que su Hub padre | Respetar el orden: Hub → Link → Satellite. |
| Mezclar reglas de negocio en el Raw Vault | Las transformaciones van en Business Vault o CRYSTAL. |
| Tener múltiples Business Keys en un solo Hub | Un Hub = una entidad = una Business Key. Usar Satellites para alias. |
| Omitir `recordsource` / `systemsource` | Imposibilita auditoría y diagnóstico de calidad por fuente. |
| Usar fechas de negocio como `loaddate` | `loaddate` es tiempo de ingesta; las fechas de negocio son atributos del Satellite. |
| Eliminar registros del vault por espacio | El vault es el registro histórico oficial. Gestionar espacio a nivel de infraestructura. |
| Crear Satellites sin `hashdiff` en alta cardinalidad | Sin `hashdiff`, cada cosecha inserta duplicados aunque no haya cambios. |

---

*Fuente: Marco de Referencia Data Vault 2.0 — Arquitectura de Datos, Banco Azteca / Grupo Salinas.*
