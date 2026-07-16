# Capa Staging (STG)

El **Staging** es una zona técnica de paso donde el dato aterriza **tal como llegó** de la fuente. Es transitoria: **trunca en cada carga** y no guarda historia.

| Propiedad | Valor |
| --- | --- |
| Propósito | Aterrizaje temporal del dato crudo |
| Contiene | Copias efímeras por ejecución, alineadas a la fuente |
| Transforma | No (sin reglas, sin hash) |
| Historia | No (se trunca en cada carga) |
| Consumidor | La capa Raw |

## Características

- **Sin transformación ni hash:** el dato se copia sin alterarse.
- **Trunca en cada ejecución:** no es fuente de verdad ni registro histórico.
- **Alineado a la estructura de la fuente:** una tabla de staging por objeto de origen.

## Nomenclatura

El patrón de nombres es `stg_baz_{unidadNegocio}_{objeto}`. En el entorno actual los esquemas de staging siguen el prefijo `stg_baz_…` (por ejemplo `stg_baz_bancadigital`, `stg_baz_cajas`).

## Distinción On-Premise / Nube

El rol del staging es el mismo en Cloudera y AWS; cambia el almacenamiento físico donde aterriza.

> **Pendiente de detalle:** en la fase de capas consultaremos las tablas reales de staging en el entorno para documentar objetos y estructuras concretas.
