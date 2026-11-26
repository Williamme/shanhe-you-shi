import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(root, "文言文.txt");
const dataPath = path.join(root, "data.json");
const outputPath = path.join(root, "data", "tongjia.json");
const source = fs.readFileSync(sourcePath, "utf8").replace(/\r/g, "");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const markerIndex = source.lastIndexOf("通假字：");

if (markerIndex < 0) {
  throw new Error("未在文言文.txt 中找到“通假字：”统计段落");
}

const normalize = (value = "") =>
  String(value)
    .replace(/[《》〈〉“”‘’（）()、，。；：！？·\s—…\-～~]/g, "")
    .toLowerCase();

const normalizeWorkTitle = (value = "") =>
  normalize(
    String(value)
      .replace(/【[^】]*】/g, "")
      .replace(/（(?:小学|初中|高中|部分版本|新版教材|旧版教材)[^）]*）/g, "")
      .replace(/\((?:小学|初中|高中|部分版本|新版教材|旧版教材)[^)]*\)/g, "")
  ).replace(/节选$/, "");

function resolveWorks(rawTitle) {
  const title = normalizeWorkTitle(rawTitle);
  if (title === "论语") return data.works.filter((work) => work.id === "lunyu");
  const exact = data.works.filter((work) => normalizeWorkTitle(work.title) === title);
  if (exact.length) return exact;
  return data.works.filter((work) => {
    const workTitle = normalizeWorkTitle(work.title);
    return (
      (title.length >= 3 && workTitle.startsWith(title)) ||
      (workTitle.length >= 4 && title.startsWith(workTitle))
    );
  });
}

function parseTarget(group) {
  const matched = group.match(/^(.+?)\s*[（(]([^）)]+)[）)]$/);
  if (!matched) return { term: group.trim(), target: group.trim(), targetNote: "" };
  const targetContent = matched[2].trim();
  const noteMatch = targetContent.match(/^(\S+)(?:\s+(.+))?$/);
  return {
    term: matched[1].trim(),
    target: noteMatch?.[1] || targetContent,
    targetNote: noteMatch?.[2] || ""
  };
}

const seen = new Set();
const entries = [];
const unmatched = [];

source
  .slice(markerIndex + "通假字：".length)
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && line.includes("｜"))
  .forEach((line) => {
    const [group, meaning, sentence, translation, rawWorkTitle] = line
      .split("｜")
      .map((part) => part.trim());
    if (!group || !meaning || !sentence || !translation || !rawWorkTitle) return;
    if (group.includes("无通假") || sentence.includes("同初中，高中不重复录入")) return;

    const { term, target, targetNote } = parseTarget(group);
    const sourceTitle = rawWorkTitle
      .replace(/【[^】]*】/g, "")
      .replace(/[（(](?:和初中篇目重复|新版教材|旧版教材|保留备注)[^）)]*[）)]$/g, "")
      .trim();
    const works = resolveWorks(sourceTitle);
    const key = `${works.map((work) => work.id).join(",")}|${term}|${sentence}`;
    if (seen.has(key)) return;
    seen.add(key);

    const entry = {
      id: `tongjia-${crypto.createHash("sha1").update(key).digest("hex").slice(0, 10)}`,
      term,
      target,
      targetNote,
      meaning,
      sentence,
      translation,
      sourceTitle,
      workIds: works.map((work) => work.id)
    };
    entries.push(entry);
    if (!works.length) unmatched.push(entry);
  });

const output = {
  source: "文言文.txt",
  generatedAt: new Date().toISOString(),
  entryCount: entries.length,
  matchedCount: entries.filter((entry) => entry.workIds.length).length,
  unmatched,
  entries
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(
  `已导入 ${output.entryCount} 条通假字，匹配 ${output.matchedCount} 条，未匹配 ${output.unmatched.length} 条。`
);
if (unmatched.length) {
  console.log(`未匹配篇目：${[...new Set(unmatched.map((entry) => entry.sourceTitle))].join("、")}`);
}
