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

async function auditViewport(width, height, prefix) {
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

  const authorModule = await evaluate(`(() => {
    document.querySelector('[data-module="author"]').click();
    return {
      count: document.querySelector("#authorCount")?.textContent,
      removedPlayback: !document.querySelector("#playbackBar") && !document.querySelector("#playJourney"),
      archiveMilestones: document.querySelectorAll(".author-milestones li").length,
      archiveWorks: document.querySelectorAll("[data-author-archive-work]").length,
      routePurposes: [...document.querySelectorAll(".route-purpose")].slice(0, 3).map((item) => item.textContent),
      context: document.querySelector("#authorContext")?.textContent?.trim(),
      bioLength: document.querySelector("#authorBio")?.textContent?.trim().length
    };
  })()`);
  await wait(450);
  await capture(`${prefix}-author.png`);

  await evaluate(`document.querySelector('[data-module="era"]').click()`);
  await wait(650);
  const initial = await evaluate(`(() => {
    const scroll = document.querySelector("#eraTimelineScroll");
    return {
      activeTab: document.querySelector(".module-tab.is-active")?.dataset.module,
      blocks: document.querySelectorAll(".era-regime").length,
      events: document.querySelectorAll(".era-event-pin").length,
      authors: document.querySelectorAll(".era-author-pin").length,
      noLocalSearch: !document.querySelector("#eraSearch"),
      summary: document.querySelector("#eraDynastyCount")?.textContent,
      canvasHeight: document.querySelector("#eraTimelineCanvas")?.getBoundingClientRect().height,
      scrollWidth: scroll?.scrollWidth,
      clientWidth: scroll?.clientWidth,
      fatal: !document.querySelector("#fatalMessage")?.hidden
    };
  })()`);
  await evaluate(`document.querySelector('[data-era-year="618"]')?.click()`);
  await wait(500);
  await capture(`${prefix}-era.png`);

  await evaluate(`(() => {
    const input = document.querySelector("#globalSearch");
    input.value = "安史之乱";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  await wait(180);
  const searchResults = await evaluate(`({
    count: document.querySelectorAll(".search-result").length,
    eventResults: document.querySelectorAll('.search-result-icon.event').length,
    labels: [...document.querySelectorAll(".search-result-copy strong")].slice(0, 5).map((item) => item.textContent)
  })`);
  await evaluate(`document.querySelector('.search-result-icon.event')?.closest(".search-result")?.click()`);
  await wait(240);
  const eventModal = await evaluate(`({
    visible: !document.querySelector("#eventModal")?.hidden,
    title: document.querySelector("#eventModalTitle")?.textContent,
    cause: document.querySelector("#eventModalCause")?.textContent?.trim(),
    process: document.querySelector("#eventModalProcess")?.textContent?.trim(),
    result: document.querySelector("#eventModalResult")?.textContent?.trim(),
    significance: document.querySelector("#eventModalSignificance")?.textContent?.trim(),
    evaluation: document.querySelector("#eventModalEvaluation")?.textContent?.trim()
  })`);
  await capture(`${prefix}-event-modal.png`);
  await evaluate(`document.querySelector('#eventModal [data-close-modal="event"]')?.click()`);
  await wait(170);

  await evaluate(`(() => {
    const back = [...document.querySelectorAll(".era-regime")].find((block) => block.textContent.includes("唐朝"));
    back?.querySelector("[data-era-open-regime]")?.click();
  })()`);
  await wait(260);
  const regimeDetail = await evaluate(`({
    open: document.querySelector("#eraDetail")?.classList.contains("is-open"),
    title: document.querySelector("#eraDetailTitle")?.textContent,
    events: document.querySelectorAll(".era-detail-events li").length,
    eventButtons: document.querySelectorAll("[data-era-event-id]").length,
    authors: document.querySelectorAll(".era-detail-author").length,
    authorNames: [...document.querySelectorAll(".era-detail-author strong")].slice(0, 8).map((item) => item.textContent),
    poems: document.querySelectorAll(".era-detail-poem").length
  })`);

  await evaluate(`document.querySelector("[data-era-event-id]")?.click()`);
  await wait(220);
  const eventFromRegime = await evaluate(`({
    visible: !document.querySelector("#eventModal")?.hidden,
    title: document.querySelector("#eventModalTitle")?.textContent
  })`);
  await evaluate(`document.querySelector('#eventModal [data-close-modal="event"]')?.click()`);
  await wait(160);
  await evaluate(`document.querySelector("#eraDetailClose")?.click()`);
  await wait(220);

  await evaluate(`(() => {
    document.querySelector('[data-module="dynasty"]').click();
    document.querySelector("#chronicleButton")?.click();
  })()`);
  await wait(320);
  const chronicle = await evaluate(`({
    visible: !document.querySelector("#chronicleModal")?.hidden,
    count: document.querySelectorAll(".chronicle-item").length,
    expandButtons: document.querySelectorAll("[data-open-event]").length
  })`);
  await evaluate(`document.querySelector("[data-open-event]")?.click()`);
  await wait(220);
  const nestedEvent = await evaluate(`({
    visible: !document.querySelector("#eventModal")?.hidden,
    chronicleStillVisible: !document.querySelector("#chronicleModal")?.hidden,
    title: document.querySelector("#eventModalTitle")?.textContent
  })`);
  await evaluate(`document.querySelector('#eventModal [data-close-modal="event"]')?.click()`);
  await wait(170);
  const returnedToChronicle = await evaluate(`({
    eventHidden: document.querySelector("#eventModal")?.hidden,
    chronicleVisible: !document.querySelector("#chronicleModal")?.hidden
  })`);
  await evaluate(`document.querySelector('#chronicleModal [data-close-modal="chronicle"]')?.click()`);
  await evaluate(`(() => {
    const input = document.querySelector("#globalSearch");
    input.value = "唐朝";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    document.querySelector('.search-result-icon.regime')?.closest(".search-result")?.click();
  })()`);
  await wait(320);
  const regimeSearchLink = await evaluate(`({
    activeTab: document.querySelector(".module-tab.is-active")?.dataset.module,
    detailTitle: document.querySelector("#eraDetailTitle")?.textContent
  })`);
  await evaluate(`document.querySelector("#eraDetailClose")?.click()`);
  await evaluate(`(() => {
    const input = document.querySelector("#globalSearch");
    input.value = "李斯";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    document.querySelector('.search-result-icon.author')?.closest(".search-result")?.click();
  })()`);
  await wait(350);
  const authorSearchLink = await evaluate(`({
    activeTab: document.querySelector(".module-tab.is-active")?.dataset.module,
    author: document.querySelector("#authorName")?.textContent,
    archiveWorks: document.querySelectorAll("[data-author-archive-work]").length
  })`);
  await evaluate(`document.querySelector("#aboutButton")?.click()`);
  await wait(450);
  const visitorDisplay = await evaluate(`({
    aboutVisible: !document.querySelector("#aboutModal")?.hidden,
    count: document.querySelector("#visitorCount")?.textContent,
    unavailable: document.querySelector("#visitorCount")?.classList.contains("is-unavailable")
  })`);
  await capture(`${prefix}-about.png`);

  return {
    authorModule,
    initial,
    searchResults,
    eventModal,
    regimeDetail,
    eventFromRegime,
    chronicle,
    nestedEvent,
    returnedToChronicle,
    regimeSearchLink,
    authorSearchLink,
    visitorDisplay
  };
}

await send("Runtime.enable");
await send("Log.enable");
await send("Page.enable");

const desktop = await auditViewport(1440, 900, "content-audit-desktop");
const mobile = await auditViewport(390, 844, "content-audit-mobile");

console.log(JSON.stringify({ desktop, mobile, consoleErrors }, null, 2));
socket.close();
