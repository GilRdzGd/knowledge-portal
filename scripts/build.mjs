import { cp, mkdir, readdir, writeFile } from "node:fs/promises";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

// Cada archivo src/data/model-schema*.json es una vista del modelo. Este build
// descubre los archivos y genera un manifiesto (model-schemas.json) que el
// modeler consume para poblar el selector de vistas. Para agregar una vista
// nueva basta con soltar un archivo model-schema.<algo>.json y reconstruir.
function toTitle(text) {
  return text
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function buildSchemaManifest(dataDir) {
  const entries = await readdir(dataDir);
  const schemas = [];

  entries
    .filter((name) => /^model-schema(\.[^/]+)?\.json$/.test(name))
    .forEach((name) => {
      if (name === "model-schema.json") {
        // Archivo de configuracion/posiciones por convencion: model-views.json.
        schemas.push({ id: "default", name: "Modelo base", file: name, viewsFile: "model-views.json", base: true });
        return;
      }
      const match = /^model-schema\.(.+)\.json$/.exec(name);
      if (!match) {
        return;
      }
      const suffix = match[1];
      const id = suffix.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      // Cada vista tiene su archivo de posiciones separado: model-views.<suffix>.json.
      schemas.push({ id: id || suffix, name: toTitle(suffix), file: name, viewsFile: `model-views.${suffix}.json` });
    });

  schemas.sort((a, b) => {
    if (a.base) return -1;
    if (b.base) return 1;
    return a.name.localeCompare(b.name);
  });

  const manifest = {
    defaultId: schemas.find((entry) => entry.base)?.id || schemas[0]?.id || "default",
    schemas: schemas.map(({ base, ...entry }) => entry),
  };
  return manifest;
}

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, "assets/js"), { recursive: true });
await mkdir(path.join(dist, "assets/css"), { recursive: true });

await cp(path.join(root, "src/index.html"), path.join(dist, "index.html"));
await cp(path.join(root, "src/main.js"), path.join(dist, "assets/js/main.js"));
await cp(path.join(root, "src/components"), path.join(dist, "assets/js/components"), { recursive: true });
await cp(path.join(root, "src/pages"), path.join(dist, "assets/js/pages"), { recursive: true });
await cp(path.join(root, "src/styles"), path.join(dist, "assets/css"), { recursive: true });
await cp(path.join(root, "src/data"), path.join(dist, "assets/data"), { recursive: true });
await cp(path.join(root, "public/assets"), path.join(dist, "assets"), { recursive: true });

const manifest = await buildSchemaManifest(path.join(root, "src/data"));
await writeFile(
  path.join(dist, "assets/data/model-schemas.json"),
  `${JSON.stringify(manifest, null, 2)}\n`
);

console.log(`Build generado en ${dist}`);
console.log(`Vistas de modelo detectadas: ${manifest.schemas.map((entry) => entry.file).join(", ")}`);
