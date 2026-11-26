const DEBUG_PORT = 9333;
const PAGE_URL = process.argv[2] || "http://localhost:4176/";
const width = Number(process.argv[3] || 1440);
const height = Number(process.argv[4] || 900);

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
  if (message.method === "Runtime.exceptionThrown") consoleErrors.push(message.params.exceptionDetails.text);
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

await send("Runtime.enable");
await send("Log.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: width <= 900
});
await send("Page.navigate", { url: PAGE_URL });
await evaluate(`new Promise((resolve) => {
  if (document.readyState === "complete") setTimeout(resolve, 1000);
  else window.addEventListener("load", () => setTimeout(resolve, 1000), { once: true });
})`);

const initial = await evaluate(`({
  dynasty: document.querySelector("#dynastyName")?.textContent,
  snapshot: document.querySelector("#snapshotYearLabel")?.textContent,
  snapshotOptions: document.querySelectorAll(".snapshot-option").length,
  phaseDots: document.querySelectorAll(".timeline-phase").length,
  periodBands: document.querySelectorAll(".timeline-dot").length,
  mapPaths: document.querySelectorAll(".leaflet-overlay-pane path").length,
  polityLabels: document.querySelectorAll(".polity-map-label").length,
  fatal: !document.querySelector("#fatalMessage")?.hidden
})`);

await evaluate(`document.querySelector('[data-snapshot-id="ming-1636"]')?.click()`);
await wait(900);
const ming1636 = await evaluate(`({
  dynasty: document.querySelector("#dynastyName")?.textContent,
  snapshot: document.querySelector("#snapshotYearLabel")?.textContent,
  slider: document.querySelector("#dynastyRange")?.value,
  mapPaths: document.querySelectorAll(".leaflet-overlay-pane path").length,
  snapshotOptions: document.querySelectorAll(".snapshot-option").length
})`);

await evaluate(`(() => {
  document.querySelector('.timeline-dot[data-index="9"]')?.click();
})()`);
await wait(500);
await evaluate(`(() => {
  const option = [...document.querySelectorAll(".snapshot-option")].find((item) => item.textContent.includes("755"));
  option?.click();
})()`);
await wait(900);
const tang755 = await evaluate(`({
  dynasty: document.querySelector("#dynastyName")?.textContent,
  snapshot: document.querySelector("#snapshotYearLabel")?.textContent,
  slider: document.querySelector("#dynastyRange")?.value,
  activePhase: document.querySelector(".timeline-phase.is-active")?.getAttribute("title"),
  mapPaths: document.querySelectorAll(".leaflet-overlay-pane path").length,
  regimes: [...document.querySelectorAll("#mapRegimeKey span")].map((item) => item.textContent)
})`);

await evaluate(`document.querySelector("#timelineZoomIn")?.click()`);
await wait(180);
await evaluate(`document.querySelector("#timelineZoomIn")?.click()`);
await wait(300);
const zoomedTimeline = await evaluate(`(() => {
  const track = document.querySelector(".timeline-phase-dots").getBoundingClientRect();
  const start = Number(document.querySelector("#dynastyRange").min);
  const end = Number(document.querySelector("#dynastyRange").max);
  const phases = [...document.querySelectorAll(".timeline-phase")];
  return {
    start,
    end,
    span: end - start,
    rangeStartLabel: document.querySelector("#timelineStartLabel")?.textContent,
    rangeEndLabel: document.querySelector("#timelineEndLabel")?.textContent,
    phaseErrors: phases.map((phase) => {
      const rect = phase.getBoundingClientRect();
      const expected = track.left + ((Number(phase.dataset.year) - start) / (end - start)) * track.width;
      return Math.abs(rect.left + rect.width / 2 - expected);
    }),
    resetDisabled: document.querySelector("#timelineZoomReset")?.disabled
  };
})()`);
if (width > 900) {
  const zoomScreenshot = await send("Page.captureScreenshot", { format: "png" });
  const fs = await import("node:fs");
  fs.writeFileSync("atlas-audit-zoom.png", Buffer.from(zoomScreenshot.data, "base64"));
}
await evaluate(`document.querySelector("#timelineZoomReset")?.click()`);
await wait(220);

await evaluate(`(() => {
  const input = document.querySelector("#dynastyRange");
  input.value = "1000";
  input.dispatchEvent(new Event("input", { bubbles: true }));
})()`);
await wait(1000);
const sliderSelection = await evaluate(`({
  dynasty: document.querySelector("#dynastyName")?.textContent,
  snapshot: document.querySelector("#snapshotYearLabel")?.textContent,
  slider: document.querySelector("#dynastyRange")?.value,
  works: document.querySelector("#workCount")?.textContent
})`);

await evaluate(`document.querySelector("#mapLayerButton")?.click()`);
await wait(100);
const layerPanel = await evaluate(`({
  visible: !document.querySelector("#mapLayerPanel")?.hidden,
  controls: document.querySelectorAll("[data-map-layer]").length
})`);
await evaluate(`document.querySelector('[data-map-layer="territory"]')?.click()`);
await wait(250);
const territoryOff = await evaluate(`({
  checked: document.querySelector('[data-map-layer="territory"]')?.checked,
  visiblePaths: [...document.querySelectorAll(".leaflet-overlay-pane path")].filter((path) => path.getBoundingClientRect().width > 0).length
})`);
await evaluate(`document.querySelector('[data-map-layer="territory"]')?.click()`);
await wait(250);
const territoryOn = await evaluate(`({
  checked: document.querySelector('[data-map-layer="territory"]')?.checked,
  visiblePaths: [...document.querySelectorAll(".leaflet-overlay-pane path")].filter((path) => path.getBoundingClientRect().width > 0).length
})`);
await evaluate(`document.querySelector('[data-map-layer="provinces"]')?.click()`);
await wait(700);
const provincesOn = await evaluate(`({
  checked: document.querySelector('[data-map-layer="provinces"]')?.checked,
  visiblePaths: [...document.querySelectorAll(".leaflet-overlay-pane path")].filter((path) => path.getBoundingClientRect().width > 0).length
})`);

const snapshotAudit = [];
if (width > 900) {
  await evaluate(`document.querySelector('[data-map-layer="provinces"]')?.click()`);
  const snapshotIds = await evaluate(
    `[...document.querySelectorAll(".timeline-phase")].map((item) => item.dataset.snapshotId)`
  );
  for (const snapshotId of snapshotIds) {
    await evaluate(
      `document.querySelector('[data-snapshot-id="${snapshotId}"]')?.click()`
    );
    await wait(180);
    snapshotAudit.push(
      await evaluate(`({
        id: ${JSON.stringify(snapshotId)},
        dynasty: document.querySelector("#dynastyName")?.textContent,
        snapshot: document.querySelector("#snapshotYearLabel")?.textContent,
        paths: [...document.querySelectorAll(".leaflet-overlay-pane path")].filter((path) => path.getBoundingClientRect().width > 0).length
      })`)
    );
  }
}

const screenshot = await send("Page.captureScreenshot", { format: "png" });
const fs = await import("node:fs");
fs.writeFileSync(width <= 900 ? "atlas-audit-mobile.png" : "atlas-audit-desktop.png", Buffer.from(screenshot.data, "base64"));

console.log(
  JSON.stringify(
    {
      initial,
      ming1636,
      tang755,
      zoomedTimeline,
      sliderSelection,
      layerPanel,
      territoryOff,
      territoryOn,
      provincesOn,
      snapshotAudit,
      consoleErrors
    },
    null,
    2
  )
);
socket.close();
