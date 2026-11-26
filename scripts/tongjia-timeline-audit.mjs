const DEBUG_PORT = 9333;
const PAGE_URL = process.argv[2] || "http://localhost:4173/";

const targets = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`).then((response) => response.json());
const target = targets.find((item) => item.type === "page");
if (!target) throw new Error("没有可用的 Chrome 调试页面");

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const consoleErrors = [];
let sequence = 0;

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
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function wait(milliseconds) {
  await evaluate(`new Promise((resolve) => setTimeout(resolve, ${milliseconds}))`);
}

async function capture(filename) {
  const screenshot = await send("Page.captureScreenshot", { format: "png" });
  const fs = await import("node:fs");
  fs.writeFileSync(filename, Buffer.from(screenshot.data, "base64"));
}

async function audit(width, height, prefix) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width <= 900
  });
  await send("Page.navigate", { url: PAGE_URL });
  await evaluate(`new Promise((resolve) => {
    if (document.readyState === "complete") setTimeout(resolve, 900);
    else window.addEventListener("load", () => setTimeout(resolve, 900), { once: true });
  })`);

  const timeline = await evaluate(`(() => {
    const rail = document.querySelector(".timeline-rail").getBoundingClientRect();
    const dots = [...document.querySelectorAll(".timeline-dot")];
    const first = dots[0].getBoundingClientRect();
    const last = dots.at(-1).getBoundingClientRect();
    const inset = window.innerWidth <= 900 ? 0 : 0.035;
    const expectedLeft = rail.left + rail.width * inset;
    const expectedRight = rail.right - rail.width * inset;
    return {
      dots: dots.length,
      firstDelta: Math.abs(first.left - expectedLeft),
      lastDelta: Math.abs(last.right - expectedRight),
      firstLeft: first.left,
      expectedLeft,
      lastRight: last.right,
      expectedRight
    };
  })()`);
  await evaluate(`document.querySelector('.timeline-dot[data-index="2"]')?.click()`);
  await wait(500);
  const timelineClick = await evaluate(`({
    active: document.querySelector(".timeline-dot.is-active")?.dataset.index,
    slider: document.querySelector("#dynastyRange")?.value,
    name: document.querySelector("#dynastyName")?.textContent
  })`);
  await capture(`${prefix}-timeline.png`);

  await evaluate(`(() => {
    const card = [...document.querySelectorAll(".work-card")].find((item) => item.textContent.includes("论语"));
    card?.querySelector("[data-open-work]")?.click();
  })()`);
  await wait(320);
  const annotation = await evaluate(`({
    work: document.querySelector("#workModalTitle")?.textContent,
    marks: document.querySelectorAll(".tongjia-mark").length,
    badge: document.querySelector("#workTongjiaCount")?.textContent,
    originalHasMarkup: Boolean(document.querySelector("#workModalOriginal .tongjia-mark"))
  })`);
  await evaluate(`document.querySelector(".tongjia-mark")?.click()`);
  await wait(180);
  const popover = await evaluate(`({
    visible: !document.querySelector("#tongjiaPopover")?.hidden,
    source: document.querySelector("#tongjiaSource")?.textContent,
    target: document.querySelector("#tongjiaTarget")?.textContent,
    meaning: document.querySelector("#tongjiaMeaning")?.textContent,
    sentence: document.querySelector("#tongjiaSentence")?.textContent,
    translation: document.querySelector("#tongjiaTranslation")?.textContent,
    rect: (() => {
      const rect = document.querySelector("#tongjiaPopover")?.getBoundingClientRect();
      return rect ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom } : null;
    })()
  })`);
  await capture(`${prefix}-tongjia.png`);

  return { timeline, timelineClick, annotation, popover };
}

await send("Runtime.enable");
await send("Log.enable");
await send("Page.enable");

const desktop = await audit(1440, 900, "tongjia-audit-desktop");
const mobile = await audit(390, 844, "tongjia-audit-mobile");

console.log(JSON.stringify({ desktop, mobile, consoleErrors }, null, 2));
socket.close();
