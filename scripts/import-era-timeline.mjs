import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(root, "时代轴.html");
const outputPath = path.join(root, "data", "era-timeline.json");
const source = fs.readFileSync(sourcePath, "utf8");

const dynastyStart = source.indexOf("const RAW_DYNASTIES");
const configStart = source.indexOf("const CONFIG");
const dynastyArrayStart = source.indexOf("[", dynastyStart);
const configObjectStart = source.indexOf("{", configStart);
const dynastyArray = extractBalanced(source, dynastyArrayStart, "[", "]");
const configObject = extractBalanced(source, configObjectStart, "{", "}");

if (!dynastyArray || !configObject) {
  throw new Error("未能从 时代轴.html 中解析 RAW_DYNASTIES 或 CONFIG");
}

const dynasties = vm.runInNewContext(`(${dynastyArray})`);
const config = vm.runInNewContext(`(${configObject})`);

const output = {
  source: "时代轴.html",
  generatedAt: new Date().toISOString(),
  config,
  dynasties
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`已导入 ${dynasties.length} 个时代/政权单元到 ${path.relative(root, outputPath)}。`);

function extractBalanced(text, start, open, close) {
  if (start < 0 || text[start] !== open) return "";
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      continue;
    }
    if (char === open) depth += 1;
    if (char === close) depth -= 1;
    if (depth === 0) return text.slice(start, index + 1);
  }
  return "";
}
