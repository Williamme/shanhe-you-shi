const DEBUG_PORT = 9333;
const PAGE_URL = "http://localhost:4173/";
const VIEWPORT_WIDTH = Number(process.argv[2] || 1440);
const VIEWPORT_HEIGHT = Number(process.argv[3] || 900);

const targets = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`).then((response) => response.json());
const target = targets.find((item) => item.type === "page");
if (!target) throw new Error("没有可用的 Chrome 调试页面");

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let sequence = 0;
const consoleErrors = [];

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") {
    consoleErrors.push(message.params.exceptionDetails.text);
  }
  if (message.method === "Log.entryAdded" && ["error", "warning"].includes(message.params.entry.level)) {
    consoleErrors.push(message.params.entry.text);
  }
});

function send(method, params = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text);
  }
  return result.result.value;
}

await send("Runtime.enable");
await send("Log.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: VIEWPORT_WIDTH,
  height: VIEWPORT_HEIGHT,
  deviceScaleFactor: 1,
  mobile: VIEWPORT_WIDTH <= 900
});
await send("Page.navigate", { url: PAGE_URL });
await evaluate(`new Promise(resolve => {
  if (document.readyState === "complete") setTimeout(resolve, 1200);
  else window.addEventListener("load", () => setTimeout(resolve, 1200), { once: true });
})`);

const total = await evaluate(`document.querySelectorAll(".timeline-dot").length`);
const pageSnapshot = await evaluate(`({
  url: location.href,
  ready: document.readyState,
  title: document.title,
  text: document.body?.innerText?.slice(0, 500) || "",
  html: document.documentElement?.outerHTML?.slice(0, 800) || ""
})`);
const results = [];

for (let index = 0; index < total; index += 1) {
  await evaluate(`new Promise(resolve => {
    document.querySelector('.timeline-dot[data-index="${index}"]').click();
    setTimeout(resolve, 650);
  })`);
  results.push(
    await evaluate(`({
      index: ${index},
      name: document.querySelector("#dynastyName")?.textContent,
      years: document.querySelector("#dynastyPeriod")?.textContent,
      works: document.querySelector("#workCount")?.textContent,
      cards: document.querySelectorAll(".work-card").length,
      markers: document.querySelectorAll(".place-marker").length,
      mapPaths: document.querySelectorAll(".leaflet-overlay-pane path").length,
      pathsOnScreen: (() => {
        const map = document.querySelector("#dynastyMap")?.getBoundingClientRect();
        if (!map) return 0;
        return [...document.querySelectorAll(".leaflet-overlay-pane path")].filter((path) => {
          const rect = path.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 &&
            rect.right >= map.left && rect.left <= map.right &&
            rect.bottom >= map.top && rect.top <= map.bottom;
        }).length;
      })(),
      loading: document.querySelector("#dynastyLoading")?.hidden === false,
      empty: document.querySelector(".empty-state strong")?.textContent || "",
      fatal: !document.querySelector("#fatalMessage")?.hidden,
      timelineActive: document.querySelector(".timeline-dot.is-active")?.dataset.index
    })`)
  );
}

await evaluate(`new Promise(resolve => {
  document.querySelector('.timeline-dot[data-index="9"]').click();
  setTimeout(() => {
    document.querySelector('.filter-chip[data-level="primary"]').click();
    setTimeout(() => {
      document.querySelector('.timeline-dot[data-index="3"]').click();
      setTimeout(resolve, 650);
    }, 120);
  }, 120);
})`);
const filterFallback = await evaluate(`({
  dynasty: document.querySelector("#dynastyName")?.textContent,
  activeFilter: document.querySelector(".filter-chip.is-active")?.dataset.level,
  works: document.querySelector("#workCount")?.textContent,
  cards: document.querySelectorAll(".work-card").length,
  mapPathsOnScreen: [...document.querySelectorAll(".leaflet-overlay-pane path")].filter((path) => {
    const map = document.querySelector("#dynastyMap")?.getBoundingClientRect();
    const rect = path.getBoundingClientRect();
    return map && rect.width > 0 && rect.height > 0 &&
      rect.right >= map.left && rect.left <= map.right &&
      rect.bottom >= map.top && rect.top <= map.bottom;
  }).length
})`);

const screenshot = await send("Page.captureScreenshot", { format: "png" });
const fs = await import("node:fs");
fs.writeFileSync("browser-audit.png", Buffer.from(screenshot.data, "base64"));

console.log(JSON.stringify({ total, pageSnapshot, results, filterFallback, consoleErrors }, null, 2));
socket.close();
