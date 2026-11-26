const PERIOD_ERA_NAMES = {
  xia: ["夏朝"],
  shang: ["商朝"],
  zhou: ["西周", "春秋", "战国"],
  qin: ["秦朝"],
  han: ["西汉", "新朝", "东汉"],
  sanguo: ["曹魏", "蜀汉", "孙吴"],
  jin: ["西晋", "东晋", "十六国"],
  nanbeichao: ["南朝·宋", "南朝·齐", "南朝·梁", "南朝·陈", "北魏", "东魏", "西魏", "北齐", "北周"],
  sui: ["隋朝"],
  tang: ["唐朝"],
  song: ["北宋", "南宋", "金朝"],
  yuan: ["元朝"],
  ming: ["明朝"],
  qing: ["清朝"],
  modern: ["近现代"]
};

const ERA_ONLY_AUTHOR_IDS = {
  李斯: "lisi",
  司马迁: "simaqian",
  曹操: "caocao",
  曹植: "caozhi",
  王羲之: "wangxizhi",
  文天祥: "wentianxiang",
  马致远: "mazhiyuan",
  于谦: "yuqian",
  纳兰性德: "nalanxingde"
};

const AUTHOR_FALLBACK_STOPS = {
  曹植: {
    name: "邺城",
    ancient: "曹魏邺都",
    modern: "河北临漳",
    lat: 36.35,
    lng: 114.62,
    year: "建安时期",
    story: "曹植主要活动于邺城与洛阳一带。建安文学的中心连接着他的成长、交游与政治挫折。",
    purpose: "文学交游与政治沉浮"
  },
  于谦: {
    name: "北京",
    ancient: "明京师",
    modern: "北京",
    lat: 39.904,
    lng: 116.407,
    year: "正统十四年（1449）",
    story: "土木堡之变后，于谦主持北京保卫战，成为明代政治与军事史上的关键人物。",
    purpose: "守卫京师"
  },
  纳兰性德: {
    name: "北京",
    ancient: "清京师",
    modern: "北京",
    lat: 39.904,
    lng: 116.407,
    year: "康熙年间",
    story: "纳兰性德长期任职京师，又曾随康熙出巡。京华生活与塞外行旅共同构成其词境。",
    purpose: "随驾出巡与京华交游"
  }
};

const PURPOSE_RULES = [
  [/出生|生于/, "出生与成长"],
  [/贬|谪|放逐/, "遭贬迁徙与心境转折"],
  [/辞官|归隐|退居|归田|还乡/, "辞官归隐与还乡"],
  [/求仕|应举|科举|登进士|入仕/, "求仕应举与仕宦起步"],
  [/从军|入幕|幕府|军中|前线/, "入幕从军与奔走国事"],
  [/避乱|避难|流亡|南渡|迁徙/, "避乱迁徙与家国忧思"],
  [/客居|旅居|寄居|羁旅/, "客居羁旅与思乡怀人"],
  [/送别|告别|寄赠|赠答/, "送别交游与诗文赠答"],
  [/奉诏|应召|入京/, "应召入京与仕宦追求"],
  [/讲学|书院|从学|问礼/, "求学讲学与思想交游"],
  [/任|赴|调任|出守|刺史|县令|参军/, "仕宦赴任与地方治理"],
  [/漫游|游历|远游|游山|行旅/, "漫游访胜与交游"],
  [/迁都|北上|南下|东下|西行/, "长途迁徙与时局奔走"]
];

const clone = (value) => JSON.parse(JSON.stringify(value));

const normalize = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[《》〈〉“”‘’（）()、，。；：！？·\s—…\-～~]/g, "");

const normalizeTitle = (value = "") =>
  normalize(String(value).split(/[，,；;]/)[0]).replace(
    /(节选|其[一二三四五六七八九十百]+|爆发|开始|开启|首次|建立|完成)$/,
    ""
  );

function hashText(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function formatYearShort(year) {
  const number = Number(year);
  if (!Number.isFinite(number)) return "";
  return number < 0 ? `前${Math.abs(number)}` : String(number);
}

function formatEventYear(year) {
  const number = Number(year);
  if (!Number.isFinite(number)) return "";
  return number < 0 ? `前${Math.abs(number)}年` : `${number}年`;
}

export function deriveTravelPurpose(stop, author, index = 0) {
  if (stop?.purpose) return stop.purpose;
  if (index === 0) return "出生与早年成长";
  const story = String(stop?.story || "");
  const matched = PURPOSE_RULES.find(([pattern]) => pattern.test(story));
  if (matched) return matched[1];
  const firstSentence = story.split(/[。！？]/)[0].trim().replace(/^.*?的?/, "");
  if (!firstSentence) return "行旅与交游";
  return firstSentence.slice(0, 24);
}

function mergeDistinctText(...values) {
  const unique = [];
  values
    .filter(Boolean)
    .map((value) => String(value).trim())
    .forEach((value) => {
      const normalized = normalize(value);
      if (!normalized) return;
      const containedIndex = unique.findIndex(
        (existing) => normalize(existing).includes(normalized) || normalized.includes(normalize(existing))
      );
      if (containedIndex >= 0) {
        if (value.length > unique[containedIndex].length) unique[containedIndex] = value;
        return;
      }
      unique.push(value);
    });
  return unique.join(" ");
}

function uniqueStrings(values) {
  const seen = new Set();
  return values.filter((value) => {
    const normalized = normalize(value);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function getWorksForAuthor(author, works) {
  const authorName = normalize(author.name);
  return works
    .filter((work) => {
      const workAuthor = normalize(work.author);
      return workAuthor.includes(authorName) || authorName.includes(workAuthor);
    })
    .sort((a, b) => Number(a.yearSort || 0) - Number(b.yearSort || 0));
}

function findEraPlacement(name, eraData) {
  const target = normalize(name);
  for (const dynasty of eraData.dynasties || []) {
    const author = (dynasty.authors || []).find((item) => normalize(item.name) === target);
    if (author) return { dynasty, author };
  }
  return null;
}

function resolveEraTarget(author) {
  const era = String(author.era || "");
  if (era.includes("先秦") || era.includes("南北朝")) return "西周";
  if (era.includes("三国")) {
    if (era.includes("蜀")) return "蜀汉";
    if (era.includes("吴")) return "孙吴";
    return "曹魏";
  }
  if (era.includes("东晋")) return "东晋";
  if (era.includes("西晋")) return "西晋";
  if (era.includes("两宋之交")) return "南宋";
  if (era.includes("南宋")) return "南宋";
  if (era.includes("北宋")) return "北宋";
  if (era.includes("春秋")) return "春秋";
  if (era.includes("战国")) return "战国";
  if (era.includes("秦")) return "秦朝";
  if (era.includes("西汉")) return "西汉";
  if (era.includes("东汉")) return "东汉";
  if (era.includes("隋")) return "隋朝";
  if (era.includes("唐")) return "唐朝";
  if (era.includes("元")) return "元朝";
  if (era.includes("明")) return "明朝";
  if (era.includes("清")) return "清朝";
  if (era.includes("近现代") || era.includes("现代")) return "近现代";
  return null;
}

function deriveContext(author, dynastyName, data) {
  const dynasty = (data.dynasties || []).find((item) => eraNameBelongsToPeriod(dynastyName, item.id));
  const chronicle = dynasty ? data.chronicles?.[dynasty.id] : null;
  return chronicle?.intro || `${author.era || dynastyName}是理解${author.name}人生选择与作品心境的重要时代背景。`;
}

function eraNameBelongsToPeriod(eraName, periodId) {
  return (PERIOD_ERA_NAMES[periodId] || []).includes(eraName);
}

function makeAuthorProfile(author, eraPlacement, workRecords, data) {
  const eraAuthor = eraPlacement?.author;
  const eraDynasty = eraPlacement?.dynasty;
  const representedWorks = workRecords.map((work) => work.title);
  const routeMilestones = author.route.map(
    (stop, index) => `${stop.year}，${stop.name}：${deriveTravelPurpose(stop, author, index)}`
  );
  return {
    tag: eraAuthor?.tag || author.era,
    bio: mergeDistinctText(author.bio, eraAuthor?.bio),
    milestones: uniqueStrings(eraAuthor?.milestones?.length ? eraAuthor.milestones : routeMilestones),
    works: uniqueStrings([...(eraAuthor?.works || []), ...representedWorks]),
    context:
      eraAuthor?.context ||
      deriveContext(author, eraDynasty?.name || resolveEraTarget(author) || "", data),
    eraName: eraDynasty?.name || resolveEraTarget(author) || "",
    sourceNotice: "人物简介、生平节点与代表篇目由“作者漫游”和“时代编年”两套资料合并。"
  };
}

function enrichAuthors(data, eraData) {
  const works = data.works || [];
  const authorRecordByName = new Map();

  const unifiedAuthors = (data.authors || []).map((author) => {
    const eraPlacement = findEraPlacement(author.name, eraData);
    const workRecords = getWorksForAuthor(author, works);
    const route = (author.route || []).map((stop, index) => ({
      ...stop,
      purpose: deriveTravelPurpose(stop, author, index)
    }));
    const enriched = {
      ...author,
      route,
      profile: makeAuthorProfile({ ...author, route }, eraPlacement, workRecords, data)
    };
    authorRecordByName.set(normalize(author.name), enriched);
    return enriched;
  });

  for (const dynasty of eraData.dynasties || []) {
    for (const eraAuthor of dynasty.authors || []) {
      if (authorRecordByName.has(normalize(eraAuthor.name))) continue;
      const id = ERA_ONLY_AUTHOR_IDS[eraAuthor.name] || `era-author-${hashText(eraAuthor.name)}`;
      const workRecords = works.filter((work) => normalize(work.author).includes(normalize(eraAuthor.name)));
      const route = buildAutoRoute(eraAuthor, dynasty, workRecords);
      const profile = {
        tag: eraAuthor.tag || dynasty.name,
        bio: eraAuthor.bio,
        milestones: eraAuthor.milestones || [],
        works: uniqueStrings([...(eraAuthor.works || []), ...workRecords.map((work) => work.title)]),
        context: eraAuthor.context || deriveContext(eraAuthor, dynasty.name, data),
        eraName: dynasty.name,
        sourceNotice: "根据时代编年人物档案自动补全，并关联教材中可定位的作品地点。"
      };
      const synthetic = {
        id,
        name: eraAuthor.name,
        alias: `活动于${dynasty.name} · ${eraAuthor.tag || "课内名家"}`,
        era: dynasty.name,
        birth: Number(eraAuthor.start),
        death: Number(eraAuthor.end),
        yearSpan: `${formatYearShort(eraAuthor.start)}—${formatYearShort(eraAuthor.end)}`,
        bio: profile.bio,
        accent: dynasty.color || "#6d6656",
        route,
        looseWorkIds: [],
        profile
      };
      unifiedAuthors.push(synthetic);
      authorRecordByName.set(normalize(synthetic.name), synthetic);
    }
  }

  for (const dynasty of eraData.dynasties || []) {
    const assigned = [];
    const existingNames = new Set();

    for (const eraAuthor of dynasty.authors || []) {
      const nameKey = normalize(eraAuthor.name);
      const author = authorRecordByName.get(nameKey);
      if (!author) continue;
      existingNames.add(nameKey);
      assigned.push(toEraAuthor(author, dynasty, eraAuthor));
    }

    for (const author of unifiedAuthors) {
      const nameKey = normalize(author.name);
      if (existingNames.has(nameKey)) continue;
      const target = resolveEraTarget(author);
      if (target !== dynasty.name) continue;
      existingNames.add(nameKey);
      assigned.push(toEraAuthor(author, dynasty, null));
    }

    dynasty.authors = assigned.sort(
      (a, b) => Number(a.start ?? 0) - Number(b.start ?? 0) || a.name.localeCompare(b.name, "zh-CN")
    );
  }

  return unifiedAuthors;
}

function toEraAuthor(author, dynasty, eraAuthor) {
  const profile = author.profile || {};
  return {
    name: author.name,
    authorId: author.id,
    alias: author.alias,
    start: Number(eraAuthor?.start ?? author.birth ?? dynasty.start),
    end: Number(eraAuthor?.end ?? author.death ?? dynasty.end),
    tag: eraAuthor?.tag || profile.tag || author.era || dynasty.name,
    bio: profile.bio || author.bio,
    milestones: profile.milestones || [],
    works: profile.works || [],
    context: profile.context || "",
    routeCount: author.route?.length || 0,
    profile
  };
}

function buildAutoRoute(eraAuthor, dynasty, workRecords) {
  const grouped = new Map();
  workRecords.forEach((work) => {
    const lat = Number(work.place?.lat);
    const lng = Number(work.place?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const key = `${work.place.name}|${lat}|${lng}`;
    if (!grouped.has(key)) grouped.set(key, { work, workIds: [] });
    grouped.get(key).workIds.push(work.id);
  });
  const route = [...grouped.values()].map(({ work, workIds }) => ({
    id: `auto-${normalize(work.place.name)}`,
    name: work.place.name,
    ancient: work.place.ancient || work.place.name,
    modern: work.place.modern || work.place.name,
    lat: Number(work.place.lat),
    lng: Number(work.place.lng),
    year: work.year,
    story: `教材关联篇目${workIds.map((id) => `《${(workRecords.find((item) => item.id === id) || work).title}》`).join("、")}与这里相关，可据此建立作者的文学活动坐标。`,
    purpose: "教材作品的创作与书写地",
    workIds
  }));
  if (route.length) return route;
  const fallback = AUTHOR_FALLBACK_STOPS[eraAuthor.name];
  if (fallback) return [{ ...fallback, id: `auto-${normalize(fallback.name)}`, workIds: [] }];
  return [
    {
      id: `auto-${normalize(dynasty.name)}`,
      name: dynasty.name,
      ancient: dynasty.name,
      modern: dynasty.name,
      lat: 34.3,
      lng: 108.9,
      year: `${formatYearShort(eraAuthor.start)}—${formatYearShort(eraAuthor.end)}`,
      story: `${eraAuthor.name}的活动记录见于${dynasty.name}人物档案。当前以时代核心区域作示意定位，后续可继续补充精确行旅地点。`,
      purpose: "时代活动示意",
      workIds: []
    }
  ];
}

function mergeEvents(data, eraData, eventDetails) {
  const canonical = new Map();
  const detailIndex = new Map(
    Object.entries(eventDetails?.events || {}).map(([title, detail]) => [normalize(title), detail])
  );
  const findDetail = (title) => {
    const normalized = normalize(title);
    if (detailIndex.has(normalized)) return detailIndex.get(normalized);
    return [...detailIndex.entries()].find(
      ([key]) => key.length >= 4 && (normalized.includes(key) || key.includes(normalized))
    )?.[1];
  };

  const addEvent = (source, sourceLabel, periodIds = [], eraNames = []) => {
    const yearSort = Number(source.yearSort ?? source.year);
    const title = String(source.title || "").trim();
    if (!title) return;
    const displayYear =
      typeof source.year === "number" || /^-?\d+$/.test(String(source.year || ""))
        ? formatEventYear(yearSort)
        : source.year;
    const key = `${Number.isFinite(yearSort) ? yearSort : normalize(source.year)}|${normalizeTitle(title)}`;
    if (!canonical.has(key)) {
      canonical.set(key, {
        id: `event-${hashText(key)}`,
        key,
        year: displayYear || formatEventYear(yearSort),
        yearSort,
        title,
        type: source.type || "历史大事",
        summary: source.summary || source.desc || "",
        workIds: [],
        periodIds: [],
        eraNames: [],
        sources: []
      });
    }
    const event = canonical.get(key);
    event.summary =
      String(source.summary || source.desc || "").length > event.summary.length
        ? source.summary || source.desc
        : event.summary;
    event.workIds = [...new Set([...event.workIds, ...(source.workIds || [])])];
    event.periodIds = [...new Set([...event.periodIds, ...periodIds])];
    event.eraNames = [...new Set([...event.eraNames, ...eraNames])];
    event.sources = [...new Set([...event.sources, sourceLabel])];
  };

  for (const [periodId, chronicle] of Object.entries(data.chronicles || {})) {
    for (const event of chronicle.events || []) addEvent(event, "历代疆域", [periodId]);
  }
  for (const dynasty of eraData.dynasties || []) {
    const periodIds = Object.entries(PERIOD_ERA_NAMES)
      .filter(([, names]) => names.includes(dynasty.name))
      .map(([periodId]) => periodId);
    for (const event of dynasty.events || []) addEvent(event, "时代编年", periodIds, [dynasty.name]);
  }

  for (const event of canonical.values()) {
    for (const dynasty of eraData.dynasties || []) {
      const matchingPeriod = Object.entries(PERIOD_ERA_NAMES).some(
        ([periodId, names]) => event.periodIds.includes(periodId) && names.includes(dynasty.name)
      );
      if (
        matchingPeriod &&
        event.yearSort >= Number(dynasty.start) &&
        event.yearSort <= Number(dynasty.end)
      ) {
        event.eraNames = [...new Set([...event.eraNames, dynasty.name])];
      }
    }
    if (!event.eraNames.length) {
      const containingDynasties = (eraData.dynasties || []).filter(
        (dynasty) => event.yearSort >= Number(dynasty.start) && event.yearSort <= Number(dynasty.end)
      );
      containingDynasties.slice(0, 2).forEach((dynasty) => {
        event.eraNames = [...new Set([...event.eraNames, dynasty.name])];
      });
    }
    for (const dynasty of eraData.dynasties || []) {
      if (!event.eraNames.includes(dynasty.name)) continue;
      const periodIds = Object.entries(PERIOD_ERA_NAMES)
        .filter(([, names]) => names.includes(dynasty.name))
        .map(([periodId]) => periodId);
      event.periodIds = [...new Set([...event.periodIds, ...periodIds])];
    }
    const detail = findDetail(event.title);
    event.detail = detail
      ? { ...detail, curated: true }
      : buildFallbackEventDetail(event, event.periodIds[0]);
  }

  const events = [...canonical.values()].sort(
    (a, b) => Number(a.yearSort) - Number(b.yearSort) || a.title.localeCompare(b.title, "zh-CN")
  );
  const eventsById = new Map(events.map((event) => [event.id, event]));
  const chronicles = clone(data.chronicles || {});
  for (const [periodId, chronicle] of Object.entries(chronicles)) {
    chronicle.events = events.filter((event) => event.periodIds.includes(periodId));
  }
  for (const dynasty of eraData.dynasties || []) {
    dynasty.events = events.filter((event) => event.eraNames.includes(dynasty.name));
  }
  return { chronicles, events, eventsById };
}

function buildFallbackEventDetail(event, periodId) {
  const periodName = (PERIOD_ERA_NAMES[periodId] || []).join("、") || "这一时期";
  return {
    cause: `${event.title}发生于${event.year}。它是${periodName}政治、社会与文化矛盾交织下的重要节点；可从当时的制度、权力关系与现实困境理解其背景。`,
    process: event.summary || "现有资料对该事件的经过作了概要记录，具体细节可结合教材与史料继续研读。",
    result: "事件改变了当时的政治格局或社会走向，并影响了此后人物选择、制度演变与文学书写。",
    significance: `它是理解${periodName}历史变迁和课内诗文时代背景的重要入口，可与同一时期的人物与作品对照阅读。`,
    evaluation: "不同史料对事件细节、责任与影响的叙述各有侧重。学习时应区分基本史实、后世评价与文学表达，避免以单一结论代替完整理解。"
  };
}

export function buildContentUnion({ data, eraData, eventDetails }) {
  const mergedEraData = clone(eraData || { dynasties: [] });
  if (!mergedEraData.dynasties.some((dynasty) => dynasty.name === "近现代")) {
    mergedEraData.dynasties.push({
      name: "近现代",
      start: 1912,
      end: 1949,
      color: "#5f7466",
      events: [],
      authors: [],
      poetry: []
    });
  }

  const authors = enrichAuthors(data, mergedEraData);
  const eventUnion = mergeEvents(data, mergedEraData, eventDetails);
  return {
    authors,
    eraData: mergedEraData,
    chronicles: eventUnion.chronicles,
    events: eventUnion.events,
    eventsById: eventUnion.eventsById,
    eraAuthorCount: new Set(
      mergedEraData.dynasties.flatMap((dynasty) => (dynasty.authors || []).map((author) => normalize(author.name)))
    ).size
  };
}
