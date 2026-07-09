import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSchemaManifest } from "./schema-manifest.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

// Cada archivo src/data/model-schema*.json es una vista del modelo. El build
// descubre los archivos y genera el manifiesto (model-schemas.json) que el
// modeler consume para poblar el selector de vistas.
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
