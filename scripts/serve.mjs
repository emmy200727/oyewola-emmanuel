import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGzip } from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4173);
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const requested = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const file = path.resolve(root, requested);

  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const contentType = types[path.extname(file).toLowerCase()] || "application/octet-stream";
  const canCompress = /^(?:text\/|application\/(?:javascript|json|manifest\+json|xml))/.test(contentType);
  const acceptsGzip = request.headers["accept-encoding"]?.includes("gzip");
  const headers = { "Content-Type": contentType, "Cache-Control": "no-cache" };
  if (canCompress && acceptsGzip) headers["Content-Encoding"] = "gzip";
  response.writeHead(200, headers);

  const stream = createReadStream(file);
  if (canCompress && acceptsGzip) stream.pipe(createGzip()).pipe(response);
  else stream.pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`Portfolio preview running at http://127.0.0.1:${port}`);
});
