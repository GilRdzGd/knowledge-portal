import { readdir } from "node:fs/promises";

// Convierte un sufijo de archivo (p. ej. "prestamos_oro") a un nombre legible
// en Title Case ("Prestamos Oro").
export function toTitle(text) {
  return text
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// Escanea un directorio de datos buscando model-schema*.json y arma el
// manifiesto de vistas. Cada archivo model-schema.<suffix>.json es una vista;
// su configuracion/posiciones vive por convencion en model-views.<suffix>.json.
export async function buildSchemaManifest(dataDir) {
  const entries = await readdir(dataDir);
  const schemas = [];

  entries
    .filter((name) => /^model-schema(\.[^/]+)?\.json$/.test(name))
    .forEach((name) => {
      if (name === "model-schema.json") {
        schemas.push({ id: "default", name: "Modelo base", file: name, viewsFile: "model-views.json", base: true });
        return;
      }
      const match = /^model-schema\.(.+)\.json$/.exec(name);
      if (!match) {
        return;
      }
      const suffix = match[1];
      const id = suffix.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      schemas.push({ id: id || suffix, name: toTitle(suffix), file: name, viewsFile: `model-views.${suffix}.json` });
    });

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
