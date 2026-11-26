const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const dataFile = path.resolve(
  process.env.VISITOR_DATA_FILE || path.join(__dirname, ".runtime", "visitors.json")
);

function loadState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    return {
      createdAt: parsed.createdAt || new Date().toISOString(),
      visitorHashes: new Set(Array.isArray(parsed.visitorHashes) ? parsed.visitorHashes : [])
    };
  } catch {
    return {
      createdAt: new Date().toISOString(),
      visitorHashes: new Set()
    };
  }
}

const state = loadState();

function saveState() {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  const temporaryFile = `${dataFile}.${process.pid}.tmp`;
  fs.writeFileSync(
    temporaryFile,
    `${JSON.stringify(
      {
        createdAt: state.createdAt,
        updatedAt: new Date().toISOString(),
        count: state.visitorHashes.size,
        visitorHashes: [...state.visitorHashes]
      },
      null,
      2
    )}\n`,
    { encoding: "utf8", mode: 0o600 }
  );
  fs.renameSync(temporaryFile, dataFile);
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
    "X-Content-Type-Options": "nosniff"
  });
  response.end(body);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > 2048) {
        reject(new Error("Request body too large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function hashVisitorId(visitorId) {
  return crypto.createHash("sha256").update(`shanhe-you-shi:${visitorId}`).digest("hex");
}

async function handleVisitorRequest(request, response) {
  if (request.method === "GET") {
    sendJson(response, 200, { count: state.visitorHashes.size });
    return;
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "GET, POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const payload = JSON.parse((await readBody(request)) || "{}");
    const visitorId = String(payload.visitorId || "");
    if (!/^[a-zA-Z0-9_-]{8,128}$/.test(visitorId)) {
      sendJson(response, 400, { error: "Invalid visitor id" });
      return;
    }

    const hash = hashVisitorId(visitorId);
    const isNewVisitor = !state.visitorHashes.has(hash);
    if (isNewVisitor) {
      state.visitorHashes.add(hash);
      saveState();
    }
    sendJson(response, 200, { count: state.visitorHashes.size, isNewVisitor });
  } catch {
    sendJson(response, 400, { error: "Invalid request" });
  }
}

module.exports = {
  dataFile,
  handleVisitorRequest
};
