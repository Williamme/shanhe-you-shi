import fs from "node:fs";

const [url = "http://localhost:4173/", widthText = "1440", heightText = "900", output = "assets/readme-desktop.png"] =
  process.argv.slice(2);
const width = Number(widthText);
const height = Number(heightText);

const targets = await fetch("http://127.0.0.1:9333/json/list").then((response) => response.json());
const target = targets.find((item) => item.type === "page");
if (!target) throw new Error("没有可用的 Chrome 调试页面");

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let sequence = 0;

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
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
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: width <= 900
});
await send("Page.navigate", { url });
await evaluate(`new Promise((resolve) => {
  if (document.readyState === "complete") setTimeout(resolve, 1800);
  else window.addEventListener("load", () => setTimeout(resolve, 1800), { once: true });
})`);

const screenshot = await send("Page.captureScreenshot", {
  format: "png",
  captureBeyondViewport: false
});
fs.writeFileSync(output, Buffer.from(screenshot.data, "base64"));
console.log(`${output}: ${width}x${height}`);
socket.close();
