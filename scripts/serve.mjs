import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const port = Number(process.env.PORT || 4173);
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

createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://localhost:${port}`);
  const cleanPath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const candidate = path.join(root, cleanPath || "index.html");
  const file = candidate.startsWith(root) && existsSync(candidate) ? candidate : path.join(root, "index.html");

  try {
    const info = await stat(file);
    response.writeHead(200, {
      "content-type": types.get(path.extname(file)) || "application/octet-stream",
      "content-length": info.size
    });
    createReadStream(file).pipe(response);
  } catch (error) {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end(error.message);
  }
}).listen(port, () => {
  console.log(`Knowledge Portal: http://localhost:${port}`);
});
