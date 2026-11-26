const DEFAULT_CONFIG = {
  startYear: -2100,
  endYear: 1950,
  pixelsPerYear: 2.3,
  minHeight: 36,
  minLaneWidth: 160,
  laneGap: 14,
  axisPadding: 80,
  rightPadding: 24
};

const escapeHTML = (value = "") =>
  String(value).replace(/[&<>"']/g, (character) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return entities[character];
  });

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[《》〈〉“”‘’（）()、，。；：！？·\s—…\-～~]/g, "");

const normalizeTitle = (value = "") =>
  normalizeText(value).replace(/(节选|其[一二三四五六七八九十百]+|之二|之三)$/g, "");

function formatYear(year) {
  const number = Number(year);
  if (number < 0) return `公元前${Math.abs(number)}年`;
  return `公元${number}年`;
}

function formatYearShort(year) {
  const number = Number(year);
  return number < 0 ? `前${Math.abs(number)}` : String(number);
}

function formatRange(start, end) {
  return `${formatYearShort(start)}—${formatYearShort(end)}`;
}

function getEventYear(event) {
  const sorted = Number(event?.yearSort);
  if (Number.isFinite(sorted)) return sorted;
  const matched = String(event?.year ?? "").match(/-?\d+/);
  return matched ? Number(matched[0]) : NaN;
}

function calculateLanes(dynasties) {
  const laneEnds = [];
  return [...dynasties]
    .sort((a, b) => Number(a.start) - Number(b.start))
    .map((dynasty, sourceIndex) => {
      let lane = laneEnds.findIndex((end) => Number(dynasty.start) >= end);
      if (lane < 0) {
        lane = laneEnds.length;
        laneEnds.push(Number(dynasty.end));
      } else {
        laneEnds[lane] = Number(dynasty.end);
      }
      return { ...dynasty, lane, sourceIndex };
    });
}

function distributeMarkerTops(items, height, { start = 30, minGap = 20, bottom = 28 } = {}) {
  const positioned = items
    .map((item, index) => ({ key: item.key ?? index, desired: item.desired, value: item.value }))
    .sort((a, b) => a.desired - b.desired || a.key - b.key);
  if (!positioned.length) return new Map();
  const available = Math.max(0, height - start - bottom);
  const gap = Math.min(minGap, available / Math.max(1, positioned.length - 1));
  let cursor = start;
  const result = new Map();
  positioned.forEach((item) => {
    const top = Math.min(height - bottom, Math.max(cursor, item.desired));
    result.set(item.key, top);
    cursor = top + gap;
  });
  return result;
}

export function createEraTimeline({
  data,
  showToast = () => {},
  resolveWork = () => null,
  resolveAuthor = () => null,
  openWork = () => {},
  openAuthor = () => {},
  openEvent = () => {}
}) {
  const module = document.querySelector("#eraModule");
  const scroll = document.querySelector("#eraTimelineScroll");
  const canvas = document.querySelector("#eraTimelineCanvas");
  const axis = document.querySelector("#eraYearAxis");
  const lanes = document.querySelector("#eraLanes");
  const emptyState = document.querySelector("#eraEmptyState");
  const dynastyCount = document.querySelector("#eraDynastyCount");
  const detail = document.querySelector("#eraDetail");
  const detailEyebrow = document.querySelector("#eraDetailEyebrow");
  const detailTitle = document.querySelector("#eraDetailTitle");
  const detailSubtitle = document.querySelector("#eraDetailSubtitle");
  const detailBody = document.querySelector("#eraDetailBody");
  const detailClose = document.querySelector("#eraDetailClose");
  const tooltip = document.querySelector("#eraTooltip");
  const tooltipDot = document.querySelector("#eraTooltipDot");
  const tooltipTitle = document.querySelector("#eraTooltipTitle");
  const tooltipTag = document.querySelector("#eraTooltipTag");
  const tooltipTime = document.querySelector("#eraTooltipTime");
  const tooltipBody = document.querySelector("#eraTooltipBody");
  const quickLinks = [...document.querySelectorAll("[data-era-year]")];

  if (!module || !scroll || !canvas || !axis || !lanes) {
    throw new Error("时代编年模块缺少必要的 DOM 节点");
  }

  const config = { ...DEFAULT_CONFIG, ...(data?.config || {}) };
  const dynasties = Array.isArray(data?.dynasties) ? data.dynasties : [];
  const processed = calculateLanes(dynasties);
  const totalYears = config.endYear - config.startYear;
  const totalHeight = Math.max(720, totalYears * config.pixelsPerYear);
  let rendered = false;
  let resizeTimer = null;
  let lastViewportWidth = 0;

  function renderTimeline() {
    if (!dynasties.length) {
      emptyState.hidden = false;
      lanes.innerHTML = "";
      axis.innerHTML = "";
      dynastyCount.textContent = "暂无可展示的时代资料";
      return;
    }

    const previousScrollTop = scroll.scrollTop;
    const laneCount = Math.max(1, ...processed.map((item) => item.lane + 1));
    const viewportWidth = scroll.clientWidth;
    const availableWidth = viewportWidth - config.axisPadding - config.rightPadding;
    const gapsWidth = Math.max(0, laneCount - 1) * config.laneGap;
    const laneWidth = Math.max(config.minLaneWidth, Math.floor((availableWidth - gapsWidth) / laneCount));
    const canvasWidth =
      config.axisPadding + laneCount * laneWidth + Math.max(0, laneCount - 1) * config.laneGap + config.rightPadding;

    canvas.style.setProperty("--era-axis-width", `${config.axisPadding}px`);
    canvas.style.setProperty("--era-lane-width", `${laneWidth}px`);
    canvas.style.width = `${Math.max(viewportWidth, canvasWidth)}px`;
    canvas.style.height = `${totalHeight}px`;
    emptyState.hidden = true;

    axis.innerHTML = renderYearAxis();
    lanes.innerHTML = `
      <div class="era-grid-lines" aria-hidden="true">${renderGridLines()}</div>
      ${processed.map((dynasty, index) => renderDynasty(dynasty, index, laneWidth)).join("")}
    `;
    resizeTooltipDismiss();
    scroll.scrollTop = previousScrollTop;
    dynastyCount.textContent = `并览 ${dynasties.length} 个时代 · ${new Set(
      dynasties.flatMap((dynasty) => (dynasty.authors || []).map((author) => author.name))
    ).size} 位作者`;
    rendered = true;
    lastViewportWidth = viewportWidth;
  }

  function renderYearAxis() {
    const ticks = [];
    const step = 50;
    const firstTick = Math.ceil(config.startYear / step) * step;
    for (let year = firstTick; year <= config.endYear; year += step) {
      const top = (year - config.startYear) * config.pixelsPerYear;
      const major = year % 100 === 0;
      ticks.push(`
        <div class="era-axis-tick${major ? " is-major" : ""}" style="top:${top}px">
          <span>${formatYearShort(year)}</span>
        </div>
      `);
    }
    return ticks.join("");
  }

  function renderGridLines() {
    const lines = [];
    const step = 50;
    const firstTick = Math.ceil(config.startYear / step) * step;
    for (let year = firstTick; year <= config.endYear; year += step) {
      const top = (year - config.startYear) * config.pixelsPerYear;
      lines.push(`<i class="${year % 100 === 0 ? "is-major" : ""}" style="top:${top}px"></i>`);
    }
    return lines.join("");
  }

  function renderDynasty(dynasty, index, laneWidth) {
    const top = (Number(dynasty.start) - config.startYear) * config.pixelsPerYear;
    const rawHeight = (Number(dynasty.end) - Number(dynasty.start)) * config.pixelsPerYear;
    const height = Math.max(config.minHeight, rawHeight);
    const left = dynasty.lane * (laneWidth + config.laneGap);
    const events = Array.isArray(dynasty.events) ? dynasty.events : [];
    const authors = Array.isArray(dynasty.authors) ? dynasty.authors : [];
    const canShowEvent = height >= 44;
    const canShowAuthor = height >= 54 && authors.length > 0;
    const eventTops = distributeMarkerTops(
      events
        .map((event, eventIndex) => ({
          key: eventIndex,
          eventIndex,
          value: event,
          desired: (getEventYear(event) - Number(dynasty.start)) * config.pixelsPerYear
        }))
        .filter(
          ({ value }) =>
            getEventYear(value) >= Number(dynasty.start) && getEventYear(value) <= Number(dynasty.end)
        ),
      height,
      { start: 31, minGap: 15, bottom: 30 }
    );
    const authorTops = distributeMarkerTops(
      authors.map((author, authorIndex) => ({
        key: authorIndex,
        authorIndex,
        value: author,
        desired: (Number(author.start) - Number(dynasty.start)) * config.pixelsPerYear
      })),
      height,
      { start: 32, minGap: 21, bottom: 27 }
    );

    return `
      <section
        class="era-regime${height < 44 ? " is-short" : ""}"
        data-era-regime="${index}"
        data-era-search="${escapeHTML(
          normalizeText(
            [
              dynasty.name,
              ...events.flatMap((event) => [event.title, event.desc]),
              ...authors.flatMap((author) => [author.name, author.bio, ...(author.works || []), author.context]),
              ...(dynasty.poetry || []).flatMap((poem) => [poem.title, poem.author, poem.content])
            ].join("")
          )
        )}"
        style="--era-accent:${escapeHTML(dynasty.color || "#9b3d2f")};top:${top}px;left:${left}px;width:${laneWidth}px;height:${height}px"
      >
        <button class="era-regime-head" type="button" data-era-open-regime="${index}" aria-label="查看${escapeHTML(dynasty.name)}详情">
          <span class="era-regime-name">${escapeHTML(dynasty.name)}</span>
          <span class="era-regime-years">${formatRange(dynasty.start, dynasty.end)}</span>
        </button>
        ${
          canShowEvent
            ? `<div class="era-event-stack">${events
                .map((event, eventIndex) => ({ event, eventIndex }))
                .filter(
                  ({ event }) =>
                    getEventYear(event) >= Number(dynasty.start) && getEventYear(event) <= Number(dynasty.end)
                )
                .map(({ event, eventIndex }) => {
                  const relativeTop = eventTops.get(eventIndex) ?? 30;
                  return `
                    <button
                      class="era-event-pin"
                      type="button"
                      data-era-open-event="${escapeHTML(event.id || "")}"
                      data-era-event-index="${eventIndex}"
                      style="top:${relativeTop}px"
                      aria-label="${escapeHTML(formatYear(getEventYear(event)))}，${escapeHTML(event.title)}"
                    >
                      <i></i>
                      <span>${escapeHTML(event.title)}</span>
                    </button>
                  `;
                })
                .join("")}</div>`
            : events.length
              ? `<div class="era-compact-events" aria-label="${escapeHTML(dynasty.name)}历史大事">
                  ${events
                    .map(
                      (event, eventIndex) => `
                        <button
                          class="era-event-pin is-compact"
                          type="button"
                          data-era-open-event="${escapeHTML(event.id || "")}"
                          data-era-event-index="${eventIndex}"
                          aria-label="${escapeHTML(formatYear(getEventYear(event)))}，${escapeHTML(event.title)}"
                        ><i></i><span class="sr-only">${escapeHTML(event.title)}</span></button>
                      `
                    )
                    .join("")}
                </div>`
              : ""
        }
        ${
          canShowAuthor
            ? `<div class="era-author-stack">${authors
                .map((author, authorIndex) => {
                  const relativeTop = authorTops.get(authorIndex) ?? 32;
                  return `
                    <button
                      class="era-author-pin"
                      type="button"
                      data-era-open-author="${index}"
                      data-era-author-index="${authorIndex}"
                      style="top:${relativeTop}px"
                      aria-label="查看${escapeHTML(author.name)}生平"
                    >
                      <i></i>
                      <span>${escapeHTML(author.name)}</span>
                    </button>
                  `;
                })
                .join("")}</div>`
            : authors.length
              ? `<div class="era-compact-authors" aria-label="${escapeHTML(dynasty.name)}课内作者">
                  ${authors
                    .map(
                      (author, authorIndex) => `
                        <button
                          class="era-author-pin is-compact"
                          type="button"
                          data-era-open-author="${index}"
                          data-era-author-index="${authorIndex}"
                          aria-label="查看${escapeHTML(author.name)}生平"
                        ><i></i><span class="sr-only">${escapeHTML(author.name)}</span></button>
                      `
                    )
                    .join("")}
                </div>`
              : ""
        }
        <span class="era-regime-duration">${dynasty.end - dynasty.start}年</span>
      </section>
    `;
  }

  function getDynasty(index) {
    return processed[Number(index)] || null;
  }

  function openRegime(index) {
    const dynasty = getDynasty(index);
    if (!dynasty) return;
    const eventCount = dynasty.events?.length || 0;
    const authorCount = dynasty.authors?.length || 0;
    const poemCount = dynasty.poetry?.length || 0;

    detailEyebrow.textContent = "时代档案 · 王朝与文学";
    detailTitle.textContent = dynasty.name;
    detailSubtitle.textContent = `${formatYear(dynasty.start)}—${formatYear(dynasty.end)} · 延续 ${dynasty.end - dynasty.start} 年`;
    detailBody.innerHTML = `
      <section class="era-detail-lead">
        <p>${escapeHTML(buildDynastySummary(dynasty))}</p>
        <div class="era-detail-stats">
          <span><strong>${eventCount}</strong>件大事</span>
          <span><strong>${authorCount}</strong>位作者</span>
          <span><strong>${poemCount}</strong>篇诗文</span>
        </div>
      </section>

      <section class="era-detail-section">
        <div class="era-detail-section-head">
          <p class="eyebrow">按年代递进</p>
          <h3>历史大事</h3>
        </div>
        ${
          eventCount
            ? `<ol class="era-detail-events">${[...dynasty.events]
                .sort((a, b) => getEventYear(a) - getEventYear(b))
                .map(
                  (event) => `
                    <li>
                      <button type="button" class="era-detail-event" data-era-event-id="${escapeHTML(event.id || "")}">
                        <time>${formatYearShort(getEventYear(event))}</time>
                        <div>
                          <strong>${escapeHTML(event.title)}</strong>
                          <p>${escapeHTML(event.summary || event.desc || "")}</p>
                        </div>
                        <i>阅</i>
                      </button>
                    </li>
                  `
                )
                .join("")}</ol>`
            : `<p class="era-detail-empty">该政权的细分大事暂未收录，可先结合时代位置与并行政权阅读。</p>`
        }
      </section>

      <section class="era-detail-section">
        <div class="era-detail-section-head">
          <p class="eyebrow">人物与作品</p>
          <h3>课内名家</h3>
        </div>
        ${
          authorCount
            ? `<div class="era-detail-authors">${dynasty.authors
                .map(
                  (author) => `
                    <button type="button" class="era-detail-author" data-era-detail-author="${escapeHTML(author.name)}">
                      <span>${escapeHTML(author.name.slice(0, 1))}</span>
                      <div>
                        <strong>${escapeHTML(author.name)}</strong>
                        <small>${escapeHTML(author.tag || "课内名家")} · ${formatRange(author.start, author.end)}</small>
                      </div>
                      <i>阅</i>
                    </button>
                  `
                )
                .join("")}</div>`
            : `<p class="era-detail-empty">这一时期暂未关联课内重点作者。</p>`
        }
      </section>

      <section class="era-detail-section">
        <div class="era-detail-section-head">
          <p class="eyebrow">名篇一览</p>
          <h3>代表诗文</h3>
        </div>
        ${
          poemCount
            ? `<div class="era-detail-poems">${dynasty.poetry
                .map((poem) => renderPoemCard(poem, dynasty))
                .join("")}</div>`
            : `<p class="era-detail-empty">暂未收录这一时期的代表诗文。</p>`
        }
      </section>
    `;
    showDetail();
  }

  function buildDynastySummary(dynasty) {
    if (dynasty.name === "唐朝") {
      return "唐朝在统一与开放中走向盛世，诗歌、书法与多元文化交流并盛；安史之乱后，社会矛盾与藩镇割据逐渐加深。";
    }
    if (dynasty.name === "南宋") {
      return "南宋偏安江南，城市经济与词学持续发展；北方失地与主战、主和之争，成为陆游、辛弃疾等文人反复书写的时代背景。";
    }
    if (dynasty.name === "春秋" && !dynasty.events.some((event) => event.title.includes("葵丘"))) {
      return "春秋时期王室衰微、诸侯争霸，孔子及其弟子的思想活动与礼乐传统在这一变革中展开。";
    }
    const eventText = dynasty.events?.length
      ? `代表事件包括${dynasty.events
          .slice(0, 3)
          .map((event) => `“${event.title}”`)
          .join("、")}。`
      : "这一时期的详细大事仍在整理中。";
    const authorText = dynasty.authors?.length
      ? `课内常读人物有${dynasty.authors
          .slice(0, 4)
          .map((author) => author.name)
          .join("、")}。`
      : "";
    return `${dynasty.name}延续约 ${dynasty.end - dynasty.start} 年。${eventText}${authorText}`;
  }

  function renderPoemCard(poem, dynasty) {
    const workId = resolveWork(poem);
    return `
      <article class="era-detail-poem">
        <div class="era-poem-head">
          <h4>《${escapeHTML(poem.title)}》</h4>
          <span>${escapeHTML(poem.author)}</span>
        </div>
        <blockquote>${escapeHTML(poem.content)}</blockquote>
        <footer>
          <span>${escapeHTML(dynasty.name)} · 时代代表作</span>
          ${
            workId
              ? `<button type="button" data-era-open-work="${escapeHTML(workId)}">查看完整诗文</button>`
              : `<small>教材篇目详情待接入</small>`
          }
        </footer>
      </article>
    `;
  }

  function openAuthorDetailByNames(authorName) {
    for (const dynasty of dynasties) {
      const author = (dynasty.authors || []).find((item) => item.name === authorName);
      if (author) {
        openAuthorDetail(author, dynasty);
        return;
      }
    }
  }

  function openAuthorDetail(author, dynasty) {
    const authorId = resolveAuthor(author.name);
    const workButtons = (author.works || [])
      .map((work) => {
        const workId = resolveWork({ title: work, author: author.name });
        return workId
          ? `<button type="button" data-era-open-work="${escapeHTML(workId)}">${escapeHTML(work)}</button>`
          : `<span>${escapeHTML(work)}</span>`;
      })
      .join("");

    detailEyebrow.textContent = "人物档案 · 生平与名篇";
    detailTitle.textContent = author.name;
    detailSubtitle.textContent = `${author.tag || "课内名家"} · ${formatYear(author.start)}—${formatYear(author.end)}`;
    detailBody.innerHTML = `
      <section class="era-author-profile">
        <span class="era-author-seal" aria-hidden="true">${escapeHTML(author.name.slice(0, 1))}</span>
        <div>
          <p class="eyebrow">${escapeHTML(dynasty.name)} · ${escapeHTML(author.tag || "课内名家")}</p>
          <h3>${escapeHTML(author.name)}</h3>
          <p>${formatRange(author.start, author.end)}${author.alias ? ` · ${escapeHTML(author.alias)}` : ""}</p>
        </div>
      </section>

      <div class="era-author-summary">
        <span><strong>${author.routeCount || 0}</strong> 处行旅</span>
        <span><strong>${(author.works || []).length}</strong> 篇代表作品</span>
        <span>资料已与作者漫游合并</span>
      </div>

      <section class="era-detail-section era-author-bio">
        <p class="eyebrow">人物小传</p>
        <p>${escapeHTML(author.bio)}</p>
      </section>

      <section class="era-detail-section">
        <div class="era-detail-section-head">
          <p class="eyebrow">人生节点</p>
          <h3>生平大事</h3>
        </div>
        <ol class="era-milestones">
          ${(author.milestones || [])
            .map(
              (milestone) => `
                <li>
                  <i></i>
                  <p>${escapeHTML(milestone)}</p>
                </li>
              `
            )
            .join("")}
        </ol>
      </section>

      <section class="era-detail-section">
        <div class="era-detail-section-head">
          <p class="eyebrow">课内常读</p>
          <h3>代表名篇</h3>
        </div>
        <div class="era-author-works">${workButtons || `<span>作品信息待补录</span>`}</div>
      </section>

      <section class="era-context-card">
        <p class="eyebrow">时代背景</p>
        <p>${escapeHTML(author.context)}</p>
      </section>

      ${
        authorId
          ? `<button class="era-journey-button" type="button" data-era-go-author="${escapeHTML(authorId)}">
              <span>循迹</span>
              前往作者漫游，查看一生行旅
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
            </button>`
          : ""
      }
    `;
    showDetail();
  }

  function showDetail() {
    detail.classList.add("is-open");
    detail.setAttribute("aria-hidden", "false");
    detailBody.scrollTop = 0;
    window.requestAnimationFrame(() => detailClose.focus({ preventScroll: true }));
  }

  function closeDetail({ restoreFocus = false } = {}) {
    if (!detail.classList.contains("is-open")) return;
    detail.classList.remove("is-open");
    detail.setAttribute("aria-hidden", "true");
    if (restoreFocus) {
      scroll.focus({ preventScroll: true });
    }
  }

  function showTooltip(element, payload) {
    tooltipDot.style.background = payload.color || "var(--cinnabar)";
    tooltipTitle.textContent = payload.title;
    tooltipTag.textContent = payload.tag;
    tooltipTime.textContent = payload.time;
    tooltipBody.innerHTML = payload.body;
    tooltip.hidden = false;
    positionTooltip({ clientX: 0, clientY: 0 }, element, true);
  }

  function positionTooltip(event, element, fromFocus = false) {
    if (tooltip.hidden) return;
    const rect = element.getBoundingClientRect();
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    let x = fromFocus ? rect.right + 10 : event.clientX + 14;
    let y = fromFocus ? rect.top : event.clientY + 14;
    if (x + width > window.innerWidth - 12) x = Math.max(12, rect.left - width - 10);
    if (y + height > window.innerHeight - 12) y = Math.max(12, window.innerHeight - height - 12);
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  }

  function hideTooltip() {
    tooltip.hidden = true;
  }

  function resizeTooltipDismiss() {
    hideTooltip();
  }

  function scrollToYear(year, { smooth = true } = {}) {
    const top = Math.max(0, (Number(year) - config.startYear) * config.pixelsPerYear - 120);
    scroll.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
  }

  function buildRegimeTooltip(dynasty) {
    const events = (dynasty.events || []).slice(0, 3);
    return {
      color: dynasty.color,
      title: dynasty.name,
      tag: "并行政权",
      time: `${formatYear(dynasty.start)}—${formatYear(dynasty.end)} · ${dynasty.end - dynasty.start}年`,
      body: events.length
        ? events
            .map(
              (event) =>
                `<p><time>${formatYearShort(getEventYear(event))}</time><span>${escapeHTML(event.title)}</span></p>`
            )
            .join("")
        : `<p class="era-tooltip-empty">点击查看时代详情</p>`
    };
  }

  function buildEventTooltip(event, dynasty) {
    return {
      color: "#a8793f",
      title: event.title,
      tag: "历史大事",
      time: `${formatYear(getEventYear(event))} · ${dynasty.name}`,
      body: `<p>${escapeHTML(event.summary || event.desc || "")}</p>`
    };
  }

  function buildAuthorTooltip(author, dynasty) {
    return {
      color: "#4c7167",
      title: author.name,
      tag: author.tag || "课内名家",
      time: `${formatYear(author.start)}—${formatYear(author.end)} · ${dynasty.name}`,
      body: `<p>${escapeHTML((author.bio || "").slice(0, 66))}${author.bio?.length > 66 ? "…" : ""}</p>`
    };
  }

  function handleLaneClick(event) {
    const authorButton = event.target.closest("[data-era-open-author]");
    if (authorButton) {
      const dynasty = getDynasty(authorButton.dataset.eraOpenAuthor);
      const author = dynasty?.authors?.[Number(authorButton.dataset.eraAuthorIndex)];
      if (author) openAuthorDetail(author, dynasty);
      return;
    }

    const eventButton = event.target.closest("[data-era-open-event]");
    if (eventButton) {
      const block = eventButton.closest(".era-regime");
      const dynasty = getDynasty(block?.dataset.eraRegime);
      const historyEvent = dynasty?.events?.[Number(eventButton.dataset.eraEventIndex)];
      if (historyEvent) openEvent(historyEvent, dynasty);
      return;
    }

    const regimeButton = event.target.closest("[data-era-open-regime]");
    if (regimeButton) {
      openRegime(regimeButton.dataset.eraOpenRegime);
      return;
    }

    const block = event.target.closest(".era-regime");
    if (block) openRegime(block.dataset.eraRegime);
  }

  function handleLaneOver(event) {
    const authorButton = event.target.closest("[data-era-open-author]");
    if (authorButton && !authorButton.contains(event.relatedTarget)) {
      const dynasty = getDynasty(authorButton.dataset.eraOpenAuthor);
      const author = dynasty?.authors?.[Number(authorButton.dataset.eraAuthorIndex)];
      if (author) showTooltip(authorButton, buildAuthorTooltip(author, dynasty));
      return;
    }
    const eventButton = event.target.closest(".era-event-pin");
    if (eventButton && !eventButton.contains(event.relatedTarget)) {
      const block = eventButton.closest(".era-regime");
      const dynasty = getDynasty(block?.dataset.eraRegime);
      const matchingEvent = dynasty?.events?.[Number(eventButton.dataset.eraEventIndex)];
      if (dynasty && matchingEvent) showTooltip(eventButton, buildEventTooltip(matchingEvent, dynasty));
      return;
    }
    const block = event.target.closest(".era-regime");
    if (block && !block.contains(event.relatedTarget) && !event.target.closest("button")) {
      const dynasty = getDynasty(block.dataset.eraRegime);
      if (dynasty) showTooltip(block, buildRegimeTooltip(dynasty));
    }
  }

  function handleLaneOut(event) {
    const tracked = event.target.closest(".era-regime, .era-author-pin, .era-event-pin");
    if (tracked && !tracked.contains(event.relatedTarget)) hideTooltip();
  }

  function bindEvents() {
    quickLinks.forEach((button) => {
      button.addEventListener("click", () => scrollToYear(Number(button.dataset.eraYear)));
    });

    lanes.addEventListener("click", handleLaneClick);
    lanes.addEventListener("mouseover", handleLaneOver);
    lanes.addEventListener("mousemove", (event) => {
      if (!tooltip.hidden) positionTooltip(event, event.target.closest("button, .era-regime") || lanes);
    });
    lanes.addEventListener("mouseout", handleLaneOut);
    lanes.addEventListener("focusin", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.matches(".era-author-pin")) {
        const dynasty = getDynasty(button.dataset.eraOpenAuthor);
        const author = dynasty?.authors?.[Number(button.dataset.eraAuthorIndex)];
        if (author) showTooltip(button, buildAuthorTooltip(author, dynasty));
      } else if (button.matches(".era-event-pin")) {
        const block = button.closest(".era-regime");
        const dynasty = getDynasty(block?.dataset.eraRegime);
        const matchingEvent = dynasty?.events?.[Number(button.dataset.eraEventIndex)];
        if (dynasty && matchingEvent) showTooltip(button, buildEventTooltip(matchingEvent, dynasty));
      } else if (button.matches(".era-regime-head")) {
        const dynasty = getDynasty(button.dataset.eraOpenRegime);
        if (dynasty) showTooltip(button, buildRegimeTooltip(dynasty));
      }
    });
    lanes.addEventListener("focusout", hideTooltip);

    detailClose.addEventListener("click", () => closeDetail({ restoreFocus: true }));
    detail.addEventListener("click", (event) => {
      const eventButton = event.target.closest("[data-era-event-id]");
      if (eventButton) {
        const historyEvent = dynasties.flatMap((dynasty) => dynasty.events || []).find(
          (item) => item.id === eventButton.dataset.eraEventId
        );
        if (historyEvent) openEvent(historyEvent);
        return;
      }
      const workButton = event.target.closest("[data-era-open-work]");
      if (workButton) {
        openWork(workButton.dataset.eraOpenWork);
        return;
      }
      const authorButton = event.target.closest("[data-era-detail-author]");
      if (authorButton) {
        openAuthorDetailByNames(authorButton.dataset.eraDetailAuthor);
        return;
      }
      const journeyButton = event.target.closest("[data-era-go-author]");
      if (journeyButton) {
        closeDetail();
        openAuthor(journeyButton.dataset.eraGoAuthor);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && detail.classList.contains("is-open")) {
        closeDetail({ restoreFocus: true });
      }
    });

    window.addEventListener("resize", () => {
      if (!module.classList.contains("is-active") || !rendered) return;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (Math.abs(scroll.clientWidth - lastViewportWidth) >= 8) renderTimeline();
      }, 140);
    });
  }

  bindEvents();

  function focusRegime(name, { openDetail = false } = {}) {
    if (!rendered) renderTimeline();
    const index = processed.findIndex((dynasty) => dynasty.name === name);
    if (index < 0) return false;
    const dynasty = processed[index];
    const block = lanes.querySelector(`[data-era-regime="${index}"]`);
    const top = Math.max(0, (Number(dynasty.start) - config.startYear) * config.pixelsPerYear - 110);
    const left = Math.max(0, (block?.offsetLeft || 0) + config.axisPadding - 18);
    scroll.scrollTo({ top, left, behavior: "smooth" });
    if (openDetail) openRegime(index);
    return true;
  }

  function focusEvent(eventId, { openDetail = true } = {}) {
    if (!rendered) renderTimeline();
    const dynasty = processed.find((item) => (item.events || []).some((event) => event.id === eventId));
    if (!dynasty) return false;
    const historyEvent = dynasty.events.find((event) => event.id === eventId);
    focusRegime(dynasty.name);
    if (openDetail) openEvent(historyEvent, dynasty);
    return true;
  }

  return {
    activate() {
      window.requestAnimationFrame(() => {
        if (!rendered) {
          renderTimeline();
          scrollToYear(-300, { smooth: false });
        } else if (Math.abs(scroll.clientWidth - lastViewportWidth) >= 8) {
          renderTimeline();
        }
      });
    },
    resize() {
      if (module.classList.contains("is-active")) {
        window.requestAnimationFrame(() => {
          if (Math.abs(scroll.clientWidth - lastViewportWidth) >= 8) renderTimeline();
        });
      }
    },
    close() {
      closeDetail();
      hideTooltip();
    },
    focusRegime,
    focusEvent,
    showToast
  };
}
