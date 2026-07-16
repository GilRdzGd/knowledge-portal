# Entidades del Business Vault (CURATED)

El Business Vault (capa **CURATED**) aplica **reglas de negocio ligeras** sobre el Raw Vault y construye entidades de soporte que aceleran el consumo. No reemplaza al Raw Vault: coexiste en una capa superior.

## Point-In-Time (PIT)

Las PIT precomputan los puntos de corte temporales de múltiples Satellites asociados a un Hub, permitiendo consultar el estado completo de una entidad en cualquier fecha **sin múltiples self-joins**.

```
pit_baz_{unidadNegocio}_{hub}_{cadencia}
├── {hub}hashkey
├── snapshot_date            ← fecha de corte de la consulta
├── loaddate_s_datos_pers    ← loaddate vigente en esa fecha para ese Satellite
├── loaddate_s_contacto
└── loaddate_s_scoring
```

> **Cuándo construirla:** cuando existan 2 o más Satellites sobre un mismo Hub y se requieran joins temporales frecuentes en CRYSTAL.

## Bridge Table

Las Bridge Tables precomputan joins complejos entre múltiples Links y Hubs, facilitando el acceso a redes de relaciones sin joins encadenados en tiempo real. Útiles en **jerarquías** y **relaciones muchos-a-muchos**.

```
br_baz_{unidadNegocio}_{relacion}
```

## Computed / Derived Satellite

Satellites con atributos **calculados o derivados** a partir de reglas de negocio aplicadas sobre el Raw Vault. Su fuente es el propio vault, no los sistemas de origen. Es el mecanismo principal para **MDM / Golden Record** y correcciones sobre datos del RAW.

> **Un Computed Satellite nunca reemplaza ni modifica registros del Raw Vault: coexiste en una capa superior.**

## Cuándo usar cada objeto

| Necesidad | Objeto |
| --- | --- |
| Ver el estado de una entidad en una fecha, con varios satélites | **PIT** |
| Navegar relaciones múltiples o jerarquías sin joins en cadena | **Bridge** |
| Exponer un valor derivado o corregido por reglas de negocio | **Computed Satellite** |
| Consolidar una identidad única (Golden Record) | **MDM / Computed Satellite** |

---

*Fuente: Marco de Referencia Data Vault 2.0 — Arquitectura de Datos, Banco Azteca / Grupo Salinas.*
