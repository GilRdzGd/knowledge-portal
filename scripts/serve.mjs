import { createReadStream, existsSync } from "node:fs";
import { stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSchemaManifest } from "./schema-manifest.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.join(projectRoot, "dist");
const srcData = path.join(projectRoot, "src", "data");
const distData = path.join(root, "assets", "data");
const port = Number(process.env.PORT || 4173);

// Solo se permiten nombres de archivo de esquema/vista, sin rutas, para evitar
// escrituras fuera de src/data (path traversal).
const DATA_FILE_PATTERN = /^model-(schema|views)(\.[a-z0-9_]+)?\.json$/;

const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"]
]);

function sendFile(response, file) {
  return stat(file).then((info) => {
    response.writeHead(200, {
      "content-type": types.get(path.extname(file)) || "application/octet-stream",
      "content-length": info.size,
      "cache-control": "no-store"
    });
    createReadStream(file).pipe(response);
  });
}

async function writeDataFile(name, data) {
  const json = `${JSON.stringify(data, null, 2)}\n`;
  await writeFile(path.join(srcData, name), json);
  await writeFile(path.join(distData, name), json);
}

async function handleSaveView(request, response) {
  try {
    const chunks = [];
    for await (const chunk of request) {
      chunks.push(chunk);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    const written = [];

    if (DATA_FILE_PATTERN.test(body.schemaFile || "") && Array.isArray(body.schema)) {
      await writeDataFile(body.schemaFile, body.schema);
      written.push(body.schemaFile);
    }
    if (DATA_FILE_PATTERN.test(body.viewsFile || "") && body.views && typeof body.views === "object") {
      await writeDataFile(body.viewsFile, body.views);
      written.push(body.viewsFile);
    }

    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ ok: true, written }));
  } catch (error) {
    response.writeHead(400, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ ok: false, error: error.message }));
  }
}

// En local, los datos (assets/data/*) se sirven EN VIVO desde src/data, y el
// manifiesto se genera al vuelo. Asi, editar o agregar model-schema*.json y
// recargar basta para ver la vista, sin correr `npm run build`.
async function handleDataRequest(response, relative) {
  if (relative === "model-schemas.json") {
    const manifest = await buildSchemaManifest(srcData);
    response.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    });
    response.end(`${JSON.stringify(manifest, null, 2)}\n`);
    return true;
  }
  const srcCandidate = path.join(srcData, relative);
  if (srcCandidate.startsWith(srcData) && existsSync(srcCandidate)) {
    await sendFile(response, srcCandidate);
    return true;
  }
  return false;
}

createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://localhost:${port}`);

  if (request.method === "POST" && url.pathname === "/save-view") {
    await handleSaveView(request, response);
    return;
  }

  try {
    // Datos en vivo desde src/data (esquemas, vistas y manifiesto dinamico).
    if (request.method === "GET" && url.pathname.startsWith("/assets/data/")) {
      const relative = decodeURIComponent(url.pathname.slice("/assets/data/".length));
      if (await handleDataRequest(response, relative)) {
        return;
      }
    }

    const cleanPath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    const candidate = path.join(root, cleanPath || "index.html");
    const file = candidate.startsWith(root) && existsSync(candidate) ? candidate : path.join(root, "index.html");
    await sendFile(response, file);
  } catch (error) {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end(error.message);
  }
}).listen(port, () => {
  console.log(`Knowledge Portal: http://localhost:${port}`);
});
