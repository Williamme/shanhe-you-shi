const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { handleVisitorRequest } = require("./visitor-store.cjs");

const root = __dirname;
const port = Number(process.env.PORT || 4173);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".geojson": "application/geo+json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

const server = http.createServer((request, response) => {
  const requestPath = decodeURIComponent((request.url || "/").split("?")[0]);
  if (requestPath === "/api/visitor") {
    handleVisitorRequest(request, response);
    return;
  }
  const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const target = path.resolve(root, relativePath);

  if (relativePath.split(/[\\/]+/).some((part) => part.startsWith("."))) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not Found");
    return;
  }

  if (!target.startsWith(`${root}${path.sep}`) && target !== root) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  fs.stat(target, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not Found");
      return;
    }

    const type = contentTypes[path.extname(target).toLowerCase()] || "application/octet-stream";
    response.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff"
    });
    fs.createReadStream(target).pipe(response);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`山河有诗已启动：http://localhost:${port}`);
  console.log("按 Ctrl+C 停止服务。");
});
