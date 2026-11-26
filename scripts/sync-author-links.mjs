import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data.json"), "utf8"));
const detailPath = path.join(root, "detail.txt");
const outputPath = path.join(root, "data", "author-links.json");

if (!fs.existsSync(detailPath)) {
  console.error("未找到 detail.txt");
  process.exit(1);
}

const lines = fs.readFileSync(detailPath, "utf8").replace(/\r/g, "").split("\n");
const urlPattern = /https?:\/\/[^\s，,；;]+/g;
const linksByAuthor = {};
const unmatched = [];
let matchedCount = 0;

for (const rawLine of lines) {
  const line = rawLine.trim();
  if (!line) continue;
  const urls = line.match(urlPattern) || [];
  if (!urls.length) continue;
  const firstUrlIndex = line.indexOf(urls[0]);
  const rawName = line.slice(0, firstUrlIndex).replace(/[：:\-—\s]+$/g, "").trim();
  if (!rawName) continue;
  const author = findAuthor(rawName);
  for (const [index, url] of urls.entries()) {
    const entry = {
      name: rawName,
      title: urls.length > 1 ? `讲解视频 ${index + 1}` : "作者讲解视频",
      url: url.replace(/[。；;，,]+$/, "")
    };
    if (!author) {
      unmatched.push(entry);
      continue;
    }
    if (!linksByAuthor[author.id]) linksByAuthor[author.id] = [];
    linksByAuthor[author.id].push(entry);
    matchedCount += 1;
  }
}

function normalizeName(value) {
  return String(value)
    .replace(/[《》〈〉“”‘’（）()、，。；：！？·\s—…-]/g, "")
    .toLowerCase();
}

function findAuthor(rawName) {
  const normalized = normalizeName(rawName);
  return data.authors.find((author) => {
    const candidates = [author.name, author.alias, ...(author.aliases || [])].map(normalizeName);
    return candidates.some(
      (candidate) =>
        candidate === normalized ||
        (candidate.length > 1 && normalized.includes(candidate)) ||
        (normalized.length > 1 && candidate.includes(normalized))
    );
  });
}

const output = {
  generatedAt: new Date().toISOString(),
  source: "detail.txt",
  matchedCount,
  unmatched,
  authors: linksByAuthor
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`已同步 ${matchedCount} 条作者链接，覆盖 ${Object.keys(linksByAuthor).length} 位作者。`);
if (unmatched.length) {
  console.log(`未匹配 ${unmatched.length} 条：${[...new Set(unmatched.map((item) => item.name))].join("、")}`);
}
