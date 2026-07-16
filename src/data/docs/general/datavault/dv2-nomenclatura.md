# Estándares de nomenclatura

> **Generalizado a cualquier unidad de negocio.** Sustituye `{unidadNegocio}` por la línea correspondiente: `remesas`, `cripto`, `divisas`, `ahorro`, `credito`, … Los ejemplos usan `credito` solo como referencia.

## Estructura general del nombre

```
{clasificacion}_{empresa}_{unidadNegocio}_{entidad}_{descripcion}
```

| Componente | Significado |
| --- | --- |
| `clasificacion` | Tipo de objeto (`h`, `l`, `s_…`, `pit`, `br`, `ref`, `stg`) |
| `empresa` | `baz` (Banco Azteca) |
| `unidadNegocio` | Línea de negocio (`remesas`, `cripto`, `credito`, …) |
| `entidad` | Hub o Link padre (`cliente`, `pedido`, `cuenta`, …) |
| `descripcion` | Aspecto funcional del objeto |

## Catálogo por tipo de objeto

| Tipo | Patrón | Ejemplo (dominio Crédito) | PK | HashDiff |
| --- | --- | --- | --- | --- |
| Hub | `h_baz_{un}_{entidad}` | `h_baz_credito_pedido` | `{entidad}hashkey` | No |
| Link | `l_baz_{un}_{ent1}_{ent2}` | `l_baz_credito_cliente_pedido` | `{ent1}{ent2}lnkhashkey` | No |
| SAT estándar (Hub) | `s_h_baz_{un}_{entidad}_{aspecto}` | `s_h_baz_credito_pedido_alnova_saldo` | hashkey + loaddate | Sí |
| SAT de Link | `s_l_baz_{un}_{relacion}_{aspecto}` | `s_l_baz_credito_cliente_pedido_condiciones` | hashkey + loaddate | Sí |
| Multi-Active (MAS) | `s_ma_h_baz_{un}_{entidad}_{aspecto}` | `s_ma_h_baz_credito_visita_resultado` | hashkey + loaddate + subsequence | No |
| Non-Historized (NHS) | `s_nh_h_baz_{un}_{entidad}_{aspecto}` | `s_nh_h_baz_credito_pedido_movimiento` | hashkey + loaddate + subsequence | No |
| Status Tracking (ST) | `s_st_h_baz_{un}_{entidad}_{aspecto}` | `s_st_h_baz_credito_cliente_congelamiento` | hashkey + loaddate | Sí |
| Computed (CS) | `s_cs_h_baz_{un}_{entidad}_{aspecto}` | `s_cs_h_baz_credito_pedido_tasa_motor_conversion` | hashkey + loaddate | Sí |
| Record Tracking (RT) | `s_rt_h_baz_{un}_{hub}_{descripcion}` | `s_rt_h_baz_credito_pedido_pago_sostenido` | hashkey + loaddate | No |
| Point-In-Time | `pit_baz_{un}_{hub}_{cadencia}` | `pit_baz_credito_pedido_diario` | — | — |
| Bridge | `br_baz_{un}_{relacion}` | `br_baz_credito_cliente_pedido` | — | — |
| Referencia | `ref_baz_{un}_{catalogo}` | `ref_baz_credito_zona` | — | — |
| Staging | `stg_baz_{un}_{objeto}` | `stg_baz_credito_pedido` | — | — |

> **RTS — nombre legacy.** El patrón `rts_h_baz_{un}_{hub}_{descripcion}` equivale a la nomenclatura nueva `s_rt_h_baz_{un}_{hub}_{descripcion}`. Migrar al patrón nuevo.

## Columnas técnicas por subtipo

| Columna | SAT | MAS | NHS | ST | CS | RT |
| --- | --- | --- | --- | --- | --- | --- |
| `{entidad}hashkey` | PK | PK | PK | PK | PK | PK |
| `loaddate` | PK | PK | ✓ | PK | PK | PK |
| `hashdiff` | ✓ | — | — | ✓ | ✓ | — |
| `subsequence` | — | PK | PK | — | — | — |
| `recordsource` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `systemsource` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `fifecha` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## Patrón de carga por subtipo

| Subtipo | Estrategia |
| --- | --- |
| SAT | INSERT si `hashdiff` cambió vs último registro |
| MAS | INSERT/DELETE del set completo por `hashkey + fecha` |
| NHS | MERGE/UPSERT — sobrescribe el registro existente |
| ST | INSERT si el estatus cambió |
| CS | INSERT si el valor calculado cambió |
| RT | INSERT por cada carga indicando presencia (1) o ausencia (0) |

## Convenciones de campos

| Campo | Convención | Ejemplo |
| --- | --- | --- |
| Hash Key principal | `{NOMBRE_ENTIDAD}hashkey` | `clientehashkey`, `cuentahashkey` |
| Hash Key foránea | `{NOMBRE_ENTIDAD}hashkey` | `clientehashkey` (en Link/Satellite) |
| Business Key | `{NOMBRE_CAMPO_NEGOCIO}` | `id_cliente`, `num_cuenta` |
| Load Date | `loaddate` | `loaddate BIGINT` |
| Record Source | `recordsource` o `rsrc` | `recordsource STRING` |
| System Source | `systemsource` | `systemsource STRING` |
| Hash Diff | `hashdiff` | `hashdiff STRING` |
| Fecha funcional | `fifecha` | `fifecha BIGINT` |
| Atributos de negocio | `CAMEL_CASE` | `nombreCliente`, `montoCredito` |

## Diferenciación en metadatos (TBLPROPERTIES)

```
'dv.role' = 'satelite'       -- SAT normal (CDC)
'dv.role' = 'satelite_nhs'   -- Non-Historized
'dv.role' = 'satelite_mas'   -- Multi-Active
'dv.role' = 'satelite_cs'    -- Computed
'dv.role' = 'satelite_st'    -- Status Tracking
'dv.role' = 'satelite_rts'   -- Record Tracking
```

## Resumen de prefijos

| Prefijo | Tipo |
| --- | --- |
| `h_` | Hub |
| `l_` | Link |
| `s_h_` | Satélite estándar de Hub (SAT) |
| `s_l_` | Satélite de Link |
| `s_nh_h_` | Non-Historized |
| `s_ma_h_` | Multi-Active |
| `s_st_h_` | Status Tracking |
| `s_cs_h_` | Computed |
| `s_rt_h_` / `rts_h_` | Record Tracking |
| `pit_` | Point-In-Time |
| `br_` | Bridge |
| `ref_` | Reference |
| `stg_` | Staging |

---

*Fuente: Marco de Referencia Data Vault 2.0 — Arquitectura de Datos, Banco Azteca / Grupo Salinas.*
