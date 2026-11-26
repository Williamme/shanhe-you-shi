const http = require("node:http");
const { dataFile, handleVisitorRequest } = require("./visitor-store.cjs");

const port = Number(process.env.VISITOR_PORT || 4174);

const server = http.createServer((request, response) => {
  const requestPath = (request.url || "/").split("?")[0];
  if (requestPath === "/api/visitor" || requestPath === "/visitor") {
    handleVisitorRequest(request, response);
    return;
  }
  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Not Found");
});

server.listen(port, "127.0.0.1", () => {
  console.log(`访客统计服务已启动：127.0.0.1:${port}`);
  console.log(`数据文件：${dataFile}`);
});
