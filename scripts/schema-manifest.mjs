import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

async function readConfiguredViewName(dataDir, viewsFile) {
  try {
    const raw = JSON.parse(await readFile(path.join(dataDir, viewsFile), "utf8"));
    const name = typeof raw?.name === "string" ? raw.name.trim() : "";
    if (!name) {
      throw new Error(`El archivo ${viewsFile} debe definir la llave name.`);
    }
    return name;
  } catch (_) {
    throw new Error(`No se pudo leer el nombre de la vista desde ${viewsFile}.`);
  }
}

// Escanea un directorio de datos buscando model-schema*.json y arma el
// manifiesto de vistas. Cada archivo model-schema.<suffix>.json es una vista;
// su configuracion/posiciones vive por convencion en model-views.<suffix>.json.
export async function buildSchemaManifest(dataDir) {
  const entries = await readdir(dataDir);
  const schemas = [];

  const schemaFiles = entries.filter((name) => /^model-schema(\.[^/]+)?\.json$/.test(name));
  for (const name of schemaFiles) {
    if (name === "model-schema.json") {
      schemas.push({ id: "default", name: await readConfiguredViewName(dataDir, "model-views.json"), file: name, viewsFile: "model-views.json", base: true });
      continue;
    }
    const match = /^model-schema\.(.+)\.json$/.exec(name);
    if (!match) {
      continue;
    }
    const suffix = match[1];
    const id = suffix.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const viewsFile = `model-views.${suffix}.json`;
    schemas.push({ id: id || suffix, name: await readConfiguredViewName(dataDir, viewsFile), file: name, viewsFile });
  }

  schemas.sort((a, b) => {
    if (a.base) return -1;
    if (b.base) return 1;
    return a.name.localeCompare(b.name);
  });

  return {
    defaultId: schemas.find((entry) => entry.base)?.id || schemas[0]?.id || "default",
    schemas: schemas.map(({ base, ...entry }) => entry),
  };
}
