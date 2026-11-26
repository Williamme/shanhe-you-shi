import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const source = fs.readFileSync(path.join(root, "文言文.txt"), "utf8").replace(/\r/g, "");
const data = JSON.parse(fs.readFileSync(path.join(root, "data.json"), "utf8"));
const lines = source.split("\n").map((line) => line.trim());

const sectionPattern = /^(?:[一二三四五六七八九]年级[上下]册|必修[上下]册|选择性必修[上中下]册)$/;
const structuredPattern = /^\d+｜([^｜]+)｜([^｜]*)(?:｜([^｜]*))?$/;
const numberedPattern = /^\d+[.、]\s*(.+)$/;

const entries = [];
let section = "";
let pendingTitle = "";
let appendedJunior = false;

for (let index = 0; index < lines.length; index += 1) {
  const line = lines[index];
  if (!line) continue;

  if (line.startsWith("统编人教版初中古诗文")) {
    appendedJunior = true;
    section = "七年级上册（补充）";
    continue;
  }
  if (line.startsWith("统编人教版高中古诗文")) {
    appendedJunior = false;
    continue;
  }

  if (sectionPattern.test(line)) {
    section = line;
    appendedJunior = false;
    continue;
  }

  const structured = line.match(structuredPattern);
  if (structured) {
    pendingTitle = structured[1].trim();
    continue;
  }

  const numbered = line.match(numberedPattern);
  if (numbered && !/^第[一二三四五六七八九十]+/.test(numbered[1])) {
    pendingTitle = numbered[1].trim();
    continue;
  }

  if (line === "【原文】" && pendingTitle) {
    entries.push({
      section,
      rawTitle: pendingTitle,
      title: normalizeTitle(pendingTitle),
      line: index + 1
    });
    pendingTitle = "";
  }
}

function normalizeTitle(value) {
  return value
    .replace(/^\d+[.、]\s*/, "")
    .replace(/\s+(《[^》]+》|[^《》\s]+)\s*$/, "")
    .replace(/[《》]/g, "")
    .replace(/[（(](节选|并序)[）)]/g, "")
    .replace(/并序$/, "")
    .replace(/\s+/g, "")
    .trim();
}

const currentTitles = new Set();
for (const work of data.works) {
  const normalized = normalizeTitle(work.title);
  currentTitles.add(normalized);
  currentTitles.add(normalized.split("·")[0]);
}
const unique = new Map();
for (const entry of entries) {
  const key = `${entry.section}|${entry.title}`;
  if (!unique.has(key)) unique.set(key, entry);
}

const covered = [];
const missing = [];
const primary = [];
const outsideScope = [];
for (const [key, entry] of unique) {
  const titleKeys = [entry.title, entry.title.split("·")[0]];
  const target = titleKeys.some((title) => currentTitles.has(title)) ? covered : missing;
  const record = { ...entry, title: entry.title };
  if (/^[一二三四五六]年级/.test(entry.section)) {
    primary.push(record);
  } else if (/^(?:[七八九]年级|必修|选择性必修)/.test(entry.section)) {
    target.push(record);
  } else {
    outsideScope.push(record);
  }
}

console.log(JSON.stringify({
  parsedEntries: entries.length,
  uniqueEntries: unique.size,
  coveredCount: covered.length,
  missingCount: missing.length,
  primaryExcludedCount: primary.length,
  outsideScopeCount: outsideScope.length,
  covered,
  missing,
  primary: primary.map((entry) => `${entry.section}｜${entry.rawTitle}`),
  outsideScope
}, null, 2));

if (process.argv.includes("--report")) {
  const initialHigh = [...covered, ...missing];
  const primaryCovered = primary.filter((entry) => {
    const titleKeys = [entry.title, entry.title.split("·")[0]];
    return titleKeys.some((title) => currentTitles.has(title));
  });
  const sectionCounts = {};
  for (const entry of primary) {
    sectionCounts[entry.section] = (sectionCounts[entry.section] || 0) + 1;
  }
  const added = data.works
    .filter((work) => String(work.sourceNote || "").includes("用户提供的《文言文.txt》"))
    .map((work) => work.title);
  const lines = [
    "# 《文言文.txt》与网站诗文数据对照报告",
    "",
    `- 对照文件：\`文言文.txt\``,
    `- 材料中解析出的篇目：${entries.length} 条`,
    `- 初高中范围内：${initialHigh.length} 条，已覆盖 ${covered.length} 条，仍缺 ${missing.length} 条`,
    `- 小学一至六年级：${primary.length} 条，已覆盖 ${primaryCovered.length} 条，新增“小学”筛选`,
    `- 本轮从材料补入：${added.length} 篇`,
    "",
    "## 本轮补入篇目",
    "",
    ...added.map((title) => `- ${title}`),
    "",
    "## 仍缺的初高中篇目",
    "",
    ...(missing.length ? missing.map((entry) => `- ${entry.section}｜${entry.rawTitle}`) : ["- 无"]),
    "",
    "## 小学篇目分布",
    "",
    ...Object.entries(sectionCounts).map(([sectionName, count]) => `- ${sectionName}：${count} 篇`),
    "",
    "## 说明",
    "",
    "- 小学篇目现已进入同一数据体系，可在“小学”筛选中查看；无法确考创作地的篇目会保留文本但不设置地图点位。",
    "- 材料中的高中部分仅覆盖必修上册、必修下册的选文，不等同于完整高中教材。",
    "- 材料缺少八、九年级和选择性必修部分；网站中这些篇目来自原有数据，不据此报告判定为遗漏。",
    "- 原文、注释和译文优先采用用户提供的材料；缺失译文的地方已人工补全。"
  ];
  fs.writeFileSync(path.join(root, "data", "文言文对照报告.md"), `${lines.join("\n")}\n`, "utf8");
  console.log("已生成 data/文言文对照报告.md");
}
