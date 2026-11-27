import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data.json"), "utf8"));
const chronicles = JSON.parse(fs.readFileSync(path.join(root, "data", "chronicles.json"), "utf8"));
const eventDetails = JSON.parse(fs.readFileSync(path.join(root, "data", "history-event-details.json"), "utf8"));
const tongjia = JSON.parse(fs.readFileSync(path.join(root, "data", "tongjia.json"), "utf8"));
const mapAtlas = JSON.parse(fs.readFileSync(path.join(root, "data", "map-atlas.json"), "utf8"));
const personRelations = JSON.parse(
  fs.readFileSync(path.join(root, "data", "person-relations.json"), "utf8")
);
const errors = [];

const dynastyIds = new Set();
const workIds = new Set();
const authorIds = new Set();

for (const dynasty of data.dynasties || []) {
  if (dynastyIds.has(dynasty.id)) errors.push(`重复朝代 id：${dynasty.id}`);
  dynastyIds.add(dynasty.id);
  const geoPath = path.join(root, dynasty.geojson);
  if (!fs.existsSync(geoPath)) {
    errors.push(`缺少 GeoJSON：${dynasty.geojson}`);
  } else {
    try {
      JSON.parse(fs.readFileSync(geoPath, "utf8"));
    } catch (error) {
      errors.push(`GeoJSON 格式错误：${dynasty.geojson}`);
    }
  }
}

for (const work of data.works || []) {
  if (workIds.has(work.id)) errors.push(`重复篇目 id：${work.id}`);
  workIds.add(work.id);
  if (!dynastyIds.has(work.dynastyId)) errors.push(`${work.title} 的 dynastyId 无效：${work.dynastyId}`);
  if (
    work.place?.located !== false &&
    (!Number.isFinite(Number(work.place?.lat)) || !Number.isFinite(Number(work.place?.lng)))
  ) {
    errors.push(`${work.title} 缺少有效经纬度`);
  }
  for (const field of ["title", "author", "original", "translation", "background"]) {
    if (!work[field]) errors.push(`${work.title} 缺少字段：${field}`);
  }
}

const personIds = new Set();
const relationTypes = new Set(["亲属", "师友", "交游", "君臣同朝", "政治论争", "军事对手", "文学群体", "文学传承", "历史关联"]);
const relationStages = new Set(["小学", "初中", "高中"]);
const relationPersonTypes = new Set(["文人", "帝王", "历史人物"]);
for (const person of personRelations.nodes || []) {
  if (!person.id || personIds.has(person.id)) {
    errors.push(`人物关系节点 id 缺失或重复：${person.id || person.name || "(未命名)"}`);
    continue;
  }
  personIds.add(person.id);
  if (!person.name) errors.push(`人物关系节点 ${person.id} 缺少 name`);
  if (!relationPersonTypes.has(person.type)) {
    errors.push(`${person.name || person.id} 的人物类型无效：${person.type}`);
  }
  for (const stage of person.stage || []) {
    if (!relationStages.has(stage)) errors.push(`${person.name || person.id} 的学段无效：${stage}`);
  }
  for (const workId of person.workIds || []) {
    if (!workIds.has(workId)) {
      errors.push(`${person.name || person.id} 引用了不存在的篇目：${workId}`);
    }
  }
}

const relationLinkIds = new Set();
for (const link of personRelations.links || []) {
  if (!link.id || relationLinkIds.has(link.id)) {
    errors.push(`人物关系连线 id 缺失或重复：${link.id || "(无 id)"}`);
  }
  relationLinkIds.add(link.id);
  if (!personIds.has(link.source)) errors.push(`人物关系连线引用了不存在的人物：${link.source}`);
  if (!personIds.has(link.target)) errors.push(`人物关系连线引用了不存在的人物：${link.target}`);
  if (link.source === link.target) errors.push(`人物关系不能连接自己：${link.source}`);
  if (!relationTypes.has(link.relationType)) {
    errors.push(`${link.id} 的关系类型无效：${link.relationType}`);
  }
  if (!["课内", "拓展"].includes(link.sourceType)) {
    errors.push(`${link.id} 的 sourceType 无效：${link.sourceType}`);
  }
}

for (const author of data.authors || []) {
  if (authorIds.has(author.id)) errors.push(`重复作者 id：${author.id}`);
  authorIds.add(author.id);
  if (!Array.isArray(author.route) || !author.route.length) {
    errors.push(`${author.name} 缺少路线`);
    continue;
  }
  for (const stop of author.route) {
    for (const workId of stop.workIds || []) {
      if (!workIds.has(workId)) errors.push(`${author.name}/${stop.name} 引用了不存在的篇目：${workId}`);
    }
    if (!Number.isFinite(Number(stop.lat)) || !Number.isFinite(Number(stop.lng))) {
      errors.push(`${author.name}/${stop.name} 缺少有效经纬度`);
    }
  }
}

for (const work of data.works || []) {
  if (work.authorId && !authorIds.has(work.authorId)) {
    errors.push(`${work.title} 的 authorId 不存在：${work.authorId}`);
  }
  if (work.level === "primary" || work.levels?.includes("primary")) {
    const author = (data.authors || []).find((item) => item.id === work.authorId);
    if (!author) {
      errors.push(`小学篇目 ${work.title} 尚未关联作者`);
    } else {
      const inRoute = author.route?.some((stop) => (stop.workIds || []).includes(work.id));
      const isLoose = (author.looseWorkIds || []).includes(work.id);
      if (!inRoute && !isLoose) errors.push(`小学篇目 ${work.title} 未进入作者漫游路线`);
    }
  }
}

for (const label of data.mapLabels || []) {
  if (!label.name) errors.push("mapLabels 中存在缺少 name 的标签");
  if (!Number.isFinite(Number(label.lat)) || !Number.isFinite(Number(label.lng))) {
    errors.push(`中文地图标签 ${label.name || "(未命名)"} 缺少有效经纬度`);
  }
}

let chronicleEventCount = 0;
for (const dynasty of data.dynasties || []) {
  const chronicle = chronicles[dynasty.id];
  if (!chronicle?.events?.length) {
    errors.push(`${dynasty.name} 缺少大事年表`);
    continue;
  }
  chronicleEventCount += chronicle.events.length;
  for (const event of chronicle.events) {
    for (const field of ["year", "title", "type", "summary"]) {
      if (!event[field]) errors.push(`${dynasty.name} 年表事件缺少字段：${field}`);
    }
    if (!Number.isFinite(Number(event.yearSort))) {
      errors.push(`${dynasty.name}/${event.title} 缺少有效 yearSort`);
    }
    for (const workId of event.workIds || []) {
      if (!workIds.has(workId)) errors.push(`${dynasty.name}/${event.title} 引用了不存在的篇目：${workId}`);
    }
  }
}

for (const [title, detail] of Object.entries(eventDetails.events || {})) {
  for (const field of ["cause", "process", "result", "significance", "evaluation"]) {
    if (!detail[field]) errors.push(`历史事件“${title}”缺少字段：${field}`);
  }
}

for (const entry of tongjia.entries || []) {
  for (const field of ["id", "term", "target", "meaning", "sentence", "translation", "sourceTitle"]) {
    if (!entry[field]) errors.push(`通假字条目 ${entry.id || "(无 id)"} 缺少字段：${field}`);
  }
  for (const workId of entry.workIds || []) {
    if (!workIds.has(workId)) errors.push(`通假字“${entry.term}”引用了不存在的篇目：${workId}`);
  }
}

const atlasPeriods = new Map((mapAtlas.periods || []).map((period) => [period.id, period]));
for (const dynasty of data.dynasties || []) {
  const period = atlasPeriods.get(dynasty.id);
  if (!period) {
    errors.push(`${dynasty.name} 缺少疆域阶段数据`);
    continue;
  }
  if (!Array.isArray(period.snapshots) || !period.snapshots.length) {
    errors.push(`${dynasty.name} 的疆域阶段为空`);
    continue;
  }
  for (const snapshot of period.snapshots) {
    const snapshotPath = path.join(root, snapshot.geojson);
    if (!fs.existsSync(snapshotPath)) {
      errors.push(`${dynasty.name}/${snapshot.yearLabel} 缺少 GeoJSON：${snapshot.geojson}`);
      continue;
    }
    try {
      const geo = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
      if (!Array.isArray(geo.features) || !geo.features.length) {
        errors.push(`${dynasty.name}/${snapshot.yearLabel} 的 GeoJSON 没有要素`);
      }
    } catch {
      errors.push(`${dynasty.name}/${snapshot.yearLabel} 的 GeoJSON 格式错误`);
    }
  }
}

if (errors.length) {
  console.error(`数据校验失败（${errors.length} 项）：`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `数据校验通过：${data.dynasties.length} 个朝代，${mapAtlas.periods.reduce((total, period) => total + period.snapshots.length, 0)} 个疆域阶段，${chronicleEventCount} 件大事，${Object.keys(eventDetails.events || {}).length} 组事件详解，${tongjia.entryCount || 0} 条通假字，${data.authors.length} 位作者，${data.works.length} 篇诗文，${(personRelations.nodes || []).length} 位关系人物，${(personRelations.links || []).length} 条人物关系，${(data.mapLabels || []).length} 个中文地图标注。`
);
