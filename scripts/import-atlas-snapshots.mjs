import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data.json"), "utf8"));
const outputDirectory = path.join(root, "data", "atlas");
const outputIndex = path.join(root, "data", "map-atlas.json");
const sourceBase = "https://fastly.jsdelivr.net/gh/DeanChensj/jiangshan-map@main";
const sourceLicenseUrl = `${sourceBase}/LICENSE`;
const forceRefresh = process.argv.includes("--force");

const sourceSnapshots = {
  "zhou-403": ["s_zhanguo_a", -403, "战国初期 · 七雄并立"],
  "zhou-260": ["s_zhanguo_c", -260, "战国后期 · 长平之战后"],
  "qin-221": ["s_qin_a", -221, "秦统一六国初年"],
  "qin-207": ["s_qin_d", -207, "秦末天下大乱"],
  "han-bc127": ["s_xihan_a", -127, "西汉武帝时期"],
  "han-bc60": ["s_xihan_b", -60, "西汉中后期"],
  "han-91": ["s_donghan_c", 91, "东汉中期"],
  "han-208": ["s_donghan_d", 208, "东汉末年 · 赤壁之战"],
  "sanguo-238": ["s_sanguo_a", 238, "三国中期"],
  "sanguo-280": ["s_sanguo_c", 280, "三国末期 · 西晋将统"],
  "jin-306": ["s_xijin", 306, "西晋末年"],
  "jin-420": ["s_dongjin_f", 420, "东晋末年"],
  "nanbei-469": ["s_nanbei_a", 469, "南北朝中期"],
  "nanbei-534": ["s_nanbei_c", 534, "北魏分裂前后"],
  "nanbei-581": ["s_nanbei_f", 581, "南北朝末期"],
  "sui-587": ["s_sui_a", 587, "隋灭陈前夕"],
  "sui-609": ["s_sui", 609, "隋朝鼎盛"],
  "tang-621": ["s_tang_0", 621, "唐朝初建"],
  "tang-755": ["s_tang_a5", 755, "天宝十四载 · 安史之乱前夕"],
  "tang-840": ["s_tang_b", 840, "晚唐中期"],
  "tang-907": ["s_tang_d2", 907, "唐朝末年"],
  "song-960": ["s_beisong_a0", 960, "北宋建立"],
  "song-1072": ["s_beisong_b", 1072, "北宋中期 · 变法时期"],
  "song-1206": ["s_nansong_a", 1206, "南宋中期"],
  "song-1279": ["s_nansong_g", 1279, "南宋末年"],
  "yuan-1288": ["s_yuan_a", 1288, "元朝统一初期"],
  "yuan-1367": ["s_yuan_c", 1367, "元末群雄并起"],
  "ming-1369": ["s_ming_0a", 1369, "明初"],
  "ming-1616": ["s_ming_b", 1616, "明末"],
  "ming-1636": ["s_ming_c0", 1636, "皇太极称帝 · 明末"],
  "ming-1644": ["s_ming_c2", 1644, "明朝灭亡"],
  "qing-1645": ["s_qing_a00", 1645, "清初"],
  "qing-1796": ["s_qing_d", 1796, "清中期"],
  "qing-1912": ["s_qing_g", 1912, "清朝灭亡"],
  "modern-1916": ["s_roc_a0", 1916, "民国初年"],
  "modern-1945": ["s_roc", 1945, "抗日战争胜利"]
};

const periodDefinitions = [
  {
    id: "xia",
    start: -2070,
    end: -1600,
    defaultYear: -2070,
    builtIn: ["data/geo/xia.geojson", -2070, "夏代核心区域（示意）"]
  },
  {
    id: "shang",
    start: -1600,
    end: -1046,
    defaultYear: -1600,
    builtIn: ["data/geo/shang.geojson", -1600, "商代核心区域（示意）"]
  },
  {
    id: "zhou",
    start: -1046,
    end: -256,
    defaultYear: -1046,
    builtIn: ["data/geo/zhou.geojson", -1046, "西周前期（示意）"],
    sources: ["zhou-403", "zhou-260"]
  },
  { id: "qin", start: -221, end: -207, defaultYear: -221, sources: ["qin-221", "qin-207"] },
  {
    id: "han",
    start: -202,
    end: 220,
    defaultYear: -60,
    sources: ["han-bc127", "han-bc60", "han-91", "han-208"]
  },
  {
    id: "sanguo",
    start: 220,
    end: 280,
    defaultYear: 238,
    sources: ["sanguo-238", "sanguo-280"]
  },
  {
    id: "jin",
    start: 266,
    end: 420,
    defaultYear: 306,
    sources: ["jin-306", "jin-420"]
  },
  {
    id: "nanbeichao",
    start: 420,
    end: 589,
    defaultYear: 534,
    sources: ["nanbei-469", "nanbei-534", "nanbei-581"]
  },
  {
    id: "sui",
    start: 581,
    end: 618,
    defaultYear: 609,
    sources: ["sui-587", "sui-609"]
  },
  {
    id: "tang",
    start: 618,
    end: 907,
    defaultYear: 755,
    sources: ["tang-621", "tang-755", "tang-840", "tang-907"]
  },
  {
    id: "song",
    start: 960,
    end: 1279,
    defaultYear: 1072,
    sources: ["song-960", "song-1072", "song-1206", "song-1279"]
  },
  {
    id: "yuan",
    start: 1271,
    end: 1368,
    defaultYear: 1288,
    sources: ["yuan-1288", "yuan-1367"]
  },
  {
    id: "ming",
    start: 1368,
    end: 1644,
    defaultYear: 1427,
    sources: ["ming-1369", "ming-1616", "ming-1636", "ming-1644"]
  },
  {
    id: "qing",
    start: 1644,
    end: 1911,
    defaultYear: 1796,
    sources: ["qing-1645", "qing-1796", "qing-1912"]
  },
  {
    id: "modern",
    start: 1912,
    end: 1949,
    defaultYear: 1916,
    sources: ["modern-1916", "modern-1945"]
  }
];

const colorsByRole = {
  primary: "#9b3d2f",
  rival: "#8b7653",
  protectorate: "#8a6842",
  neighbor: "#8c887e"
};

fs.mkdirSync(outputDirectory, { recursive: true });

function getPath(item) {
  return path.join(outputDirectory, `${item[0]}.geojson`);
}

function formatYear(year) {
  return year < 0 ? `前${Math.abs(year)}年` : `${year}年`;
}

function squareSegmentDistance(point, start, end) {
  let x = start[0];
  let y = start[1];
  let dx = end[0] - x;
  let dy = end[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = end[0];
      y = end[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = point[0] - x;
  dy = point[1] - y;
  return dx * dx + dy * dy;
}

function simplifyLine(points, tolerance) {
  if (points.length <= 4) return points;
  const squaredTolerance = tolerance * tolerance;
  const markers = new Uint8Array(points.length);
  const stack = [[0, points.length - 1]];
  markers[0] = 1;
  markers[points.length - 1] = 1;
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxDistance = squaredTolerance;
    let index = -1;
    for (let i = first + 1; i < last; i += 1) {
      const distance = squareSegmentDistance(points[i], points[first], points[last]);
      if (distance > maxDistance) {
        index = i;
        maxDistance = distance;
      }
    }
    if (index >= 0) {
      markers[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, index) => markers[index]);
}

function simplifyRing(ring) {
  if (!Array.isArray(ring) || ring.length < 4) return [];
  const points = ring.slice(0, -1).map(([lng, lat]) => [
    Math.round(lng * 1000) / 1000,
    Math.round(lat * 1000) / 1000
  ]);
  const simplified = simplifyLine(points, 0.025);
  if (simplified.length < 3) return [];
  simplified.push(simplified[0]);
  return simplified;
}

function simplifyGeometry(geometry) {
  if (!geometry) return null;
  if (geometry.type === "Polygon") {
    const coordinates = geometry.coordinates.map(simplifyRing).filter((ring) => ring.length >= 4);
    return coordinates.length ? { type: "Polygon", coordinates } : null;
  }
  if (geometry.type === "MultiPolygon") {
    const coordinates = geometry.coordinates
      .map((polygon) => polygon.map(simplifyRing).filter((ring) => ring.length >= 4))
      .filter((polygon) => polygon.length);
    return coordinates.length ? { type: "MultiPolygon", coordinates } : null;
  }
  return null;
}

function boundsOfGeometry(geometry) {
  const positions = [];
  const flatten = (coordinates) => {
    if (Array.isArray(coordinates?.[0]) && typeof coordinates[0][0] === "number") {
      coordinates.forEach((point) => positions.push(point));
      return;
    }
    coordinates?.forEach(flatten);
  };
  flatten(geometry.coordinates);
  const xs = positions.map((point) => point[0]);
  const ys = positions.map((point) => point[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

async function fetchText(url) {
  let lastError;
  const cacheDirectory = process.env.ATLAS_SOURCE_CACHE_DIR;
  if (cacheDirectory) {
    const cachedFile = path.join(cacheDirectory, path.basename(new URL(url).pathname));
    if (fs.existsSync(cachedFile)) return fs.readFileSync(cachedFile, "utf8");
  }
  const candidates = [
    url,
    url.replace("https://fastly.jsdelivr.net/gh/", "https://cdn.jsdelivr.net/gh/"),
    url.replace("https://fastly.jsdelivr.net/gh/", "https://raw.githubusercontent.com/")
  ];
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        headers: { "User-Agent": "shanhe-you-shi-map-import" },
        signal: AbortSignal.timeout(45000)
      });
      if (response.ok) return response.text();
      lastError = new Error(`HTTP ${response.status}: ${candidate}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 450));
  }

  const repositoryPath = url.match(
    /jsdelivr\.net\/gh\/DeanChensj\/jiangshan-map@main\/(.+)$/
  )?.[1];
  if (repositoryPath) {
    try {
      const payload = fetchJsonWithCurl(
        `https://api.github.com/repos/DeanChensj/jiangshan-map/contents/${repositoryPath}?ref=main`
      );
      if (payload.content) {
        return Buffer.from(payload.content.replace(/\s/g, ""), "base64").toString("utf8");
      }
      if (payload.sha) {
        const blob = fetchJsonWithCurl(
          `https://api.github.com/repos/DeanChensj/jiangshan-map/git/blobs/${payload.sha}`
        );
        if (blob.content) {
          return Buffer.from(blob.content.replace(/\s/g, ""), "base64").toString("utf8");
        }
      }
    } catch {}
  }

  for (const candidate of candidates) {
    const temporaryFile = path.join(
      os.tmpdir(),
      `shanhe-atlas-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
    );
    const curl = spawnSync(
      process.platform === "win32" ? "curl.exe" : "curl",
      ["-L", "--fail", "--max-time", "120", "-o", temporaryFile, candidate],
      { encoding: "utf8" }
    );
    try {
      if (curl.status === 0 && fs.existsSync(temporaryFile)) {
        return fs.readFileSync(temporaryFile, "utf8");
      }
    } finally {
      fs.rmSync(temporaryFile, { force: true });
    }
    lastError = new Error(curl.stderr || `curl failed: ${candidate}`);
  }
  throw lastError;
}

function fetchJsonWithCurl(url) {
  const temporaryFile = path.join(
    os.tmpdir(),
    `shanhe-atlas-api-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
  );
  const curl = spawnSync(
    process.platform === "win32" ? "curl.exe" : "curl",
    [
      "-sS",
      "-L",
      "--fail",
      "--max-time",
      "120",
      "-H",
      "Accept: application/vnd.github+json",
      "-H",
      "User-Agent: shanhe-you-shi-map-import",
      "-o",
      temporaryFile,
      url
    ],
    { encoding: "utf8" }
  );
  try {
    if (curl.status !== 0 || !fs.existsSync(temporaryFile)) {
      throw new Error(curl.stderr || `curl failed: ${url}`);
    }
    return JSON.parse(fs.readFileSync(temporaryFile, "utf8"));
  } finally {
    fs.rmSync(temporaryFile, { force: true });
  }
}

async function importSnapshot(key, sourceSnapshot) {
  const [sourceId, year, label] = sourceSnapshot;
  const destination = getPath([key]);
  if (!forceRefresh && fs.existsSync(destination)) {
    try {
      const cached = JSON.parse(fs.readFileSync(destination, "utf8"));
      if (cached.features?.length) {
        console.log(`${key}: 使用已缓存快照（${cached.features.length} features）`);
        return {
          id: key,
          year,
          yearLabel: formatYear(year),
          label,
          geojson: `data/atlas/${key}.geojson`,
          source: "jiangshan-polity",
          featureCount: cached.features.length
        };
      }
    } catch {}
  }
  const sourceUrl = `${sourceBase}/data/atlas/${sourceId.startsWith("s_zhanguo") ? "zhanguo" : sourceId.startsWith("s_qin") ? "qin" : sourceId.startsWith("s_xihan") ? "xihan" : sourceId.startsWith("s_donghan") ? "donghan" : sourceId.startsWith("s_sanguo") ? "sanguo" : sourceId.startsWith("s_xijin") ? "xijin" : sourceId.startsWith("s_dongjin") ? "dongjin" : sourceId.startsWith("s_nanbei") ? "nanbei" : sourceId.startsWith("s_sui") ? "sui" : sourceId.startsWith("s_tang") ? "tang" : sourceId.startsWith("s_beisong") ? "beisong" : sourceId.startsWith("s_nansong") ? "nansong" : sourceId.startsWith("s_yuan") ? "yuan" : sourceId.startsWith("s_ming") ? "ming" : sourceId.startsWith("s_qing") ? "qing" : "roc"}/${sourceId}.geojson`;
  const sourceGeoJSON = JSON.parse(await fetchText(sourceUrl));
  const features = [];
  for (const feature of sourceGeoJSON.features || []) {
    const role = feature.properties?.role;
    if (!["main", "rival", "protectorate", "neighbor"].includes(role)) continue;
    const geometry = simplifyGeometry(feature.geometry);
    if (!geometry) continue;
    const title = String(feature.properties?.title || "").trim();
    if (!title) continue;
    features.push({
      type: "Feature",
      properties: {
        name: title,
        role:
          role === "main"
            ? "primary"
            : role === "neighbor"
              ? "neighbor"
              : "context",
        sourceRole: role,
        color: feature.properties?.tint || colorsByRole[role],
        anchor: feature.properties?.anchor || null,
        bbox: boundsOfGeometry(geometry)
      },
      geometry
    });
  }

  let primary = features.find((feature) => feature.properties.role === "primary");
  if (!primary && features.length) {
    primary = [...features].sort((a, b) => {
      const areaA = (a.properties.bbox[2] - a.properties.bbox[0]) * (a.properties.bbox[3] - a.properties.bbox[1]);
      const areaB = (b.properties.bbox[2] - b.properties.bbox[0]) * (b.properties.bbox[3] - b.properties.bbox[1]);
      return areaB - areaA;
    })[0];
    primary.properties.role = "primary";
  }

  fs.writeFileSync(
    destination,
    `${JSON.stringify({ type: "FeatureCollection", features }, null, 0)}\n`,
    "utf8"
  );
  console.log(
    `${key}: ${features.length} features, ${Math.round(fs.statSync(destination).size / 1024)} KB`
  );
  return {
    id: key,
    year,
    yearLabel: formatYear(year),
    label,
    geojson: `data/atlas/${key}.geojson`,
    source: "jiangshan-polity",
    featureCount: features.length
  };
}

async function runWithLimit(items, limit, worker) {
  const results = [];
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

const sourceEntries = Object.entries(sourceSnapshots);
const importedSnapshots = await runWithLimit(sourceEntries, 1, async ([key, sourceSnapshot]) => {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await importSnapshot(key, sourceSnapshot);
    } catch (error) {
      lastError = error;
      console.log(`${key}: 第 ${attempt + 1} 次下载失败，准备重试`);
      await new Promise((resolve) => setTimeout(resolve, 900 * (attempt + 1)));
    }
  }
  throw lastError;
});
const importedByKey = new Map(importedSnapshots.map((snapshot) => [snapshot.id, snapshot]));

const periods = periodDefinitions.map((period) => {
  const dynasty = data.dynasties.find((item) => item.id === period.id);
  const snapshots = [];
  if (period.builtIn) {
    snapshots.push({
      id: `${period.id}-${Math.abs(period.builtIn[1])}${period.builtIn[1] < 0 ? "bce" : "ce"}`,
      year: period.builtIn[1],
      yearLabel: formatYear(period.builtIn[1]),
      label: period.builtIn[2],
      geojson: period.builtIn[0],
      source: "existing-approximation"
    });
  }
  for (const key of period.sources || []) snapshots.push(importedByKey.get(key));
  snapshots.sort((a, b) => a.year - b.year);
  return {
    id: period.id,
    name: dynasty?.name || period.id,
    startYear: period.start,
    endYear: period.end,
    defaultYear: period.defaultYear,
    snapshots: snapshots.filter(Boolean)
  };
});

fs.writeFileSync(
  outputIndex,
  `${JSON.stringify(
    {
      source: "江山时序（政权轮廓层，经字段过滤与简化）",
      sourceUrl: "https://github.com/DeanChensj/jiangshan-map",
      license: "GPL-3.0",
      generatedAt: new Date().toISOString(),
      notice:
        "仅提取政权轮廓，不包含受 CHGIS 条款限制的郡、州、府边界。疆域为教学示意，不是测绘边界。",
      globalStartYear: -2070,
      globalEndYear: 1949,
      periods
    },
    null,
    2
  )}\n`,
  "utf8"
);

const licensePath = path.join(outputDirectory, "LICENSE-GPL-3.0.txt");
if (forceRefresh || !fs.existsSync(licensePath)) {
  const licenseText = await fetchText(sourceLicenseUrl);
  fs.writeFileSync(licensePath, licenseText, "utf8");
}

const totalSnapshots = periods.reduce((total, period) => total + period.snapshots.length, 0);
console.log(`已生成 ${periods.length} 个时期、${totalSnapshots} 个疆域阶段。`);
