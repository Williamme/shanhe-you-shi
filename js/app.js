import { createEraTimeline } from "./era-timeline.js";
import { buildContentUnion } from "./content-union.js";

const DATA_URL = "./data.json";
const AUTHOR_LINKS_STORAGE = "shanhe-author-links-v1";
const VISITOR_ID_STORAGE = "shanhe-visitor-id-v1";
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const state = {
  data: null,
  module: "dynasty",
  dynastyIndex: 0,
  currentDynasty: null,
  currentSnapshot: null,
  atlasData: null,
  atlasSnapshots: [],
  timelineViewStart: null,
  timelineViewEnd: null,
  level: "all",
  worksById: new Map(),
  geojsonCache: new Map(),
  placeMarkers: new Map(),
  workMarkerIndex: new Map(),
  currentAuthor: null,
  authorLinks: {},
  authorLinkUnmatched: [],
  currentStopIndex: 0,
  lastStopIndex: 0,
  travelFrame: null,
  travelToken: 0,
  searchItems: [],
  searchIndex: -1,
  activeWork: null,
  activeModal: null,
  maps: { dynasty: null, author: null },
  mapLayers: {
    territory: true,
    poems: true,
    labels: true,
    terrain: true,
    provinces: false
  },
  layers: {
    dynastyGeo: null,
    dynastyMarkers: null,
    chineseLabels: null,
    polityLabels: null,
    modernProvinces: null,
    authorRouteShadow: null,
    authorRouteProgress: null,
    authorMarkers: null
  },
  authorMarkers: [],
  authorMapRendered: false,
  tileWarningShown: false,
  eraData: null,
  eraTimeline: null,
  eventDetails: null,
  historyEvents: [],
  historyEventsById: new Map(),
  activeEvent: null,
  returnModal: null,
  visitorId: null,
  visitorCountLoaded: false,
  tongjiaEntriesById: new Map(),
  tongjiaByWork: new Map(),
  tongjiaAnchor: null
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const dom = {
  moduleTabs: $$(".module-tab"),
  dynastyModule: $("#dynastyModule"),
  authorModule: $("#authorModule"),
  eraModule: $("#eraModule"),
  dynastyName: $("#dynastyName"),
  dynastyPeriod: $("#dynastyPeriod"),
  dynastyOrder: $("#dynastyOrder"),
  dynastySummary: $("#dynastySummary"),
  dynastyCapital: $("#dynastyCapital"),
  dynastyScale: $("#dynastyScale"),
  dynastySnapshots: $("#dynastySnapshots"),
  snapshotYearLabel: $("#snapshotYearLabel"),
  chronicleButton: $("#chronicleButton"),
  chronicleCount: $("#chronicleCount"),
  placeToggle: $("#placeToggle"),
  placeCompare: $("#placeCompare"),
  worksList: $("#worksList"),
  workCount: $("#workCount"),
  filterChips: $$(".filter-chip"),
  mapDynastySeal: $("#mapDynastySeal"),
  mapDynastyYears: $("#mapDynastyYears"),
  mapDynastyLabel: $("#mapDynastyLabel"),
  mapChronicleButton: $("#mapChronicleButton"),
  mapLayerButton: $("#mapLayerButton"),
  mapLayerPanel: $("#mapLayerPanel"),
  mapLayerInputs: $$("[data-map-layer]"),
  mapRegimeKey: $("#mapRegimeKey"),
  dynastyLoading: $("#dynastyLoading"),
  timelineDots: $("#timelineDots"),
  timelinePhases: $("#timelinePhases"),
  timelineRange: $("#dynastyRange"),
  timelineProgress: $("#timelineProgress"),
  timelineName: $("#timelineName"),
  timelineHint: $("#timelineHint"),
  timelineStartLabel: $("#timelineStartLabel"),
  timelineEndLabel: $("#timelineEndLabel"),
  timelineZoomOut: $("#timelineZoomOut"),
  timelineZoomReset: $("#timelineZoomReset"),
  timelineZoomIn: $("#timelineZoomIn"),
  prevDynasty: $("#prevDynasty"),
  nextDynasty: $("#nextDynasty"),
  searchRoot: $("#searchRoot"),
  searchInput: $("#globalSearch"),
  searchResults: $("#searchResults"),
  authorPicker: $("#authorPicker"),
  authorFilter: $("#authorFilter"),
  authorCount: $("#authorCount"),
  authorName: $("#authorName"),
  authorAlias: $("#authorAlias"),
  authorEra: $("#authorEra"),
  authorAvatar: $("#authorAvatar"),
  authorBio: $("#authorBio"),
  authorStopCount: $("#authorStopCount"),
  authorWorkCount: $("#authorWorkCount"),
  authorYearSpan: $("#authorYearSpan"),
  authorArchiveTag: $("#authorArchiveTag"),
  authorMilestones: $("#authorMilestones"),
  authorArchiveWorks: $("#authorArchiveWorks"),
  authorContext: $("#authorContext"),
  syncAuthorLinks: $("#syncAuthorLinks"),
  authorLinksList: $("#authorLinksList"),
  authorLinksStatus: $("#authorLinksStatus"),
  routeList: $("#routeList"),
  authorLooseWorks: $("#authorLooseWorks"),
  authorMapSeal: $("#authorMapSeal"),
  authorMapYears: $("#authorMapYears"),
  authorMapLabel: $("#authorMapLabel"),
  authorLoading: $("#authorLoading"),
  journeyCard: $("#journeyCard"),
  journeyIndex: $("#journeyIndex"),
  journeyYear: $("#journeyYear"),
  journeyPlace: $("#journeyPlace"),
  journeyAncient: $("#journeyAncient"),
  journeyPurpose: $("#journeyPurpose"),
  journeyStory: $("#journeyStory"),
  journeyWorks: $("#journeyWorks"),
  workModal: $("#workModal"),
  workModalEyebrow: $("#workModalEyebrow"),
  workModalTitle: $("#workModalTitle"),
  workModalByline: $("#workModalByline"),
  workModalPlace: $("#workModalPlace"),
  workModalModern: $("#workModalModern"),
  workOriginalLabel: $("#workOriginalLabel"),
  workTongjiaCount: $("#workTongjiaCount"),
  workModalOriginal: $("#workModalOriginal"),
  workModalTranslation: $("#workModalTranslation"),
  workModalAnnotations: $("#workModalAnnotations"),
  workModalBackground: $("#workModalBackground"),
  workModalSource: $("#workModalSource"),
  workModalLevel: $("#workModalLevel"),
  locateWorkOnMap: $("#locateWorkOnMap"),
  openAuthorJourney: $("#openAuthorJourney"),
  chronicleModal: $("#chronicleModal"),
  chronicleTitle: $("#chronicleTitle"),
  chroniclePeriod: $("#chroniclePeriod"),
  chronicleSeal: $("#chronicleSeal"),
  chronicleIntro: $("#chronicleIntro"),
  chronicleSummary: $("#chronicleSummary"),
  chronicleList: $("#chronicleList"),
  eventModal: $("#eventModal"),
  eventModalEyebrow: $("#eventModalEyebrow"),
  eventModalTitle: $("#eventModalTitle"),
  eventModalMeta: $("#eventModalMeta"),
  eventModalSeal: $("#eventModalSeal"),
  eventModalSummary: $("#eventModalSummary"),
  eventModalSources: $("#eventModalSources"),
  eventModalCause: $("#eventModalCause"),
  eventModalProcess: $("#eventModalProcess"),
  eventModalResult: $("#eventModalResult"),
  eventModalSignificance: $("#eventModalSignificance"),
  eventModalEvaluation: $("#eventModalEvaluation"),
  eventRelatedSection: $("#eventRelatedSection"),
  eventModalWorks: $("#eventModalWorks"),
  aboutModal: $("#aboutModal"),
  aboutButton: $("#aboutButton"),
  emailContactButton: $("#emailContactButton"),
  emailPopover: $("#emailPopover"),
  emailPopoverClose: $("#emailPopoverClose"),
  copyContactEmail: $("#copyContactEmail"),
  visitorCount: $("#visitorCount"),
  tongjiaPopover: $("#tongjiaPopover"),
  tongjiaPopoverClose: $("#tongjiaPopoverClose"),
  tongjiaSource: $("#tongjiaSource"),
  tongjiaTarget: $("#tongjiaTarget"),
  tongjiaTargetNote: $("#tongjiaTargetNote"),
  tongjiaMeaning: $("#tongjiaMeaning"),
  tongjiaSentence: $("#tongjiaSentence"),
  tongjiaTranslation: $("#tongjiaTranslation"),
  tongjiaWork: $("#tongjiaWork"),
  toast: $("#toast"),
  fatalMessage: $("#fatalMessage"),
  detailTabs: $$(".detail-tab"),
  detailPanes: $$(".detail-pane")
};

const escapeHTML = (value = "") =>
  String(value).replace(/[&<>"']/g, (character) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return entities[character];
  });

const normalizeSearch = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[《》〈〉“”‘’（）()、，。；：！？·\s—…-]/g, "");

const normalizeEraTitle = (value = "") =>
  normalizeSearch(value).replace(/(节选|其[一二三四五六七八九十百]+|之二|之三)$/g, "");

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => dom.toast.classList.remove("is-visible"), 2600);
}

function setEmailPopoverOpen(open) {
  dom.emailPopover.hidden = !open;
  dom.emailContactButton.setAttribute("aria-expanded", String(open));
  if (open) {
    window.requestAnimationFrame(() => dom.emailPopover.querySelector(".contact-email")?.focus());
  }
}

function closeEmailPopover({ restoreFocus = false } = {}) {
  if (dom.emailPopover.hidden) return;
  setEmailPopoverOpen(false);
  if (restoreFocus) dom.emailContactButton.focus();
}

async function copyContactEmail() {
  const email = "1615863414@qq.com";
  try {
    await navigator.clipboard.writeText(email);
  } catch {
    const field = document.createElement("textarea");
    field.value = email;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }
  showToast("邮箱已复制：1615863414@qq.com");
}

function createVisitorId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  const randomValues = window.crypto?.getRandomValues
    ? [...window.crypto.getRandomValues(new Uint32Array(3))].map((value) => value.toString(36)).join("")
    : Math.random().toString(36).slice(2);
  return `v-${Date.now().toString(36)}-${randomValues}`;
}

function getOrCreateVisitorId() {
  if (state.visitorId) return state.visitorId;
  const storageOptions = [];
  try {
    storageOptions.push(window.localStorage, window.sessionStorage);
  } catch {}
  for (const storage of storageOptions) {
    try {
      const stored = storage.getItem(VISITOR_ID_STORAGE);
      if (/^[a-zA-Z0-9_-]{8,128}$/.test(stored || "")) {
        state.visitorId = stored;
        return stored;
      }
    } catch {}
  }

  const visitorId = createVisitorId();
  state.visitorId = visitorId;
  try {
    window.localStorage.setItem(VISITOR_ID_STORAGE, visitorId);
  } catch {
    try {
      window.sessionStorage.setItem(VISITOR_ID_STORAGE, visitorId);
    } catch {}
  }
  return visitorId;
}

async function loadVisitorCount(force = false) {
  if (!dom.visitorCount) return;
  if (state.visitorCountLoaded && !force) return;
  if (loadVisitorCount.promise) return loadVisitorCount.promise;

  loadVisitorCount.promise = (async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch("./api/visitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: getOrCreateVisitorId() }),
        cache: "no-store",
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Visitor API failed: ${response.status}`);
      const payload = await response.json();
      const count = Number(payload.count);
      if (!Number.isSafeInteger(count) || count < 0) throw new Error("Invalid visitor count");
      dom.visitorCount.textContent = count.toLocaleString("zh-CN");
      dom.visitorCount.classList.remove("is-unavailable");
      state.visitorCountLoaded = true;
    } catch {
      dom.visitorCount.textContent = "暂不可用";
      dom.visitorCount.classList.add("is-unavailable");
      state.visitorCountLoaded = false;
    } finally {
      window.clearTimeout(timeout);
      loadVisitorCount.promise = null;
    }
  })();

  return loadVisitorCount.promise;
}

function showFatal(title, detail) {
  dom.fatalMessage.innerHTML = `
    <div>
      <h2>${escapeHTML(title)}</h2>
      <p>${detail}</p>
      <p>在项目目录运行 <code>npm start</code>，或双击 <code>start.bat</code>。</p>
    </div>
  `;
  dom.fatalMessage.hidden = false;
}

function setBodyLock(locked) {
  document.body.style.overflow = locked ? "hidden" : "";
}

async function loadData() {
  let response;
  try {
    response = await fetch(DATA_URL, { cache: "no-cache" });
  } catch (error) {
    showFatal(
      "无法读取数据文件",
      "浏览器阻止了本地 JSON 读取。请通过本地静态服务器打开项目，而不是直接双击 index.html。"
    );
    throw error;
  }

  if (!response.ok) {
    showFatal("数据文件加载失败", `服务器返回 ${response.status}，请检查 data.json 是否存在。`);
    throw new Error(`Data request failed: ${response.status}`);
  }

  try {
    state.data = await response.json();
  } catch (error) {
    showFatal("data.json 格式有误", "请检查 JSON 的逗号、引号与括号是否完整。");
    throw error;
  }

  if (!Array.isArray(state.data.dynasties) || !Array.isArray(state.data.authors) || !Array.isArray(state.data.works)) {
    showFatal("数据结构不完整", "data.json 需要包含 dynasties、authors、works 三个数组。");
    throw new Error("Invalid data structure");
  }

  try {
    const chronicleResponse = await fetch("./data/chronicles.json", { cache: "no-cache" });
    state.data.chronicles = chronicleResponse.ok ? await chronicleResponse.json() : {};
  } catch {
    state.data.chronicles = {};
  }

  try {
    const eraResponse = await fetch("./data/era-timeline.json", { cache: "no-cache" });
    if (!eraResponse.ok) throw new Error(`Era timeline request failed: ${eraResponse.status}`);
    const eraData = await eraResponse.json();
    state.eraData = Array.isArray(eraData.dynasties) ? eraData : null;
  } catch (error) {
    console.error(error);
    state.eraData = null;
  }

  try {
    const detailResponse = await fetch("./data/history-event-details.json", { cache: "no-cache" });
    state.eventDetails = detailResponse.ok ? await detailResponse.json() : { events: {} };
  } catch {
    state.eventDetails = { events: {} };
  }

  const contentUnion = buildContentUnion({
    data: state.data,
    eraData: state.eraData,
    eventDetails: state.eventDetails
  });
  state.data.authors = contentUnion.authors;
  state.data.chronicles = contentUnion.chronicles;
  state.eraData = contentUnion.eraData;
  state.historyEvents = contentUnion.events;
  state.historyEventsById = contentUnion.eventsById;
  const authorByName = new Map(state.data.authors.map((author) => [author.name, author]));
  state.data.works.forEach((work) => {
    if (work.authorId || authorByName.has(work.author)) {
      work.authorId = work.authorId || authorByName.get(work.author)?.id;
      return;
    }
    const matchedAuthor = state.data.authors
      .filter((author) => work.author.includes(author.name) || author.name.includes(work.author))
      .sort((a, b) => b.name.length - a.name.length)[0];
    if (matchedAuthor) work.authorId = matchedAuthor.id;
  });

  try {
    const linkResponse = await fetch("./data/author-links.json", { cache: "no-cache" });
    if (linkResponse.ok) {
      const filePayload = await linkResponse.json();
      let storedPayload = null;
      try {
        storedPayload = JSON.parse(localStorage.getItem(AUTHOR_LINKS_STORAGE) || "null");
      } catch {}
      const newer =
        storedPayload &&
        new Date(storedPayload.generatedAt || 0).getTime() > new Date(filePayload.generatedAt || 0).getTime()
          ? storedPayload
          : filePayload;
      applyAuthorLinkData(newer);
    }
  } catch {
    state.authorLinks = {};
    state.authorLinkUnmatched = [];
  }

  state.worksById = new Map(state.data.works.map((work) => [work.id, work]));
  try {
    const tongjiaResponse = await fetch("./data/tongjia.json", { cache: "no-cache" });
    if (!tongjiaResponse.ok) throw new Error(`Tongjia request failed: ${tongjiaResponse.status}`);
    const payload = await tongjiaResponse.json();
    for (const entry of payload.entries || []) {
      if (!entry?.id) continue;
      state.tongjiaEntriesById.set(entry.id, entry);
      for (const workId of entry.workIds || []) {
        if (!state.tongjiaByWork.has(workId)) state.tongjiaByWork.set(workId, []);
        state.tongjiaByWork.get(workId).push(entry);
      }
    }
  } catch (error) {
    console.error(error);
  }

  try {
    const atlasResponse = await fetch("./data/map-atlas.json", { cache: "no-cache" });
    if (!atlasResponse.ok) throw new Error(`Atlas request failed: ${atlasResponse.status}`);
    state.atlasData = await atlasResponse.json();
  } catch (error) {
    console.error(error);
    state.atlasData = null;
  }

  state.data.dynasties.forEach((dynasty) => {
    const atlasPeriod = state.atlasData?.periods?.find((period) => period.id === dynasty.id);
    dynasty.atlasPeriod = atlasPeriod || null;
    dynasty.snapshots =
      atlasPeriod?.snapshots?.length > 0
        ? atlasPeriod.snapshots
        : [
            {
              id: `${dynasty.id}-fallback`,
              year: Number.parseInt(String(dynasty.period).match(/-?\d+/)?.[0] || "0", 10),
              yearLabel: dynasty.yearsLabel,
              label: dynasty.mapLabel,
              geojson: dynasty.geojson,
              source: "existing-approximation"
            }
          ];
  });
  state.atlasSnapshots = state.data.dynasties
    .flatMap((dynasty, dynastyIndex) =>
      dynasty.snapshots.map((snapshot, snapshotIndex) => ({
        ...snapshot,
        dynastyId: dynasty.id,
        dynastyName: dynasty.name,
        dynastyIndex,
        snapshotIndex
      }))
    )
    .sort((a, b) => a.year - b.year);
}

function init() {
  bindGlobalEvents();
  loadVisitorCount();
  loadData()
    .then(() => {
      state.eraTimeline = createEraTimeline({
        data: state.eraData,
        showToast,
        resolveWork: (record) => findEraWork(record)?.id || null,
        resolveAuthor: (name) =>
          state.data.authors.find((author) => normalizeAuthorName(author.name) === normalizeAuthorName(name))?.id || null,
        openWork,
        openAuthor: openEraAuthor,
        openEvent: (event, dynasty) => openHistoricalEvent(event, { returnTo: "era", dynasty })
      });
      renderTimeline();
      renderAuthorPicker();
      const defaultAuthor = state.data.authors.find((author) => author.id === state.data.meta.defaultAuthorId);
      const defaultDynastyIndex = state.data.dynasties.findIndex(
        (dynasty) => dynasty.id === state.data.meta.defaultDynastyId
      );
      selectAuthor(defaultAuthor?.id || state.data.authors[0].id, { initial: true });
      selectDynasty(defaultDynastyIndex >= 0 ? defaultDynastyIndex : 0);
      if (state.module === "era") state.eraTimeline.activate();
    })
    .catch((error) => console.error(error));
}

function renderTimeline() {
  const startYear = Number(state.atlasData?.globalStartYear ?? -2070);
  const endYear = Number(state.atlasData?.globalEndYear ?? 1949);
  const fullSpan = Math.max(1, endYear - startYear);
  if (state.timelineViewStart == null || state.timelineViewEnd == null) {
    state.timelineViewStart = startYear;
    state.timelineViewEnd = endYear;
  }
  state.timelineViewStart = Math.max(startYear, Math.min(state.timelineViewStart, endYear - 40));
  state.timelineViewEnd = Math.min(endYear, Math.max(state.timelineViewEnd, state.timelineViewStart + 40));
  const span = Math.max(1, state.timelineViewEnd - state.timelineViewStart);
  dom.timelineDots.innerHTML = state.data.dynasties
    .map((dynasty, index) => {
      const hasWorks = state.data.works.some((work) => work.dynastyId === dynasty.id);
      const period = dynasty.atlasPeriod;
      const periodStart = Number(period?.startYear ?? dynasty.snapshots[0]?.year ?? startYear);
      const periodEnd = Number(period?.endYear ?? dynasty.snapshots.at(-1)?.year ?? periodStart);
      if (periodEnd < state.timelineViewStart || periodStart > state.timelineViewEnd) return "";
      const clippedStart = Math.max(periodStart, state.timelineViewStart);
      const clippedEnd = Math.min(periodEnd, state.timelineViewEnd);
      const left = ((clippedStart - state.timelineViewStart) / span) * 100;
      const width = Math.max(0.7, ((clippedEnd - clippedStart) / span) * 100);
      return `
        <button
          class="timeline-dot${hasWorks ? "" : " is-empty"}"
          type="button"
          data-index="${index}"
          style="left:${left}%;width:${width}%;--era-tone:${escapeHTML(dynasty.color)}"
          aria-label="${escapeHTML(dynasty.name)}，${escapeHTML(dynasty.period)}${hasWorks ? "" : "，暂无教材篇目"}"
          aria-pressed="false"
          title="${hasWorks ? escapeHTML(dynasty.name) : `${escapeHTML(dynasty.name)} · 暂无教材篇目`}"
        >
          <span>${escapeHTML(dynasty.name)}</span>
        </button>
      `;
    })
    .join("");
  dom.timelineRange.min = String(state.timelineViewStart);
  dom.timelineRange.max = String(state.timelineViewEnd);
  dom.timelinePhases.innerHTML = state.atlasSnapshots
    .filter((snapshot) => snapshot.year >= state.timelineViewStart && snapshot.year <= state.timelineViewEnd)
    .map((snapshot) => {
      const left = ((snapshot.year - state.timelineViewStart) / span) * 100;
      return `
        <button
          class="timeline-phase"
          type="button"
          data-snapshot-id="${escapeHTML(snapshot.id)}"
          data-year="${snapshot.year}"
          style="left:${left}%"
          aria-label="${escapeHTML(snapshot.yearLabel)}，${escapeHTML(snapshot.label)}"
          title="${escapeHTML(`${snapshot.yearLabel} · ${snapshot.label}`)}"
        ></button>
      `;
    })
    .join("");
  dom.timelineStartLabel.textContent = formatTimelineAxisYear(state.timelineViewStart);
  dom.timelineEndLabel.textContent = formatTimelineAxisYear(state.timelineViewEnd);
  dom.timelineZoomOut.disabled = state.timelineViewStart === startYear && state.timelineViewEnd === endYear;
  dom.timelineZoomReset.disabled = state.timelineViewStart === startYear && state.timelineViewEnd === endYear;
  dom.timelineZoomIn.disabled = state.timelineViewEnd - state.timelineViewStart <= 60;
  dom.timelineRange.setAttribute(
    "aria-valuemin",
    String(state.timelineViewStart)
  );
  dom.timelineRange.setAttribute(
    "aria-valuemax",
    String(state.timelineViewEnd)
  );
  dom.timelineRange.setAttribute(
    "title",
    `${formatTimelineAxisYear(state.timelineViewStart)}—${formatTimelineAxisYear(state.timelineViewEnd)}`
  );
}

function updateTimeline(index, snapshot = state.currentSnapshot) {
  const dynasty = state.data.dynasties[index];
  const startYear = Number(state.timelineViewStart ?? state.atlasData?.globalStartYear ?? -2070);
  const endYear = Number(state.timelineViewEnd ?? state.atlasData?.globalEndYear ?? 1949);
  const progress = Math.max(0, Math.min(1, (Number(snapshot?.year ?? startYear) - startYear) / Math.max(1, endYear - startYear)));

  dom.timelineRange.value = String(snapshot?.year ?? startYear);
  dom.timelineRange.setAttribute("aria-valuetext", `${snapshot?.yearLabel || ""} ${snapshot?.label || dynasty.name}`);
  dom.timelineProgress.style.width = `${progress * 93}%`;
  dom.timelineName.textContent = dynasty.name;
  dom.timelineHint.textContent = snapshot ? `${snapshot.yearLabel} · ${snapshot.label}` : "拖动时间轴，穿行三千年";

  $$(".timeline-dot", dom.timelineDots).forEach((dot, dotIndex) => {
    const active = dotIndex === index;
    dot.classList.toggle("is-active", active);
    dot.setAttribute("aria-pressed", String(active));
    if (active) {
      dot.scrollIntoView({ behavior: REDUCED_MOTION ? "auto" : "smooth", block: "nearest", inline: "center" });
    }
  });
  $$(".timeline-phase", dom.timelinePhases).forEach((phase) => {
    phase.classList.toggle("is-active", phase.dataset.snapshotId === snapshot?.id);
  });
}

function formatTimelineAxisYear(year) {
  const number = Number(year);
  return number < 0 ? `前 ${Math.abs(number)}` : String(number);
}

function getTimelineGlobalBounds() {
  return {
    start: Number(state.atlasData?.globalStartYear ?? -2070),
    end: Number(state.atlasData?.globalEndYear ?? 1949)
  };
}

function setTimelineView(start, end) {
  const bounds = getTimelineGlobalBounds();
  const fullSpan = bounds.end - bounds.start;
  const span = Math.round(Math.max(60, Math.min(fullSpan, Number(end) - Number(start))));
  state.timelineViewStart = Math.round(
    Math.max(bounds.start, Math.min(Number(start), bounds.end - span))
  );
  state.timelineViewEnd = state.timelineViewStart + span;
  renderTimeline();
  updateTimeline(state.dynastyIndex, state.currentSnapshot);
}

function zoomTimeline(zoomIn, anchorYear = state.currentSnapshot?.year) {
  const bounds = getTimelineGlobalBounds();
  const currentSpan = Number(state.timelineViewEnd) - Number(state.timelineViewStart);
  const targetSpan = Math.max(60, Math.min(bounds.end - bounds.start, zoomIn ? currentSpan / 1.8 : currentSpan * 1.8));
  const anchor = Number.isFinite(Number(anchorYear))
    ? Number(anchorYear)
    : (state.timelineViewStart + state.timelineViewEnd) / 2;
  const start = Math.max(bounds.start, Math.min(anchor - targetSpan * 0.5, bounds.end - targetSpan));
  setTimelineView(start, start + targetSpan);
}

function ensureTimelineIncludes(dynasty, year) {
  if (state.timelineViewStart == null || state.timelineViewEnd == null) return false;
  const numericYear = Number(year);
  if (numericYear >= state.timelineViewStart && numericYear <= state.timelineViewEnd) return false;
  const periodStart = Number(dynasty.atlasPeriod?.startYear ?? numericYear - 60);
  const periodEnd = Number(dynasty.atlasPeriod?.endYear ?? numericYear + 60);
  const bounds = getTimelineGlobalBounds();
  const span = Math.min(bounds.end - bounds.start, Math.max(120, (periodEnd - periodStart) * 1.4));
  const center = (periodStart + periodEnd) / 2;
  const start = Math.max(bounds.start, Math.min(center - span / 2, bounds.end - span));
  state.timelineViewStart = start;
  state.timelineViewEnd = start + span;
  return true;
}

function renderDynastyDetails(dynasty) {
  dom.dynastyName.textContent = dynasty.name;
  dom.dynastyPeriod.textContent = dynasty.yearsLabel;
  dom.dynastyOrder.textContent = String(dynasty.order).padStart(2, "0");
  dom.dynastySummary.textContent = dynasty.summary;
  dom.dynastyCapital.textContent = dynasty.capital;
  dom.dynastyScale.textContent = dynasty.scale;
  dom.mapDynastySeal.textContent = dynasty.name.slice(0, 1);
  dom.mapDynastyYears.textContent = dynasty.yearsLabel;
  dom.mapDynastyLabel.textContent = dynasty.mapLabel;
  const chronicleEvents = state.data.chronicles?.[dynasty.id]?.events || [];
  dom.chronicleCount.textContent = `${chronicleEvents.length} 则`;
  dom.chronicleButton.disabled = chronicleEvents.length === 0;
  dom.placeToggle.setAttribute("aria-expanded", "false");
  dom.placeCompare.classList.remove("is-open");

  dom.placeCompare.innerHTML = dynasty.keyPlaces
    .map(
      (place) => `
        <div class="place-pair">
          <span>${escapeHTML(place.ancient)}</span>
          <i>→</i>
          <span>${escapeHTML(place.modern)}</span>
        </div>
      `
    )
    .join("");
}

function getFilteredWorks() {
  if (!state.currentDynasty) return [];
  return state.data.works
    .filter((work) => work.dynastyId === state.currentDynasty.id)
    .filter(
      (work) =>
        state.level === "all" ||
        (work.levels || [work.level]).includes(state.level)
    )
    .sort((a, b) => a.yearSort - b.yearSort);
}

function setLevelFilter(level) {
  state.level = level;
  dom.filterChips.forEach((chip) => chip.classList.toggle("is-active", chip.dataset.level === level));
  renderWorks();
  renderPlaceMarkers();
}

function renderWorks() {
  const works = getFilteredWorks();
  dom.workCount.textContent = `${works.length} 篇`;

  if (!works.length) {
    const hasAny = state.data.works.some((work) => work.dynastyId === state.currentDynasty.id);
    dom.worksList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 4.5h11a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3v-12Z"></path>
          <path d="M8 16.5h11M9 8h6M9 11h4"></path>
        </svg>
        <strong>${hasAny ? "此筛选下暂无篇目" : "本时段暂无匹配篇目"}</strong>
        <p>${hasAny ? "同一朝代还有其他学段篇目。" : "这一时期暂未收录教材诗文；疆域与古今地名仍可查看。"}</p>
        ${hasAny && state.level !== "all" ? `<button class="empty-reset-button" type="button" data-clear-level>显示全部篇目</button>` : ""}
      </div>
    `;
    return;
  }

  dom.worksList.innerHTML = `${works
    .map(
      (work) => `
        <article class="work-card" data-work-id="${escapeHTML(work.id)}" data-level="${escapeHTML(work.level)}">
          <span class="work-level-bar" aria-hidden="true"></span>
          <button class="work-card-main" type="button" data-open-work="${escapeHTML(work.id)}">
            <span class="work-card-title-line">
              <h3>${escapeHTML(work.title)}</h3>
              <span class="work-genre">${escapeHTML(work.genre || "")}</span>
            </span>
            <p>
              <span>${escapeHTML(work.author)}</span>
              <i></i>
              <span>${escapeHTML(work.dynasty)}</span>
              ${work.year === `${work.dynasty}代` || work.year === work.dynasty ? "" : `<i></i><span>${escapeHTML(work.year)}</span>`}
              <i></i>
              <span>${escapeHTML(work.place.name)}</span>
            </p>
          </button>
          <button class="locate-work" type="button" data-locate-work="${escapeHTML(work.id)}" aria-label="在地图上定位${escapeHTML(work.title)}">
            ${
              Number.isFinite(Number(work.place.lat)) && Number.isFinite(Number(work.place.lng))
                ? `<svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="6"></circle>
                    <path d="M12 2v4M12 18v4M2 12h4M18 12h4"></path>
                  </svg>`
                : `<span class="locate-unknown" title="创作地点无确考">?</span>`
            }
          </button>
        </article>
      `
    )
    .join("")}
    <p class="panel-source">篇目与学段按部编本通行版本整理；创作地异说见篇目详情。</p>`;
}

async function selectDynasty(index, options = {}) {
  const safeIndex = Math.max(0, Math.min(index, state.data.dynasties.length - 1));
  const changed = state.currentDynasty?.id !== state.data.dynasties[safeIndex].id;
  state.dynastyIndex = safeIndex;
  state.currentDynasty = state.data.dynasties[safeIndex];
  const requestedSnapshot =
    state.currentDynasty.snapshots.find((snapshot) => snapshot.id === options.snapshotId) ||
    (Number.isFinite(Number(options.snapshotYear))
      ? [...state.currentDynasty.snapshots].sort(
          (a, b) => Math.abs(a.year - Number(options.snapshotYear)) - Math.abs(b.year - Number(options.snapshotYear))
        )[0]
      : null) ||
    state.currentDynasty.snapshots.find(
      (snapshot) => snapshot.year === Number(state.currentDynasty.atlasPeriod?.defaultYear)
    ) ||
    state.currentDynasty.snapshots[0];
  state.currentSnapshot = requestedSnapshot;
  const timelineViewChanged = ensureTimelineIncludes(state.currentDynasty, state.currentSnapshot?.year);

  if (state.level !== "all") {
    const allWorks = state.data.works.filter((work) => work.dynastyId === state.currentDynasty.id);
    const filteredWorks = allWorks.filter((work) => (work.levels || [work.level]).includes(state.level));
    if (!filteredWorks.length && allWorks.length) {
      state.level = "all";
      dom.filterChips.forEach((chip) => chip.classList.toggle("is-active", chip.dataset.level === "all"));
      showToast(`${state.currentDynasty.name}暂无当前学段篇目，已显示全部`);
    }
  }

  renderDynastyDetails(state.currentDynasty);
  renderSnapshotChoices(state.currentDynasty, state.currentSnapshot);
  renderWorks();
  if (timelineViewChanged) renderTimeline();
  updateTimeline(safeIndex, state.currentSnapshot);

  if (state.module === "dynasty") {
    await renderDynastyMap(state.currentDynasty, state.currentSnapshot);
  } else if (changed) {
    state.dynastyGeoLayerPromise = renderDynastyMap(state.currentDynasty, state.currentSnapshot);
  }

  if (options.focusWork) {
    window.setTimeout(() => locateWork(options.focusWork), 120);
  }
}

function renderSnapshotChoices(dynasty, snapshot) {
  dom.snapshotYearLabel.textContent = snapshot ? `${snapshot.yearLabel} · ${snapshot.label}` : "";
  dom.dynastySnapshots.innerHTML = dynasty.snapshots
    .map(
      (item) => `
        <button
          class="snapshot-option${item.id === snapshot?.id ? " is-active" : ""}"
          type="button"
          data-snapshot-id="${escapeHTML(item.id)}"
          aria-pressed="${item.id === snapshot?.id}"
          title="${escapeHTML(`${item.yearLabel} · ${item.label}`)}"
        >
          <span>${escapeHTML(item.year < 0 ? `前${Math.abs(item.year)}` : String(item.year))}</span>
          <small>${escapeHTML(item.label)}</small>
        </button>
      `
    )
    .join("");
  if (snapshot) {
    dom.mapDynastyYears.textContent = `${snapshot.yearLabel} · ${snapshot.label}`;
    dom.mapDynastyLabel.textContent = dynasty.mapLabel;
  }
}

async function selectSnapshot(snapshotId) {
  const snapshot = state.atlasSnapshots.find((item) => item.id === snapshotId);
  if (!snapshot) return;
  await selectDynasty(snapshot.dynastyIndex, { snapshotId });
}

function ensureLeaflet() {
  if (window.L) return true;
  showFatal(
    "地图组件未加载",
    "页面需要从 CDN 加载 Leaflet。请检查网络连接后刷新，或将 Leaflet 资源下载到本地 assets/vendor 后修改 index.html 的引用。"
  );
  return false;
}

function createBaseMap(element) {
  if (!ensureLeaflet()) return null;
  const map = L.map(element, {
    zoomControl: true,
    attributionControl: true,
    minZoom: 3,
    maxZoom: 9,
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    worldCopyJump: true
  }).setView([34.3, 108.9], 4);

  const tiles = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      attribution: "底图 &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
    }
  );
  map._terrainTiles = tiles;
  if (state.mapLayers.terrain) tiles.addTo(map);

  attachChineseMapLabels(map);

  tiles.on("tileerror", () => {
    if (state.tileWarningShown) return;
    state.tileWarningShown = true;
    showToast("浅色底图暂时不可用，疆域图层仍可查看");
  });

  return map;
}

function attachChineseMapLabels(map) {
  const labelData = Array.isArray(state.data?.mapLabels) ? state.data.mapLabels : [];
  const layerGroup = L.layerGroup();
  const labels = labelData.map((label) => {
    const icon = L.divIcon({
      className: "map-label-icon",
      iconSize: [0, 0],
      iconAnchor: [0, 0],
      html: `<span class="map-label ${escapeHTML(label.kind || "city")}">${escapeHTML(label.name)}</span>`
    });
    const marker = L.marker([Number(label.lat), Number(label.lng)], {
      icon,
      interactive: false,
      keyboard: false
    }).addTo(layerGroup);
    return { marker, label };
  });
  map._chineseLabelLayer = layerGroup;
  if (state.mapLayers.labels) layerGroup.addTo(map);

  const sync = () => {
    const zoom = map.getZoom();
    labels.forEach(({ marker, label }) => {
      const element = marker.getElement();
      if (!element) return;
      const minZoom = Number(label.minZoom ?? 3);
      const maxZoom = Number(label.maxZoom ?? 99);
      element.classList.toggle("map-label-hidden", zoom < minZoom || zoom > maxZoom);
    });
  };

  map._chineseLabels = labels;
  map._syncChineseLabels = sync;
  map.on("zoomend", sync);
  window.requestAnimationFrame(sync);
}

function initDynastyMap() {
  if (state.maps.dynasty) return state.maps.dynasty;
  state.maps.dynasty = createBaseMap($("#dynastyMap"));
  if (!state.maps.dynasty) return null;
  state.layers.dynastyMarkers = L.layerGroup();
  state.layers.polityLabels = L.layerGroup();
  renderModernProvinceLayer(state.maps.dynasty);
  if (state.mapLayers.poems) state.layers.dynastyMarkers.addTo(state.maps.dynasty);
  if (state.mapLayers.labels) state.layers.polityLabels.addTo(state.maps.dynasty);
  state.maps.dynasty.on("zoomend", () => syncPolityLabelVisibility(state.maps.dynasty));
  return state.maps.dynasty;
}

async function renderModernProvinceLayer(map) {
  if (state.layers.modernProvinces) return;
  try {
    const geoJSON = await fetchGeoJSON("./data/modern-provinces.geojson");
    state.layers.modernProvinces = L.geoJSON(geoJSON, {
      style: {
        color: "#6f837b",
        weight: 0.7,
        opacity: 0.34,
        fillOpacity: 0,
        dashArray: "2 3",
        interactive: false
      }
    });
    if (state.mapLayers.provinces) state.layers.modernProvinces.addTo(map);
  } catch (error) {
    console.error(error);
  }
}

function initAuthorMap() {
  if (state.maps.author) return state.maps.author;
  state.maps.author = createBaseMap($("#authorMap"));
  if (!state.maps.author) return null;
  state.maps.author.setView([34.5, 111.5], 4);
  return state.maps.author;
}

async function fetchGeoJSON(path) {
  if (state.geojsonCache.has(path)) return state.geojsonCache.get(path);
  const response = await fetch(path);
  if (!response.ok) throw new Error(`GeoJSON request failed: ${response.status}`);
  const data = await response.json();
  state.geojsonCache.set(path, data);
  return data;
}

function dynastyGeoStyle(feature) {
  const primary = feature.properties?.role === "primary";
  const context = feature.properties?.role === "context";
  const neighbor = feature.properties?.role === "neighbor";
  const color = feature.properties?.color || state.currentDynasty?.color || "#9b6e48";
  return {
    color,
    weight: primary ? 1.9 : neighbor ? 1.1 : 1.4,
    opacity: neighbor ? 0.42 : context ? 0.78 : 0.95,
    fillColor: color,
    fillOpacity: neighbor ? 0.035 : primary ? 0.2 : 0.12,
    dashArray: neighbor || context ? "5 4" : null,
    lineJoin: "round"
  };
}

function renderPolityLabels(map, geoJSON) {
  if (state.layers.polityLabels) state.layers.polityLabels.remove();
  state.layers.polityLabels = L.layerGroup();
  const markers = [];
  geoJSON.features.forEach((feature) => {
    const properties = feature.properties || {};
    const anchor = properties.anchor;
    if (!properties.name || !Array.isArray(anchor) || anchor.length < 2) return;
    const role = properties.role || "context";
    const icon = L.divIcon({
      className: "polity-label-icon",
      iconSize: [0, 0],
      iconAnchor: [0, 0],
      html: `<span class="polity-map-label ${escapeHTML(role)}">${escapeHTML(properties.name)}</span>`
    });
    const marker = L.marker([Number(anchor[1]), Number(anchor[0])], {
      icon,
      interactive: false,
      keyboard: false
    }).addTo(state.layers.polityLabels);
    markers.push({ marker, role });
  });
  map._polityLabelMarkers = markers;
  if (state.mapLayers.labels) state.layers.polityLabels.addTo(map);
  syncPolityLabelVisibility(map);
}

function syncPolityLabelVisibility(map) {
  const zoom = map.getZoom();
  (map._polityLabelMarkers || []).forEach(({ marker, role }) => {
    const minZoom = role === "primary" ? 3 : role === "context" ? 5 : 6;
    marker.getElement()?.classList.toggle("map-label-hidden", zoom < minZoom);
  });
}

function renderRegimeKey(geoJSON) {
  const seen = new Set();
  const items = [];
  geoJSON.features.forEach((feature) => {
    const properties = feature.properties || {};
    if (!properties.name || properties.role === "neighbor" || seen.has(properties.name)) return;
    seen.add(properties.name);
    items.push(
      `<span><i style="background:${escapeHTML(properties.color || state.currentDynasty?.color || "#9b6e48")}"></i>${escapeHTML(properties.name)}</span>`
    );
  });
  dom.mapRegimeKey.innerHTML = items.slice(0, 10).join("");
}

function applyMapLayers() {
  const dynastyMap = state.maps.dynasty;
  if (dynastyMap) {
    const synchronizeLayer = (layer, visible) => {
      if (!layer) return;
      const shown = dynastyMap.hasLayer(layer);
      if (visible && !shown) layer.addTo(dynastyMap);
      if (!visible && shown) layer.remove();
    };
    synchronizeLayer(state.layers.dynastyGeo, state.mapLayers.territory);
    synchronizeLayer(state.layers.dynastyMarkers, state.mapLayers.poems);
    synchronizeLayer(dynastyMap._chineseLabelLayer, state.mapLayers.labels);
    synchronizeLayer(state.layers.polityLabels, state.mapLayers.labels);
    synchronizeLayer(dynastyMap._terrainTiles, state.mapLayers.terrain);
    synchronizeLayer(state.layers.modernProvinces, state.mapLayers.provinces);
    dynastyMap
      .getContainer()
      .classList.toggle("has-terrain-disabled", !state.mapLayers.terrain);
    syncPolityLabelVisibility(dynastyMap);
  }

  const authorMap = state.maps.author;
  if (authorMap) {
    const synchronizeLayer = (layer, visible) => {
      if (!layer) return;
      const shown = authorMap.hasLayer(layer);
      if (visible && !shown) layer.addTo(authorMap);
      if (!visible && shown) layer.remove();
    };
    synchronizeLayer(authorMap._chineseLabelLayer, state.mapLayers.labels);
    synchronizeLayer(authorMap._terrainTiles, state.mapLayers.terrain);
    authorMap.getContainer().classList.toggle("has-terrain-disabled", !state.mapLayers.terrain);
  }
}

async function renderDynastyMap(dynasty, snapshot = state.currentSnapshot) {
  const map = initDynastyMap();
  if (!map || !snapshot) return;

  dom.dynastyLoading.hidden = false;

  try {
    const geoJSON = await fetchGeoJSON(snapshot.geojson);
    if (state.currentDynasty?.id !== dynasty.id || state.currentSnapshot?.id !== snapshot.id) return;

    if (state.layers.dynastyGeo) state.layers.dynastyGeo.remove();
    state.layers.dynastyGeo = L.geoJSON(geoJSON, {
      style: dynastyGeoStyle,
      onEachFeature: (feature, layer) => {
        if (feature.properties?.name) {
          layer.bindTooltip(feature.properties.name, {
            sticky: true,
            direction: "top",
            className: "geo-tooltip",
            opacity: 0.9
          });
        }
      }
    });
    if (state.mapLayers.territory) state.layers.dynastyGeo.addTo(map);
    renderPolityLabels(map, geoJSON);
    renderRegimeKey(geoJSON);

    renderPlaceMarkers();
    const bounds = state.layers.dynastyGeo.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        paddingTopLeft: [24, 76],
        paddingBottomRight: [24, 48],
        maxZoom: 6.5
      });
    }
  } catch (error) {
    console.error(error);
    showToast("疆域图层加载失败，请检查 GeoJSON 地址");
  } finally {
    dom.dynastyLoading.hidden = true;
  }
}

function groupWorksByPlace(works) {
  const groups = [];
  works.filter((work) => Number.isFinite(Number(work.place.lat)) && Number.isFinite(Number(work.place.lng))).forEach((work) => {
    const lat = Number(work.place.lat);
    const lng = Number(work.place.lng);
    const normalizedName = normalizeSearch(work.place.name);
    let group = groups.find(
      (item) =>
        normalizeSearch(item.place.name) === normalizedName ||
        (Math.abs(item.lat - lat) < 0.06 && Math.abs(item.lng - lng) < 0.06)
    );
    if (!group) {
      group = {
        key: `${lat.toFixed(3)},${lng.toFixed(3)}`,
        place: work.place,
        works: [],
        lat,
        lng
      };
      groups.push(group);
    }
    group.works.push(work);
  });
  return new Map(groups.map((group) => [group.key, group]));
}

function markerClassForWorks(works) {
  const levels = new Set(works.flatMap((work) => work.levels || [work.level]));
  if (levels.size > 1) return "is-mixed";
  if (levels.has("senior")) return "is-senior";
  if (levels.has("extra")) return "is-extra";
  if (levels.has("primary")) return "is-primary";
  return "";
}

function renderPlaceMarkers() {
  const map = state.maps.dynasty;
  if (!map || !state.layers.dynastyMarkers) return;

  state.layers.dynastyMarkers.clearLayers();
  state.placeMarkers.clear();
  state.workMarkerIndex.clear();

  const groups = groupWorksByPlace(getFilteredWorks());
  groups.forEach((group) => {
    const label = group.works.length > 1 ? String(group.works.length) : "·";
    const icon = L.divIcon({
      className: "place-div-icon",
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -17],
      html: `<div class="place-marker ${markerClassForWorks(group.works)}"><span>${escapeHTML(label)}</span></div>`
    });

    const marker = L.marker([group.lat, group.lng], {
      icon,
      riseOnHover: true,
      keyboard: true,
      title: `${group.place.name}，${group.works.length} 篇诗文`
    });
    marker.bindPopup(buildPlacePopup(group), {
      maxWidth: 310,
      minWidth: 265,
      autoPanPaddingTopLeft: [26, 88],
      autoPanPaddingBottomRight: [26, 58]
    });
    marker.on("popupopen", (event) => {
      const popupElement = event.popup.getElement();
      $$("[data-popup-work]", popupElement).forEach((button) => {
        button.addEventListener("click", () => openWork(button.dataset.popupWork));
      });
    });
    marker.addTo(state.layers.dynastyMarkers);
    state.placeMarkers.set(group.key, marker);
    group.works.forEach((work) => state.workMarkerIndex.set(work.id, marker));
  });
}

function buildPlacePopup(group) {
  const ancient = group.place.ancient || group.place.name;
  const modern = group.place.modern || "";
  const placeLine = modern && modern !== ancient ? `古称 ${escapeHTML(ancient)} · 今 ${escapeHTML(modern)}` : escapeHTML(ancient);

  return `
    <div class="map-popup">
      <p class="eyebrow">${escapeHTML(state.currentDynasty.name)} · ${group.works.length} 篇</p>
      <h3>${escapeHTML(group.place.name)}</h3>
      <p class="popup-modern">${placeLine}</p>
      <div class="popup-works">
        ${group.works
          .map(
            (work) => `
              <button class="popup-work" type="button" data-popup-work="${escapeHTML(work.id)}">
                <span>${escapeHTML(work.title)}</span>
                <small>${escapeHTML(work.author)}</small>
              </button>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

async function locateWork(workId, options = {}) {
  const work = state.worksById.get(workId);
  if (!work) return;
  if (!Number.isFinite(Number(work.place.lat)) || !Number.isFinite(Number(work.place.lng))) {
    openWork(work.id);
    showToast("该篇目创作地点无确考，已打开诗文详情");
    return;
  }

  if (state.level !== "all" && work.level !== state.level) {
    setLevelFilter("all");
  }

  if (state.module !== "dynasty") switchModule("dynasty");
  const targetIndex = state.data.dynasties.findIndex((dynasty) => dynasty.id === work.dynastyId);
  if (targetIndex < 0) {
    showToast("未找到该篇目所属朝代");
    return;
  }
  const targetDynasty = state.data.dynasties[targetIndex];
  const workYear = Number(work.yearSort);
  const periodStart = Number(targetDynasty.atlasPeriod?.startYear ?? targetDynasty.snapshots[0]?.year);
  const periodEnd = Number(targetDynasty.atlasPeriod?.endYear ?? targetDynasty.snapshots.at(-1)?.year);
  const hasReliableWorkYear =
    Number.isFinite(workYear) && workYear >= periodStart && workYear <= periodEnd;
  const targetSnapshot =
    hasReliableWorkYear
      ? [...targetDynasty.snapshots].sort(
          (a, b) => Math.abs(a.year - workYear) - Math.abs(b.year - workYear)
        )[0]
      : targetDynasty.snapshots.find(
          (snapshot) => snapshot.year === Number(targetDynasty.atlasPeriod?.defaultYear)
        ) || targetDynasty.snapshots[0];
  if (
    targetIndex !== state.dynastyIndex ||
    targetSnapshot?.id !== state.currentSnapshot?.id ||
    !state.layers.dynastyGeo
  ) {
    await selectDynasty(targetIndex, { snapshotId: targetSnapshot?.id });
  }

  const marker = state.workMarkerIndex.get(work.id);
  const map = state.maps.dynasty;
  if (!marker || !map) {
    showToast("该篇目在当前筛选下未显示，请切换到“全部”");
    return;
  }

  map.flyTo([Number(work.place.lat), Number(work.place.lng)], Math.max(map.getZoom(), 5.4), {
    duration: REDUCED_MOTION ? 0 : 0.8
  });
  window.setTimeout(() => marker.openPopup(), REDUCED_MOTION ? 0 : 500);

  const card = $(`.work-card[data-work-id="${CSS.escape(work.id)}"]`);
  if (card) {
    card.classList.remove("is-highlight");
    void card.offsetWidth;
    card.classList.add("is-highlight");
    if (window.innerWidth <= 900) card.scrollIntoView({ behavior: REDUCED_MOTION ? "auto" : "smooth", block: "center" });
  }

  if (options.scrollMap && window.innerWidth <= 900) {
    $(".map-stage").scrollIntoView({ behavior: REDUCED_MOTION ? "auto" : "smooth", block: "start" });
  }
}

function switchModule(module) {
  if (!["dynasty", "author", "era"].includes(module)) return;
  state.module = module;
  if (window.innerWidth <= 900) {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }
  dom.moduleTabs.forEach((tab) => {
    const active = tab.dataset.module === module;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  dom.dynastyModule.classList.toggle("is-active", module === "dynasty");
  dom.authorModule.classList.toggle("is-active", module === "author");
  dom.eraModule.classList.toggle("is-active", module === "era");

  window.requestAnimationFrame(() => {
    if (module === "dynasty") {
      const map = initDynastyMap();
      map?.invalidateSize();
      if (!state.layers.dynastyGeo) renderDynastyMap(state.currentDynasty);
    } else if (module === "author") {
      const map = initAuthorMap();
      map?.invalidateSize();
      if (!state.authorMapRendered && state.currentAuthor) {
        renderAuthorRoute(state.currentAuthor);
      } else {
        state.maps.author?.invalidateSize();
      }
    } else {
      state.eraTimeline?.activate();
    }
  });
}

function renderAuthorPicker(query = "") {
  dom.authorCount.textContent = `${state.data.authors.length} 位`;
  const normalizedQuery = normalizeSearch(query);
  const matches = normalizedQuery
    ? state.data.authors.filter((author) =>
        normalizeSearch(`${author.name}${author.alias}${author.era}`).includes(normalizedQuery)
      )
    : state.data.authors;
  dom.authorPicker.innerHTML = matches
    .map(
      (author) => `
        <button class="author-chip" type="button" data-author-id="${escapeHTML(author.id)}" role="option" aria-selected="false">
          <i></i>
          <span>${escapeHTML(author.name)}</span>
        </button>
      `
    )
    .join("");
}

function getAuthorWorks(author) {
  const ids = new Set([...author.route.flatMap((stop) => stop.workIds || []), ...(author.looseWorkIds || [])]);
  (author.profile?.works || []).forEach((title) => {
    const work = findEraWork({ title, author: author.name });
    if (work) ids.add(work.id);
  });
  return ids;
}

function selectAuthor(authorId, options = {}) {
  const author = state.data.authors.find((item) => item.id === authorId);
  if (!author) return;

  state.currentAuthor = author;
  state.currentStopIndex = 0;
  state.lastStopIndex = 0;

  $$(".author-chip", dom.authorPicker).forEach((chip) => {
    const active = chip.dataset.authorId === authorId;
    chip.classList.toggle("is-active", active);
    chip.setAttribute("aria-selected", String(active));
    if (active && !options.initial) {
      chip.scrollIntoView({ behavior: REDUCED_MOTION ? "auto" : "smooth", block: "nearest", inline: "center" });
    }
  });

  renderAuthorProfile(author);
  renderRouteList(author);
  if (state.module === "author") {
    renderAuthorRoute(author);
  } else {
    state.authorMapRendered = false;
  }
}

function renderAuthorProfile(author) {
  const workCount = getAuthorWorks(author).size;
  const profile = author.profile || {};
  dom.authorName.textContent = author.name;
  dom.authorAlias.textContent = author.alias;
  dom.authorEra.textContent = author.era;
  dom.authorAvatar.textContent = author.name.slice(0, 1);
  dom.authorBio.textContent = profile.bio || author.bio;
  dom.authorStopCount.textContent = String(author.route.length);
  dom.authorWorkCount.textContent = String(Math.max(workCount, profile.works?.length || 0));
  dom.authorYearSpan.textContent = author.yearSpan;
  dom.authorMapSeal.textContent = author.name.slice(0, 1);
  dom.authorMapYears.textContent = author.yearSpan;
  dom.authorMapLabel.textContent = `${author.name} · 山河入梦`;
  dom.authorArchiveTag.textContent = profile.tag || author.era;
  dom.authorMilestones.innerHTML = (profile.milestones || [])
    .map(
      (milestone) => `
        <li>
          <i></i>
          <p>${escapeHTML(milestone)}</p>
        </li>
      `
    )
    .join("");
  dom.authorArchiveWorks.innerHTML = (profile.works || [])
    .map((title) => {
      const work = findEraWork({ title, author: author.name });
      return work
        ? `<button type="button" data-author-archive-work="${escapeHTML(work.id)}">${escapeHTML(title)}</button>`
        : `<span>${escapeHTML(title)}</span>`;
    })
    .join("");
  dom.authorContext.textContent = profile.context || "";
  renderAuthorLinks(author);
}

function normalizeAuthorName(value) {
  return String(value)
    .replace(/[《》〈〉“”‘’（）()、，。；：！？·\s—…-]/g, "")
    .toLowerCase();
}

function findEraWork(record) {
  const title = normalizeEraTitle(record?.title);
  const author = normalizeAuthorName(record?.author || "");
  if (!title) return null;

  const matches = state.data.works
    .filter((work) => {
      const workTitle = normalizeEraTitle(work.title);
      return (
        workTitle === title ||
        workTitle.startsWith(title) ||
        (workTitle.length >= 3 && title.startsWith(workTitle))
      );
    })
    .map((work) => {
      const workTitle = normalizeEraTitle(work.title);
      const workAuthor = normalizeAuthorName(work.author);
      const authorScore =
        workAuthor === author ? 3 : workAuthor.includes(author) || author.includes(workAuthor) ? 2 : 0;
      const titleScore =
        workTitle === title ? 5 : workTitle.startsWith(title) ? 4 : title.startsWith(workTitle) ? 3 : 1;
      const studyScore = work.level === "junior" || work.level === "senior" ? 1 : 0;
      return { work, score: authorScore + titleScore + studyScore };
    })
    .filter((candidate) => candidate.score >= 5)
    .sort((a, b) => b.score - a.score || normalizeEraTitle(a.work.title).length - normalizeEraTitle(b.work.title).length);

  return matches[0]?.work || null;
}

function findLinkAuthor(rawName) {
  const normalized = normalizeAuthorName(rawName);
  return state.data.authors.find((author) => {
    const candidates = [author.name, author.alias, ...(author.aliases || [])].map(normalizeAuthorName);
    return candidates.some(
      (candidate) =>
        candidate === normalized ||
        (candidate.length > 1 && normalized.includes(candidate)) ||
        (normalized.length > 1 && candidate.includes(normalized))
    );
  });
}

function parseAuthorLinkText(text) {
  const authors = {};
  const unmatched = [];
  const urlPattern = /https?:\/\/[^\s，,；;]+/g;

  String(text)
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const urls = line.match(urlPattern) || [];
      if (!urls.length) return;
      const firstUrlIndex = line.indexOf(urls[0]);
      const rawName = line.slice(0, firstUrlIndex).replace(/[：:\-—\s]+$/g, "").trim();
      if (!rawName) return;
      const author = findLinkAuthor(rawName);
      urls.forEach((url, index) => {
        const link = {
          name: rawName,
          title: urls.length > 1 ? `讲解视频 ${index + 1}` : "作者讲解视频",
          url: url.replace(/[。；;，,]+$/, "")
        };
        if (!author) {
          unmatched.push(link);
          return;
        }
        if (!authors[author.id]) authors[author.id] = [];
        authors[author.id].push(link);
      });
    });

  return {
    generatedAt: new Date().toISOString(),
    source: "detail.txt",
    authors,
    unmatched,
    matchedCount: Object.values(authors).reduce((total, links) => total + links.length, 0)
  };
}

function applyAuthorLinkData(payload) {
  state.authorLinks = payload?.authors || {};
  state.authorLinkUnmatched = payload?.unmatched || [];
}

function renderAuthorLinks(author) {
  if (!author) return;
  const links = state.authorLinks[author.id] || [];
  const matchedMarkup = links.length
    ? links
        .map((link, index) => {
          let host = "外部链接";
          try {
            host = new URL(link.url).hostname.replace(/^www\./, "");
          } catch {}
          return `
            <a class="author-video-link" href="${escapeHTML(link.url)}" target="_blank" rel="noopener noreferrer">
              <span class="video-play">▶</span>
              <span>
                <strong>${escapeHTML(links.length > 1 ? `${link.title} ${String(index + 1).padStart(2, "0")}` : link.title)}</strong>
                <small>${escapeHTML(host)}</small>
              </span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 5h5v5M19 5l-8 8"></path>
                <path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"></path>
              </svg>
            </a>
          `;
        })
        .join("")
    : `<p class="author-link-empty">暂无讲解视频。更新 detail.txt 后点击“同步”。</p>`;
  const unmatchedMarkup = state.authorLinkUnmatched.length
    ? `<div class="author-unmatched">
        <span>未匹配资料</span>
        ${state.authorLinkUnmatched
          .map(
            (link) =>
              `<a href="${escapeHTML(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(link.name)} ↗</a>`
          )
          .join("")}
      </div>`
    : "";
  dom.authorLinksList.innerHTML = `${matchedMarkup}${unmatchedMarkup}`;

  const authorCount = Object.keys(state.authorLinks).length;
  const linkCount = Object.values(state.authorLinks).reduce((total, items) => total + items.length, 0);
  dom.authorLinksStatus.textContent = `已匹配 ${authorCount} 位作者、${linkCount} 个视频`;
}

async function syncAuthorLinksFromText() {
  const button = dom.syncAuthorLinks;
  const originalHTML = button.innerHTML;
  button.disabled = true;
  button.textContent = "同步中…";
  try {
    const response = await fetch(`./detail.txt?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = parseAuthorLinkText(await response.text());
    applyAuthorLinkData(parsed);
    try {
      localStorage.setItem(AUTHOR_LINKS_STORAGE, JSON.stringify(parsed));
    } catch {}
    renderAuthorLinks(state.currentAuthor);
    showToast(
      parsed.unmatched.length
        ? `已匹配 ${parsed.matchedCount} 条链接，${parsed.unmatched.length} 条未匹配`
        : `已同步 ${parsed.matchedCount} 条作者讲解链接`
    );
  } catch (error) {
    console.error(error);
    showToast("detail.txt 同步失败，请确认文件可访问");
  } finally {
    button.disabled = false;
    button.innerHTML = originalHTML;
  }
}

function renderRouteList(author) {
  dom.routeList.innerHTML = author.route
    .map((stop, index) => {
      const works = getStopWorks(stop);
      const count = works.length;
      return `
        <li class="route-item">
          <button
            class="route-stop${index === 0 ? " is-active" : ""}${count ? " has-works" : ""}"
            type="button"
            data-stop-index="${index}"
            aria-label="${escapeHTML(stop.name)}，${escapeHTML(stop.year)}${count ? `，有 ${count} 篇诗文` : "，暂无关联诗文"}"
          >
            <span class="route-number">${String(index + 1).padStart(2, "0")}</span>
            <span class="route-copy">
              <strong>${escapeHTML(stop.name)}</strong>
              <small>${escapeHTML(stop.year)} · ${escapeHTML(stop.modern)}</small>
              <em class="route-purpose">行旅：${escapeHTML(stop.purpose || "行旅与交游")}</em>
            </span>
            ${count ? `<span class="route-work-count">诗 · ${count} 篇</span>` : ""}
          </button>
        </li>
      `;
    })
    .join("");
  renderLooseWorks(author);
}

function getStopWorks(stop) {
  return (stop.workIds || []).map((id) => state.worksById.get(id)).filter(Boolean);
}

function renderLooseWorks(author) {
  const works = (author.looseWorkIds || []).map((id) => state.worksById.get(id)).filter(Boolean);
  dom.authorLooseWorks.innerHTML = works.length
    ? `<p class="loose-works-label">无固定地点的关联篇目</p>${works
        .map(
          (work) =>
            `<button class="author-loose-work" type="button" data-loose-work="${escapeHTML(work.id)}">${escapeHTML(work.title)} · ${escapeHTML(work.place.name)}</button>`
        )
        .join("")}`
    : "";
}

function renderAuthorRoute(author) {
  const map = initAuthorMap();
  if (!map) return;

  dom.authorLoading.hidden = false;
  clearAuthorLayers();

  const coordinates = author.route.map((stop) => [Number(stop.lat), Number(stop.lng)]);

  state.layers.authorRouteShadow = L.polyline(coordinates, {
    color: "#ac8c57",
    weight: 2,
    opacity: 0.55,
    dashArray: "5 7",
    lineJoin: "round",
    lineCap: "round"
  }).addTo(map);

  state.layers.authorRouteProgress = L.polyline([], {
    color: author.accent || "#9b3d2f",
    weight: 2.8,
    opacity: 0.9,
    lineJoin: "round",
    lineCap: "round"
  }).addTo(map);

  state.authorMarkers = author.route.map((stop, index) => {
    const works = getStopWorks(stop);
    const hasWorks = works.length > 0;
    const iconSize = hasWorks ? 38 : 30;
    const icon = L.divIcon({
      className: "journey-div-icon",
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize / 2, iconSize / 2],
      html: `
        <div class="journey-marker${hasWorks ? " has-works" : ""}" aria-hidden="true">
          <span>${String(index + 1).padStart(2, "0")}</span>
          ${hasWorks ? `<span class="journey-marker-poem">诗</span>` : ""}
        </div>
      `
    });
    const marker = L.marker([Number(stop.lat), Number(stop.lng)], {
      icon,
      title: `${index + 1}. ${stop.name}${hasWorks ? ` · ${works.length} 篇诗文` : ""}`,
      keyboard: true,
      zIndexOffset: hasWorks ? 220 : 0
    }).addTo(map);
    marker.on("click", () => setStop(index, { fly: true }));
    return marker;
  });

  state.authorMapRendered = true;
  const bounds = L.latLngBounds(coordinates);
  map.fitBounds(bounds, {
    paddingTopLeft: [60, 90],
    paddingBottomRight: [60, 100],
    maxZoom: 5.8
  });
  setStop(0, { fly: false, immediate: true });
  dom.authorLoading.hidden = true;
}

function clearAuthorLayers() {
  const map = state.maps.author;
  if (!map) return;
  state.authorMarkers.forEach((marker) => marker.remove());
  [state.layers.authorRouteShadow, state.layers.authorRouteProgress, state.layers.authorMarkers].forEach((layer) => {
    if (layer) layer.remove();
  });
  state.layers.authorRouteShadow = null;
  state.layers.authorRouteProgress = null;
  state.layers.authorMarkers = null;
  state.authorMarkers = [];
}

function setStop(index, options = {}) {
  const author = state.currentAuthor;
  if (!author) return;
  const safeIndex = Math.max(0, Math.min(index, author.route.length - 1));
  const stop = author.route[safeIndex];
  const previousIndex = state.currentStopIndex;

  state.currentStopIndex = safeIndex;
  state.lastStopIndex = safeIndex;

  $$(".route-stop", dom.routeList).forEach((button, buttonIndex) => {
    const active = buttonIndex === safeIndex;
    button.classList.toggle("is-active", active);
    if (active && options.scrollSidebar !== false && window.innerWidth > 900) {
      button.scrollIntoView({ behavior: REDUCED_MOTION ? "auto" : "smooth", block: "nearest" });
    }
  });

  state.authorMarkers.forEach((marker, markerIndex) => {
    const element = marker.getElement()?.querySelector(".journey-marker");
    if (!element) return;
    element.classList.toggle("is-active", markerIndex === safeIndex);
    element.classList.toggle("is-visited", markerIndex < safeIndex);
  });

  updateJourneyCard(stop, safeIndex);
  updateTravelLine(safeIndex, previousIndex, options.immediate);

  if (options.fly !== false && state.maps.author) {
    state.maps.author.flyTo([Number(stop.lat), Number(stop.lng)], Math.max(state.maps.author.getZoom(), 5.3), {
      duration: REDUCED_MOTION ? 0 : 0.85
    });
  }
}

function updateTravelLine(index, previousIndex, immediate = false) {
  const author = state.currentAuthor;
  const line = state.layers.authorRouteProgress;
  if (!author || !line) return;

  window.cancelAnimationFrame(state.travelFrame);
  state.travelToken += 1;
  const token = state.travelToken;
  const before = author.route.slice(0, index).map((stop) => [Number(stop.lat), Number(stop.lng)]);

  if (index === 0) {
    line.setLatLngs([]);
    return;
  }

  if (REDUCED_MOTION || immediate || index < previousIndex) {
    line.setLatLngs(author.route.slice(0, index + 1).map((stop) => [Number(stop.lat), Number(stop.lng)]));
    return;
  }

  const from = author.route[index - 1];
  const to = author.route[index];
  const start = performance.now();
  const duration = 680;

  const frame = (now) => {
    if (token !== state.travelToken) return;
    const raw = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - raw, 3);
    const lat = Number(from.lat) + (Number(to.lat) - Number(from.lat)) * eased;
    const lng = Number(from.lng) + (Number(to.lng) - Number(from.lng)) * eased;
    line.setLatLngs([...before, [lat, lng]]);
    if (raw < 1) {
      state.travelFrame = window.requestAnimationFrame(frame);
    } else {
      line.setLatLngs([...before, [Number(to.lat), Number(to.lng)]]);
    }
  };
  state.travelFrame = window.requestAnimationFrame(frame);
}

function updateJourneyCard(stop, index) {
  const works = getStopWorks(stop);
  dom.journeyCard.classList.toggle("has-works", works.length > 0);
  dom.journeyCard.classList.add("is-changing");
  dom.journeyIndex.textContent = String(index + 1).padStart(2, "0");
  dom.journeyYear.textContent = stop.year;
  dom.journeyPlace.textContent = stop.name;
  dom.journeyAncient.textContent = `古称 ${stop.ancient} · 今 ${stop.modern}`;
  dom.journeyPurpose.textContent = `此行缘由：${stop.purpose || "行旅与交游"}`;
  dom.journeyStory.textContent = stop.story;

  dom.journeyWorks.innerHTML = works.length
    ? works
        .map(
          (work) => `
            <button class="journey-work-link" type="button" data-journey-work="${escapeHTML(work.id)}">
              ${escapeHTML(work.title)}
            </button>
          `
        )
        .join("")
    : `<span class="journey-empty">此行未绑定课内篇目</span>`;

  window.setTimeout(() => dom.journeyCard.classList.remove("is-changing"), 80);
}

function buildSearchItems(query) {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return [];

  const authorMatches = state.data.authors
    .filter((author) => {
      const haystack = normalizeSearch(`${author.name}${author.alias}${author.era}`);
      return haystack.includes(normalizedQuery);
    })
    .map((author) => ({
      type: "author",
      id: author.id,
      title: author.name,
      subtitle: `${author.era} · ${author.route.length} 处行迹`,
      tag: "作者",
      exact: normalizeSearch(author.name) === normalizedQuery ? 2 : 1
    }));

  const routedAuthorNames = new Set(state.data.authors.map((author) => author.name));
  const otherAuthors = new Map();
  state.data.works.forEach((work) => {
    if (routedAuthorNames.has(work.author)) return;
    const normalizedName = normalizeSearch(work.author);
    if (!normalizedName.includes(normalizedQuery)) return;
    if (!otherAuthors.has(work.author)) {
      otherAuthors.set(work.author, {
        type: "work",
        id: work.id,
        title: work.author,
        subtitle: `${work.dynasty} · 可定位至《${work.title.replace(/[《》]/g, "")}》`,
        tag: "作者",
        exact: normalizedName === normalizedQuery ? 2 : 1
      });
    }
  });

  const workMatches = state.data.works
    .filter((work) => {
      const haystack = normalizeSearch(
        `${work.title}${work.author}${work.dynasty}${work.place.name}${work.place.ancient}${work.place.modern}`
      );
      return haystack.includes(normalizedQuery);
    })
    .map((work) => ({
      type: "work",
      id: work.id,
      title: work.title,
      subtitle: `${work.author} · ${work.dynasty} · ${work.place.name}`,
      tag: work.levelLabel.replace("必考", ""),
      exact: normalizeSearch(work.title) === normalizedQuery ? 2 : 1
    }));

  const regimeMatches = (state.eraData?.dynasties || [])
    .filter((dynasty) => normalizeSearch(dynasty.name).includes(normalizedQuery))
    .map((dynasty) => ({
      type: "regime",
      id: dynasty.name,
      title: dynasty.name,
      subtitle: `${dynasty.start < 0 ? "前" : ""}${Math.abs(dynasty.start)}—${dynasty.end} · ${dynasty.events?.length || 0} 件大事`,
      tag: "时代",
      exact: normalizeSearch(dynasty.name) === normalizedQuery ? 2 : 1
    }));

  const eventMatches = state.historyEvents
    .filter((event) => {
      const haystack = normalizeSearch(`${event.title}${event.summary}${event.year}${event.type}`);
      return haystack.includes(normalizedQuery);
    })
    .map((event) => ({
      type: "event",
      id: event.id,
      title: event.title,
      subtitle: `${event.year} · ${event.type}`,
      tag: "大事",
      exact: normalizeSearch(event.title) === normalizedQuery ? 2 : 1
    }));

  return [...authorMatches, ...otherAuthors.values(), ...regimeMatches, ...eventMatches, ...workMatches]
    .sort((a, b) => b.exact - a.exact || a.title.length - b.title.length)
    .slice(0, 20);
}

function renderSearch(query) {
  const items = buildSearchItems(query);
  state.searchItems = items;
  state.searchIndex = -1;

  if (!query.trim()) {
    closeSearch();
    return;
  }

  if (!items.length) {
    dom.searchResults.innerHTML = `<div class="search-empty">没有找到相关篇目或作者<br>试试只输入人名、地名或篇名中的一个词</div>`;
    dom.searchResults.hidden = false;
    dom.searchInput.setAttribute("aria-expanded", "true");
    return;
  }

  dom.searchResults.innerHTML = items
    .map((item, index) => {
      const className = ["author", "event", "regime"].includes(item.type) ? ` ${item.type}` : "";
      const icon = { author: "人", work: "诗", event: "史", regime: "代" }[item.type] || "文";
      return `
        <button class="search-result" type="button" role="option" data-search-index="${index}" aria-selected="false">
          <span class="search-result-icon${className}">${icon}</span>
          <span class="search-result-copy">
            <strong>${escapeHTML(item.title)}</strong>
            <small>${escapeHTML(item.subtitle)}</small>
          </span>
          <span class="search-result-tag">${escapeHTML(item.tag)}</span>
        </button>
      `;
    })
    .join("");
  dom.searchResults.hidden = false;
  dom.searchInput.setAttribute("aria-expanded", "true");
}

function closeSearch() {
  dom.searchResults.hidden = true;
  dom.searchInput.setAttribute("aria-expanded", "false");
  state.searchIndex = -1;
}

function selectSearchItem(index) {
  const item = state.searchItems[index];
  if (!item) return;

  dom.searchInput.value = "";
  closeSearch();
  dom.searchInput.blur();

  if (item.type === "author") {
    switchModule("author");
    selectAuthor(item.id);
    showToast(`已展开 ${item.title} 的漫游路线`);
    return;
  }

  if (item.type === "regime") {
    switchModule("era");
    state.eraTimeline?.focusRegime(item.id, { openDetail: true });
    showToast(`已定位：${item.title}`);
    return;
  }

  if (item.type === "event") {
    switchModule("era");
    state.eraTimeline?.focusEvent(item.id, { openDetail: true });
    showToast(`已定位：${item.title}`);
    return;
  }

  const work = state.worksById.get(item.id);
  if (!work) return;
  if (!Number.isFinite(Number(work.place.lat)) || !Number.isFinite(Number(work.place.lng))) {
    openWork(work.id);
    return;
  }
  setLevelFilter("all");
  switchModule("dynasty");
  const dynastyIndex = state.data.dynasties.findIndex((dynasty) => dynasty.id === work.dynastyId);
  selectDynasty(dynastyIndex).then(() => {
    locateWork(work.id, { scrollMap: true });
    showToast(`已定位：${work.title}`);
  });
}

function updateSearchSelection(nextIndex) {
  if (!state.searchItems.length) return;
  const total = state.searchItems.length;
  state.searchIndex = (nextIndex + total) % total;
  $$(".search-result", dom.searchResults).forEach((result, index) => {
    const active = index === state.searchIndex;
    result.setAttribute("aria-selected", String(active));
    if (active) result.scrollIntoView({ block: "nearest" });
  });
}

function setDetailTab(tabName) {
  dom.detailTabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.detailTab === tabName));
  dom.detailPanes.forEach((pane) => pane.classList.toggle("is-active", pane.dataset.detailPane === tabName));
}

function getTargetOffset(entry, text) {
  const indices = [];
  let cursor = 0;
  while (cursor < text.length) {
    const index = text.indexOf(entry.term, cursor);
    if (index < 0) break;
    indices.push(index);
    cursor = index + Math.max(1, entry.term.length);
  }
  if (indices.length <= 1) return indices[0] ?? -1;
  if (entry.term === "学" && entry.sentence === "学学半") return indices[0];
  if (entry.term === "知" && entry.sentence.includes("是知也")) return indices.at(-1);
  return -1;
}

function findTongjiaMatches(text, entries) {
  const matches = [];
  entries.forEach((entry) => {
    const candidateTexts = [
      entry.sentence,
      entry.sentence.replace(/^.*?[：:]/, "").replace(/[”"]$/, ""),
      ...entry.sentence
        .split(/[，,。；;！？]/)
        .map((part) => part.trim())
        .filter((part) => part.includes(entry.term))
        .sort((a, b) => b.length - a.length)
    ];

    for (const candidate of [...new Set(candidateTexts.filter(Boolean))]) {
      let cursor = 0;
      while (cursor < text.length) {
        const sentenceStart = text.indexOf(candidate, cursor);
        if (sentenceStart < 0) break;
        const targetOffset = getTargetOffset(entry, candidate);
        if (targetOffset >= 0) {
          const start = sentenceStart + targetOffset;
          if (!matches.some((match) => start < match.end && start + entry.term.length > match.start)) {
            matches.push({ start, end: start + entry.term.length, entry });
          }
        }
        cursor = sentenceStart + Math.max(1, candidate.length);
      }
      if (matches.some((match) => match.entry === entry)) break;
    }

    if (!matches.some((match) => match.entry === entry)) {
      const indices = [];
      let cursor = 0;
      while (cursor < text.length) {
        const index = text.indexOf(entry.term, cursor);
        if (index < 0) break;
        indices.push(index);
        cursor = index + Math.max(1, entry.term.length);
      }
      if (indices.length === 1 && !matches.some((match) => indices[0] < match.end && indices[0] + entry.term.length > match.start)) {
        matches.push({ start: indices[0], end: indices[0] + entry.term.length, entry });
      }
    }
  });
  return matches.sort((a, b) => a.start - b.start);
}

function renderAnnotatedOriginal(work) {
  const entries = state.tongjiaByWork.get(work.id) || [];
  const matches = findTongjiaMatches(work.original, entries);
  let markup = "";
  let cursor = 0;
  matches.forEach((match) => {
    if (match.start < cursor) return;
    markup += escapeHTML(work.original.slice(cursor, match.start));
    const label = `${match.entry.term}通${match.entry.target}，${match.entry.meaning}`;
    markup += `<button class="tongjia-mark" type="button" data-tongjia-id="${escapeHTML(match.entry.id)}" aria-label="${escapeHTML(label)}" aria-expanded="false">${escapeHTML(work.original.slice(match.start, match.end))}</button>`;
    cursor = match.end;
  });
  markup += escapeHTML(work.original.slice(cursor));
  return { markup, count: matches.length };
}

function positionTongjiaPopover(anchor) {
  if (dom.tongjiaPopover.hidden || !anchor) return;
  if (window.matchMedia("(max-width: 680px)").matches) {
    dom.tongjiaPopover.style.left = "";
    dom.tongjiaPopover.style.top = "";
    return;
  }
  const rect = anchor.getBoundingClientRect();
  const popoverRect = dom.tongjiaPopover.getBoundingClientRect();
  const margin = 12;
  const left = Math.min(
    window.innerWidth - popoverRect.width - margin,
    Math.max(margin, rect.left + rect.width / 2 - popoverRect.width / 2)
  );
  let top = rect.bottom + 8;
  if (top + popoverRect.height > window.innerHeight - margin) {
    top = Math.max(margin, rect.top - popoverRect.height - 8);
  }
  dom.tongjiaPopover.style.left = `${left}px`;
  dom.tongjiaPopover.style.top = `${top}px`;
}

function showTongjiaPopover(entry, anchor) {
  if (state.tongjiaAnchor) state.tongjiaAnchor.setAttribute("aria-expanded", "false");
  state.tongjiaAnchor = anchor;
  anchor.setAttribute("aria-expanded", "true");
  dom.tongjiaSource.textContent = entry.term;
  dom.tongjiaTarget.textContent = entry.target;
  dom.tongjiaTargetNote.textContent = entry.targetNote ? `读 ${entry.targetNote}` : "";
  dom.tongjiaMeaning.textContent = entry.meaning;
  dom.tongjiaSentence.textContent = entry.sentence;
  dom.tongjiaTranslation.textContent = entry.translation;
  dom.tongjiaWork.textContent = state.activeWork ? state.activeWork.title : entry.sourceTitle;
  dom.tongjiaPopover.hidden = false;
  window.requestAnimationFrame(() => positionTongjiaPopover(anchor));
}

function hideTongjiaPopover({ restoreFocus = false } = {}) {
  if (dom.tongjiaPopover.hidden) return;
  const anchor = state.tongjiaAnchor;
  if (anchor) anchor.setAttribute("aria-expanded", "false");
  state.tongjiaAnchor = null;
  dom.tongjiaPopover.hidden = true;
  if (restoreFocus && anchor) anchor.focus({ preventScroll: true });
}

function openWork(workId) {
  const work = state.worksById.get(workId);
  if (!work) return;
  hideTongjiaPopover();
  if (state.activeModal === "chronicle") {
    dom.chronicleModal.hidden = true;
    state.activeModal = null;
  }
  state.activeWork = work;

  dom.workModalEyebrow.textContent = `${work.dynasty} · ${work.levelLabel}`;
  dom.workModalTitle.textContent = work.title;
  dom.workModalByline.textContent = `${work.author} · ${work.year}${work.textbook ? ` · ${work.textbook}` : ""}`;
  dom.workModalPlace.textContent = work.place.name;
  dom.workModalModern.textContent = work.place.modern;
  dom.locateWorkOnMap.hidden = !(
    Number.isFinite(Number(work.place.lat)) && Number.isFinite(Number(work.place.lng))
  );
  dom.workOriginalLabel.textContent = work.title.includes("节选") ? "节选" : "全篇";
  const annotatedOriginal = renderAnnotatedOriginal(work);
  dom.workModalOriginal.innerHTML = annotatedOriginal.markup;
  dom.workTongjiaCount.hidden = annotatedOriginal.count === 0;
  dom.workTongjiaCount.textContent = `${annotatedOriginal.count} 个通假字`;
  dom.workModalTranslation.textContent = work.translation;
  dom.workModalBackground.textContent = work.background;
  dom.workModalSource.textContent = [work.place.note, work.sourceNote, state.data.meta.textbookNotice]
    .filter(Boolean)
    .join(" ");
  dom.workModalLevel.className = `level-badge ${work.level}`;
  dom.workModalLevel.textContent = work.levelLabel;

  dom.workModalAnnotations.innerHTML = (work.annotations || [])
    .map(
      (annotation) => `
        <div class="annotation-item">
          <dt>${escapeHTML(annotation.term)}</dt>
          <dd>${escapeHTML(annotation.note)}</dd>
        </div>
      `
    )
    .join("");

  const author = state.data.authors.find((item) => item.id === work.authorId);
  const hasRouteStop = Boolean(author?.route?.some((stop) => (stop.workIds || []).includes(work.id)));
  dom.openAuthorJourney.hidden = !author || !hasRouteStop;

  setDetailTab("text");
  dom.workModal.hidden = false;
  state.activeModal = "work";
  setBodyLock(true);
  $(".work-dialog-body").scrollTop = 0;
  $(".modal-close", dom.workModal).focus({ preventScroll: true });
}

function closeModal(modalName) {
  if (modalName === "work") hideTongjiaPopover();
  if (modalName === "event") {
    dom.eventModal.hidden = true;
    state.activeEvent = null;
    const returnModal = state.returnModal;
    state.returnModal = null;
    if (returnModal === "chronicle" && !dom.chronicleModal.hidden) {
      state.activeModal = "chronicle";
      setBodyLock(true);
      $(".modal-close", dom.chronicleModal).focus({ preventScroll: true });
      return;
    }
    state.activeModal = null;
    setBodyLock(false);
    return;
  }
  if (modalName === "work") {
    dom.workModal.hidden = true;
    state.activeModal = null;
  }
  if (modalName === "about") {
    dom.aboutModal.hidden = true;
    state.activeModal = null;
  }
  if (modalName === "chronicle") {
    dom.chronicleModal.hidden = true;
    state.activeModal = null;
  }
  setBodyLock(false);
}

function openChronicle() {
  const dynasty = state.currentDynasty;
  const chronicle = state.data.chronicles?.[dynasty?.id];
  if (!dynasty || !chronicle?.events?.length) {
    showToast("该朝代的年表资料正在整理");
    return;
  }

  dom.chronicleTitle.textContent = `${dynasty.name} · 大事年表`;
  dom.chroniclePeriod.textContent = `${dynasty.period} · 都邑 ${dynasty.capital}`;
  dom.chronicleSeal.textContent = dynasty.name.slice(0, 1);
  dom.chronicleIntro.textContent = chronicle.intro;
  const relatedWorkCount = state.data.works.filter((work) => work.dynastyId === dynasty.id).length;
  dom.chronicleSummary.textContent = `地图范围：${dynasty.scale} · 本朝已关联 ${relatedWorkCount} 篇课内诗文`;

  const typeClasses = {
    王朝形成: "dynasty",
    王朝更替: "dynasty",
    战争: "war",
    制度: "system",
    政治: "politics",
    文化: "culture",
    文学: "literature",
    人物: "person"
  };

  dom.chronicleList.innerHTML = [...chronicle.events]
    .sort((a, b) => Number(a.yearSort) - Number(b.yearSort))
    .map((event) => {
      const relatedWorks = (event.workIds || []).map((id) => state.worksById.get(id)).filter(Boolean);
      return `
        <li class="chronicle-item">
          <div class="chronicle-axis">
            <span></span>
          </div>
          <div class="chronicle-event">
            <div class="chronicle-event-top">
              <time>${escapeHTML(event.year)}</time>
              <span class="event-type ${typeClasses[event.type] || "other"}">${escapeHTML(event.type)}</span>
            </div>
            <h4>${escapeHTML(event.title)}</h4>
            <p>${escapeHTML(event.summary)}</p>
            <button class="chronicle-event-expand" type="button" data-open-event="${escapeHTML(event.id)}">
              查看起因、过程与评价
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
            </button>
            ${
              relatedWorks.length
                ? `<div class="chronicle-works">${relatedWorks
                    .map(
                      (work) =>
                        `<button class="chronicle-work-link" type="button" data-chronicle-work="${escapeHTML(work.id)}">${escapeHTML(work.title)}</button>`
                    )
                    .join("")}</div>`
                : ""
            }
          </div>
        </li>
      `;
    })
    .join("");

  dom.chronicleModal.hidden = false;
  state.activeModal = "chronicle";
  setBodyLock(true);
  $(".chronicle-body").scrollTop = 0;
  $(".modal-close", dom.chronicleModal).focus({ preventScroll: true });
}

function openHistoricalEvent(eventOrId) {
  const event =
    typeof eventOrId === "string"
      ? state.historyEventsById.get(eventOrId)
      : state.historyEventsById.get(eventOrId?.id) || eventOrId;
  if (!event) {
    showToast("暂未找到该历史事件资料");
    return;
  }

  state.returnModal = state.activeModal && state.activeModal !== "event" ? state.activeModal : null;
  state.activeEvent = event;
  const detail = event.detail || {};
  dom.eventModalEyebrow.textContent = `历史事件 · ${event.type || "时代档案"}`;
  dom.eventModalTitle.textContent = event.title;
  dom.eventModalMeta.textContent = `${event.year} · ${(event.sources || []).join(" / ")}`;
  dom.eventModalSeal.textContent = event.type?.includes("战争") ? "战" : event.type?.slice(0, 1) || "史";
  dom.eventModalSummary.textContent = event.summary;
  dom.eventModalSources.textContent = detail.curated
    ? "事件解读：依据通行教材叙事整理，供课堂辅助阅读。"
    : "事件解读：由现有年表概述生成，细节可结合教材与史料继续研读。";
  dom.eventModalCause.textContent = detail.cause || "";
  dom.eventModalProcess.textContent = detail.process || event.summary;
  dom.eventModalResult.textContent = detail.result || "";
  dom.eventModalSignificance.textContent = detail.significance || "";
  dom.eventModalEvaluation.textContent = detail.evaluation || "";

  const relatedWorks = (event.workIds || []).map((id) => state.worksById.get(id)).filter(Boolean);
  dom.eventRelatedSection.hidden = !relatedWorks.length;
  dom.eventModalWorks.innerHTML = relatedWorks
    .map(
      (work) =>
        `<button class="event-work-link" type="button" data-event-work="${escapeHTML(work.id)}">
          <span>${escapeHTML(work.title)}</span>
          <small>${escapeHTML(work.author)} · ${escapeHTML(work.levelLabel)}</small>
        </button>`
    )
    .join("");

  dom.eventModal.hidden = false;
  state.activeModal = "event";
  setBodyLock(true);
  $(".event-dialog-body").scrollTop = 0;
  $(".modal-close", dom.eventModal).focus({ preventScroll: true });
}

function openAbout() {
  loadVisitorCount(true);
  dom.aboutModal.hidden = false;
  state.activeModal = "about";
  setBodyLock(true);
  $(".modal-close", dom.aboutModal).focus({ preventScroll: true });
}

function openActiveAuthorJourney() {
  const work = state.activeWork;
  if (!work) return;
  const author = state.data.authors.find((item) => item.id === work.authorId);
  if (!author) return;
  const stopIndex = author.route.findIndex((stop) => (stop.workIds || []).includes(work.id));
  closeModal("work");
  switchModule("author");
  selectAuthor(author.id);
  window.requestAnimationFrame(() => {
    window.setTimeout(() => setStop(stopIndex >= 0 ? stopIndex : 0, { fly: true }), 140);
  });
}

function openEraAuthor(authorId) {
  const author = state.data.authors.find((item) => item.id === authorId);
  if (!author) return;
  switchModule("author");
  selectAuthor(author.id);
  showToast(`已展开 ${author.name} 的漫游路线`);
}

function selectNearestSnapshot(year) {
  if (!state.atlasSnapshots.length) return;
  const candidates = state.atlasSnapshots.filter(
    (snapshot) => snapshot.year >= state.timelineViewStart && snapshot.year <= state.timelineViewEnd
  );
  const snapshot = [...(candidates.length ? candidates : state.atlasSnapshots)].sort(
    (a, b) => Math.abs(a.year - Number(year)) - Math.abs(b.year - Number(year))
  )[0];
  selectDynasty(snapshot.dynastyIndex, { snapshotId: snapshot.id });
}

function moveSnapshot(delta) {
  if (!state.atlasSnapshots.length) return;
  const currentIndex = state.atlasSnapshots.findIndex(
    (snapshot) => snapshot.id === state.currentSnapshot?.id
  );
  const nextIndex = Math.max(
    0,
    Math.min(state.atlasSnapshots.length - 1, (currentIndex < 0 ? 0 : currentIndex) + delta)
  );
  const snapshot = state.atlasSnapshots[nextIndex];
  selectDynasty(snapshot.dynastyIndex, { snapshotId: snapshot.id });
}

function bindGlobalEvents() {
  dom.moduleTabs.forEach((tab) => {
    tab.addEventListener("click", () => switchModule(tab.dataset.module));
  });

  $$("[data-seo-module]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      switchModule(link.dataset.seoModule);
      document.querySelector(".app-shell")?.scrollIntoView({
        behavior: REDUCED_MOTION ? "auto" : "smooth",
        block: "start"
      });
    });
  });

  let timelineSelectionTimer = null;
  dom.timelineRange.addEventListener("input", (event) => {
    window.clearTimeout(timelineSelectionTimer);
    const year = Number(event.target.value);
    timelineSelectionTimer = window.setTimeout(() => selectNearestSnapshot(year), 90);
  });
  dom.timelinePhases.addEventListener("click", (event) => {
    const button = event.target.closest("[data-snapshot-id]");
    if (button) selectSnapshot(button.dataset.snapshotId);
  });
  dom.timelineDots.addEventListener("click", (event) => {
    const button = event.target.closest(".timeline-dot");
    if (button) {
      const dynastyIndex = Number(button.dataset.index);
      const dynasty = state.data.dynasties[dynastyIndex];
      const defaultYear = Number(dynasty.atlasPeriod?.defaultYear ?? dynasty.snapshots[0]?.year);
      selectDynasty(dynastyIndex, { snapshotYear: defaultYear });
    }
  });
  dom.dynastySnapshots.addEventListener("click", (event) => {
    const button = event.target.closest("[data-snapshot-id]");
    if (button) selectSnapshot(button.dataset.snapshotId);
  });
  dom.prevDynasty.addEventListener("click", () => moveSnapshot(-1));
  dom.nextDynasty.addEventListener("click", () => moveSnapshot(1));
  dom.timelineZoomIn.addEventListener("click", () => zoomTimeline(true));
  dom.timelineZoomOut.addEventListener("click", () => zoomTimeline(false));
  dom.timelineZoomReset.addEventListener("click", () => {
    const bounds = getTimelineGlobalBounds();
    setTimelineView(bounds.start, bounds.end);
  });
  $(".timeline-rail").addEventListener("dblclick", () => {
    const bounds = getTimelineGlobalBounds();
    setTimelineView(bounds.start, bounds.end);
  });
  $(".timeline-rail").addEventListener(
    "wheel",
    (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      zoomTimeline(event.deltaY < 0);
    },
    { passive: false }
  );
  dom.mapLayerButton.addEventListener("click", () => {
    const open = dom.mapLayerButton.getAttribute("aria-expanded") === "true";
    dom.mapLayerButton.setAttribute("aria-expanded", String(!open));
    dom.mapLayerPanel.hidden = open;
  });
  dom.mapLayerInputs.forEach((input) => {
    input.addEventListener("change", () => {
      state.mapLayers[input.dataset.mapLayer] = input.checked;
      applyMapLayers();
    });
  });

  dom.filterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      setLevelFilter(chip.dataset.level);
    });
  });

  dom.chronicleButton.addEventListener("click", openChronicle);
  dom.mapChronicleButton.addEventListener("click", openChronicle);
  dom.chronicleList.addEventListener("click", (event) => {
    const eventButton = event.target.closest("[data-open-event]");
    const workButton = event.target.closest("[data-chronicle-work]");
    if (eventButton) {
      openHistoricalEvent(eventButton.dataset.openEvent);
      return;
    }
    if (workButton) openWork(workButton.dataset.chronicleWork);
  });

  dom.eventModalWorks.addEventListener("click", (event) => {
    const workButton = event.target.closest("[data-event-work]");
    if (!workButton) return;
    closeModal("event");
    openWork(workButton.dataset.eventWork);
  });

  dom.placeToggle.addEventListener("click", () => {
    const open = dom.placeToggle.getAttribute("aria-expanded") === "true";
    dom.placeToggle.setAttribute("aria-expanded", String(!open));
    dom.placeCompare.classList.toggle("is-open", !open);
  });

  dom.worksList.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-open-work]");
    const locateButton = event.target.closest("[data-locate-work]");
    const clearLevelButton = event.target.closest("[data-clear-level]");
    if (openButton) openWork(openButton.dataset.openWork);
    if (locateButton) locateWork(locateButton.dataset.locateWork, { scrollMap: true });
    if (clearLevelButton) setLevelFilter("all");
  });

  dom.authorPicker.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-author-id]");
    if (chip) selectAuthor(chip.dataset.authorId);
  });

  dom.authorFilter.addEventListener("input", () => renderAuthorPicker(dom.authorFilter.value));
  dom.syncAuthorLinks.addEventListener("click", syncAuthorLinksFromText);

  dom.routeList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-stop-index]");
    if (!button) return;
    setStop(Number(button.dataset.stopIndex), { fly: true });
  });

  dom.journeyWorks.addEventListener("click", (event) => {
    const button = event.target.closest("[data-journey-work]");
    if (button) openWork(button.dataset.journeyWork);
  });

  dom.authorLooseWorks.addEventListener("click", (event) => {
    const button = event.target.closest("[data-loose-work]");
    if (button) openWork(button.dataset.looseWork);
  });

  dom.authorArchiveWorks.addEventListener("click", (event) => {
    const button = event.target.closest("[data-author-archive-work]");
    if (button) openWork(button.dataset.authorArchiveWork);
  });

  dom.searchInput.addEventListener("input", (event) => renderSearch(event.target.value));
  dom.searchInput.addEventListener("focus", () => {
    if (dom.searchInput.value.trim()) renderSearch(dom.searchInput.value);
  });
  dom.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      updateSearchSelection(state.searchIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      updateSearchSelection(state.searchIndex - 1);
    } else if (event.key === "Enter" && state.searchIndex >= 0) {
      event.preventDefault();
      selectSearchItem(state.searchIndex);
    } else if (event.key === "Escape") {
      closeSearch();
      dom.searchInput.blur();
    }
  });

  dom.searchResults.addEventListener("click", (event) => {
    const result = event.target.closest("[data-search-index]");
    if (result) selectSearchItem(Number(result.dataset.searchIndex));
  });

  document.addEventListener("click", (event) => {
    if (!dom.searchRoot.contains(event.target)) closeSearch();
    if (!dom.emailPopover.hidden && !event.target.closest(".header-actions")) {
      closeEmailPopover();
    }
    if (!event.target.closest(".map-layer-control")) {
      dom.mapLayerButton.setAttribute("aria-expanded", "false");
      dom.mapLayerPanel.hidden = true;
    }
    if (
      !dom.tongjiaPopover.hidden &&
      !dom.tongjiaPopover.contains(event.target) &&
      !event.target.closest(".tongjia-mark")
    ) {
      hideTongjiaPopover();
    }
  });

  dom.workModalOriginal.addEventListener("click", (event) => {
    const mark = event.target.closest("[data-tongjia-id]");
    if (!mark) return;
    const entry = state.tongjiaEntriesById.get(mark.dataset.tongjiaId);
    if (entry) showTongjiaPopover(entry, mark);
  });
  dom.tongjiaPopoverClose.addEventListener("click", () => hideTongjiaPopover({ restoreFocus: true }));
  $(".work-dialog-body").addEventListener("scroll", () => hideTongjiaPopover());

  dom.detailTabs.forEach((tab) => {
    tab.addEventListener("click", () => setDetailTab(tab.dataset.detailTab));
  });

  $$("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => closeModal(button.dataset.closeModal));
  });

  dom.locateWorkOnMap.addEventListener("click", () => {
    const work = state.activeWork;
    if (!work) return;
    closeModal("work");
    switchModule("dynasty");
    const index = state.data.dynasties.findIndex((dynasty) => dynasty.id === work.dynastyId);
    selectDynasty(index).then(() => locateWork(work.id, { scrollMap: true }));
  });

  dom.openAuthorJourney.addEventListener("click", openActiveAuthorJourney);
  dom.aboutButton.addEventListener("click", openAbout);
  dom.emailContactButton.addEventListener("click", () => {
    setEmailPopoverOpen(dom.emailPopover.hidden);
  });
  dom.emailPopoverClose.addEventListener("click", () => closeEmailPopover({ restoreFocus: true }));
  dom.copyContactEmail.addEventListener("click", copyContactEmail);

  document.addEventListener("keydown", (event) => {
    const tag = document.activeElement?.tagName;
    const inInput = ["INPUT", "TEXTAREA", "SELECT"].includes(tag);

    if (event.key === "Tab" && state.activeModal) {
      const modal =
        state.activeModal === "work"
          ? dom.workModal
          : state.activeModal === "event"
            ? dom.eventModal
          : state.activeModal === "chronicle"
            ? dom.chronicleModal
            : dom.aboutModal;
      const focusable = $$(
        'button:not([disabled]):not([hidden]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        modal
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    if (event.key === "/" && !inInput) {
      event.preventDefault();
      dom.searchInput.focus();
      return;
    }

    if (event.key === "Escape") {
      if (!dom.emailPopover.hidden) {
        closeEmailPopover({ restoreFocus: true });
        return;
      }
      if (!dom.tongjiaPopover.hidden) {
        hideTongjiaPopover({ restoreFocus: true });
        return;
      }
      if (state.activeModal) {
        closeModal(state.activeModal);
        return;
      }
      if (!dom.searchResults.hidden) {
        closeSearch();
        dom.searchInput.blur();
      }
    }

    if (!state.activeModal && !inInput && state.module === "dynasty") {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveSnapshot(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveSnapshot(1);
      }
    }
  });

  window.addEventListener("resize", () => {
    state.maps.dynasty?.invalidateSize();
    state.maps.author?.invalidateSize();
  });
}

init();
