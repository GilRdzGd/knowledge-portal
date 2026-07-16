# Checklist de validación

Antes de llevar un modelo o pipeline Data Vault a producción, verifica estos puntos.

## Diseño del modelo

- Los Hubs contienen únicamente Business Key + metadatos (`loaddate`, `recordsource`, `systemsource`, `fifecha`, hashkey).
- Los Links referencian al menos 2 Hubs y no contienen atributos descriptivos (salvo business keys dependientes).
- Los Satellites tienen `({padre}hashkey, loaddate)` como PK compuesta.
- Existe `hashdiff` en todos los Satellites con más de 2 atributos descriptivos (donde aplica el subtipo).
- La nomenclatura sigue los estándares definidos y está parametrizada por unidad de negocio.

## Implementación del pipeline

- El `loaddate` se genera una sola vez por cosecha y es consistente en toda la ejecución.
- El cálculo de Hash Keys usa SHA-512 y las mismas reglas de normalización en todas las etapas.
- El orden de carga respeta STG → Hubs → Links → SATs de Hub → SATs de Link → Business Vault.
- No existe ningún `UPDATE` ni `DELETE` sobre tablas del Raw Vault.
- `recordsource` y `systemsource` están poblados y son descriptivos.
- Existe lógica de detección de cambios (`hashdiff`) antes de insertar en Satellites.

## Calidad y auditoría

- Existe una tabla de control / `audit_log` que registra cada ejecución.
- El pipeline maneja y registra errores sin silenciarlos.
- No existen registros huérfanos (Satellites sin Hub, Links sin Hubs referenciados).
- El pipeline fue probado con reprocess y produce el mismo resultado (idempotencia).
- El diseño fue revisado por al menos un arquitecto antes de ir a producción.

---

*Fuente: Marco de Referencia Data Vault 2.0 — Arquitectura de Datos, Banco Azteca / Grupo Salinas.*
