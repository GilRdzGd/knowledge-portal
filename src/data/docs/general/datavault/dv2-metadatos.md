# Metadatos obligatorios

Toda tabla del Raw Vault DEBE contener los siguientes metadatos en cada registro. Su ausencia invalida la tabla como componente DV2 conforme.

| Campo | Propósito | Ejemplo |
| --- | --- | --- |
| `loaddate` (LDTS) | Marca de tiempo de ingesta (fecha de proceso de la cosecha). | `20241115023000` |
| `recordsource` (RSRC) | Fuente lógica de origen. Trazabilidad y auditoría. | `CORE_BANCARIO.CREDITO` |
| `systemsource` | Sistema físico de origen (host/plataforma). | `ALNOVA` |
| `fifecha` | Fecha funcional de la cosecha (partición lógica). | `20241115` |
| `{entidad}hashkey` | Hash Key calculada desde la Business Key. | `a3f8d1…` (SHA-512) |
| `hashdiff` (HDIFF) | Hash de atributos descriptivos en Satellites. Detecta cambios. | `9b2c4e…` (SHA-512) |

> **`loaddate` (semántica).** Representa **cuándo el vault detectó el dato, no cuándo ocurrió en el negocio.** En reprocesos se conserva la fecha del look original, nunca la de re-ejecución. Las fechas de negocio van como atributos dentro del Satellite.

Además, las entidades críticas deben incluir **campos de auditoría** (`pipeline_id`, `usuario_carga`, `version_esquema`) según el nivel de trazabilidad requerido.

## Cálculo del Hash Key

Reglas de normalización **obligatorias** (idénticas en cualquier entorno):

- Convertir la Business Key a **minúsculas** antes de hashear.
- Si la BK es compuesta, concatenar con **guión medio (`-`)** como separador fijo.
- Usar **SHA-512** como único algoritmo en todos los pipelines.
- Quitar espacios solo al inicio y fin (no intermedios).
- Todo valor `NULL` se representa como la cadena literal **`__null__`**.
- Centralizar la lógica en una **UDF/función compartida** — nunca ad-hoc por pipeline.

**Implementación**

:::onprem
Cálculo en **PySpark** (Spark sobre Cloudera), centralizado en una UDF compartida.

```python
import hashlib

def calc_hk(business_key: str) -> str:
    if business_key is None:
        business_key = "__null__"
    normalized = business_key.strip().lower()
    return hashlib.sha512(normalized.encode("utf-8")).hexdigest()

def calc_hk_composite(*keys, separator="-"):
    parts = [(k.strip().lower() if k is not None else "__null__") for k in keys]
    return hashlib.sha512(separator.join(parts).encode("utf-8")).hexdigest()
```
:::

:::cloud
Mismo algoritmo (SHA-512) y mismas reglas de normalización, ejecutado en **Spark sobre Glue / EMR**. Alternativamente, la función `sha2(col, 512)` de Spark SQL puede aplicarse en tablas Iceberg.

```python
from pyspark.sql.functions import lower, trim, sha2, coalesce, lit, concat_ws

df = df.withColumn(
    "clientehashkey",
    sha2(lower(trim(coalesce(col("id_cliente"), lit("__null__")))), 512)
)
```

> Propuesta preliminar; se confirmará al definir la arquitectura AWS. El resultado del hash debe ser idéntico al de On-Premise para garantizar continuidad.
:::

## Detección de cambios (Hash Diff)

El `hashdiff` en Satellites evita inserciones duplicadas cuando los datos de la fuente se repiten sin cambios.

- SHA-512 de la concatenación **ordenada alfabéticamente** de todos los atributos descriptivos del Satellite.
- Antes de insertar, comparar contra el `hashdiff` del registro más reciente para esa HK.
- Insertar SOLO si el `hashdiff` difiere (hubo cambio) o no existe registro previo.
- Cualquier cambio en el orden de campos rompe la comparación histórica.

```python
def calc_hash_diff(attributes: dict) -> str:
    ordered = [str(attributes[k]) for k in sorted(attributes.keys())]
    concat = "-".join(ordered)
    return hashlib.sha512(concat.encode("utf-8")).hexdigest()
```

---

*Fuente: Marco de Referencia Data Vault 2.0 — Arquitectura de Datos, Banco Azteca / Grupo Salinas.*
