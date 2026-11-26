import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const source = fs.readFileSync(path.join(root, "文言文.txt"), "utf8").replace(/\r/g, "");
const dataPath = path.join(root, "data.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const lines = source.split("\n").map((line) => line.trim());
const write = process.argv.includes("--write");

const sectionPattern = /^(?:[一二三四五六]年级[上下]册)$/;
const markerPattern = /^\d+｜(.+)$/;

const entries = [];
let section = "";
let isPrimarySection = false;

for (let index = 0; index < lines.length; index += 1) {
  const line = lines[index];
  if (sectionPattern.test(line)) {
    section = line;
    isPrimarySection = true;
    continue;
  }
  if (/^(?:[七八九]年级[上下]册|必修[上下]册|选择性必修[上中下]册)$/.test(line)) {
    section = line;
    isPrimarySection = false;
    continue;
  }
  if (!line || !markerPattern.test(line) || !isPrimarySection) continue;

  let next = index + 1;
  while (next < lines.length && !lines[next]) next += 1;
  if (lines[next] !== "【原文】") continue;

  let end = index + 1;
  while (end < lines.length) {
    if (end > index + 1 && (sectionPattern.test(lines[end]) || markerPattern.test(lines[end]))) break;
    end += 1;
  }

  const parts = line.split("｜");
  const block = lines.slice(index + 1, end);
  entries.push({
    section,
    heading: line,
    sourceIndex: index + 1,
    title: parts[1].trim(),
    author: (parts[2] || "佚名").trim(),
    dynasty: (parts[3] || "").trim(),
    original: sectionText(block, "【原文】", ["【注释】", "【译文】"]),
    annotations: parseAnnotations(sectionText(block, "【注释】", ["【译文】"])),
    translation: sectionText(block, "【译文】", [])
  });
}

function sectionText(block, startMarker, endMarkers) {
  const start = block.findIndex((line) => line === startMarker);
  if (start < 0) return "";
  let end = block.length;
  for (let index = start + 1; index < block.length; index += 1) {
    if (endMarkers.includes(block[index])) {
      end = index;
      break;
    }
  }
  return block.slice(start + 1, end).join("\n").trim();
}

function parseAnnotations(text) {
  if (!text) return [];
  const result = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^([^：:]+)[：:]\s*(.+)$/);
    if (match) result.push({ term: match[1].trim(), note: match[2].trim() });
    else if (result.length) result[result.length - 1].note += ` ${trimmed}`;
  }
  return result;
}

function titleKey(title) {
  return title
    .replace(/[《》]/g, "")
    .replace(/[（(](节选|并序)[）)]/g, "")
    .replace(/并序$/, "")
    .replace(/\s+/g, "")
    .trim();
}

function placeKey(title) {
  return titleKey(title)
    .replace(/[（(](其一|其二|其二十五|其三十一|其五)[）)]/g, "")
    .replace(/并序$/, "");
}

const dynastyIds = {
  唐: "tang",
  宋: "song",
  元: "yuan",
  明: "ming",
  清: "qing",
  汉: "han",
  北朝: "nanbeichao",
  现代: "modern",
  周: "zhou",
  春秋: "zhou",
  战国: "zhou"
};

const dynastyNames = {
  唐: "唐",
  宋: "宋",
  元: "元",
  明: "明",
  清: "清",
  汉: "汉",
  北朝: "北朝",
  现代: "近现代",
  周: "周",
  古代: "古代·佚名",
  春秋: "春秋",
  战国: "战国"
};

const eraBackground = {
  tang: "唐代诗歌题材开阔、格律成熟，是小学古诗学习的重要阶段。",
  song: "宋代城市、教育与印刷发展，诗词中的日常生活和家国情怀都很鲜明。",
  yuan: "元代散曲与文人题画诗并行，语言往往自然直白。",
  ming: "明代诗文重视个人情志，儿童读本与蒙学教育也逐渐普及。",
  qing: "清代古诗承续前代传统，晚清作品开始出现时代变局的气息。",
  han: "汉代乐府与五言诗发展，民歌和文人诗共同丰富了诗歌表达。",
  nanbeichao: "南北朝乐府民歌与山水诗相互辉映，题材质朴而开阔。",
  zhou: "先秦诗歌奠基了中国诗歌的比兴传统，《诗经》对后世影响深远。",
  modern: "近现代诗歌继承古典形式，也回应民族危机与革命历程。"
};

const authorYears = {
  骆宾王: 619, 李绅: 772, 李白: 701, 李峤: 645, 孟浩然: 689, 贾岛: 779,
  白居易: 772, 杨万里: 1127, 王之涣: 688, 高鼎: 1828, 贺知章: 659, 杜甫: 712,
  杜牧: 803, 苏轼: 1037, 叶绍翁: 1194, 王昌龄: 698, 曾几: 1084, 王安石: 1021,
  王维: 701, 卢钺: 1220, 王翰: 687, 李清照: 1084, 范成大: 1126, 辛弃疾: 1140,
  罗隐: 833, 卢纶: 739, 王冕: 1287, 虞世南: 558, 林杰: 831, 陆游: 1125,
  林升: 1180, 龚自珍: 1792, 雷震: 1200, 孟郊: 751, 韩翃: 719, 王建: 767,
  王观: 1035, 黄庭坚: 1045, 王勃: 650, 毛泽东: 1893
};

const places = {
  咏鹅: ["义乌", "婺州义乌", "浙江义乌", 29.306, 120.075],
  江南: ["江南水乡", "江南", "江苏苏州一带", 31.3, 120.6, "汉乐府民歌，地点为江南水乡意象示意。"],
  画: ["地点不详", "无特定地点", "—", null, null, "题画诗作者与时代不详，未设置地图点位。"],
  悯农: ["湖州", "吴兴", "浙江湖州", 30.89, 120.09],
  古朗月行: ["江油", "绵州昌隆", "四川江油", 31.778, 104.745, "创作地点有异说，以李白少年成长地示意。"],
  风: ["长安", "唐都长安", "陕西西安", 34.341, 108.94],
  春晓: ["襄阳", "襄州襄阳", "湖北襄阳", 32.009, 112.122],
  赠汪伦: ["桃花潭", "泾县桃花潭", "安徽泾县", 30.48, 118.33],
  静夜思: ["扬州", "扬州", "江苏扬州", 32.394, 119.413, "具体创作地有异说，此处以李白漫游江南时期作示意。"],
  寻隐者不遇: ["终南山", "京兆终南山", "陕西西安南", 34.02, 108.9],
  池上: ["洛阳", "东都洛阳", "河南洛阳", 34.619, 112.454],
  小池: ["吉水", "吉州吉水", "江西吉水", 27.2, 115.13],
  登鹳雀楼: ["蒲州", "河中府蒲州", "山西永济", 34.85, 110.32],
  望庐山瀑布: ["庐山", "江州庐山", "江西九江", 29.56, 115.98],
  敕勒歌: ["敕勒川", "敕勒川", "内蒙古中南部", 40.8, 111.7, "北朝民歌，地点为敕勒川区域示意。"],
  村居: ["杭州", "杭州府", "浙江杭州", 30.274, 120.155, "具体创作地无确考，此处以作者主要活动地示意。"],
  咏柳: ["长安", "唐都长安", "陕西西安", 34.341, 108.94],
  赋得古原草送别: ["长安", "唐都长安", "陕西西安", 34.341, 108.94],
  晓出净慈寺送林子方: ["杭州", "临安净慈寺", "浙江杭州", 30.246, 120.145],
  绝句: ["成都", "成都草堂", "四川成都", 30.659, 104.066],
  山行: ["池州", "池州", "安徽池州", 30.66, 117.49, "具体创作地无确考，此处以杜牧任池州刺史时期示意。"],
  赠刘景文: ["杭州", "杭州", "浙江杭州", 30.274, 120.155],
  夜书所见: ["临安", "临安", "浙江杭州", 30.274, 120.155, "具体创作地无确考，此处以作者活动区域示意。"],
  望天门山: ["天门山", "当涂天门山", "安徽马鞍山", 31.63, 118.5],
  饮湖上初晴后雨: ["西湖", "杭州西湖", "浙江杭州", 30.246, 120.145],
  采莲曲: ["江南", "江南水乡", "江苏苏州一带", 31.3, 120.6, "诗写江南采莲，地点为区域示意。"],
  惠崇春江晚景: ["汴京", "北宋东京", "河南开封", 34.797, 114.307, "题画诗，地点按苏轼题画时活动地示意。"],
  三衢道中: ["衢州", "衢州三衢山", "浙江衢州", 28.97, 118.87],
  忆江南: ["洛阳", "东都洛阳", "河南洛阳", 34.619, 112.454, "词忆江南，创作地按白居易晚年居洛阳示意。"],
  元日: ["汴京", "北宋东京", "河南开封", 34.797, 114.307],
  清明: ["池州", "池州", "安徽池州", 30.66, 117.49, "具体创作地无确考，此处以杜牧任池州刺史时期示意。"],
  九月九日忆山东兄弟: ["长安", "唐都长安", "陕西西安", 34.341, 108.94, "王维少年在长安、洛阳一带，具体作地无确考。"],
  暮江吟: ["杭州", "杭州", "浙江杭州", 30.274, 120.155, "创作地点有异说，此处以白居易赴杭州任职时期示意。"],
  题西林壁: ["庐山", "江州庐山", "江西九江", 29.56, 115.98],
  雪梅: ["临安", "临安", "浙江杭州", 30.274, 120.155, "具体创作地无确考，此处以南宋文人活动地示意。"],
  出塞: ["玉门关", "玉门关", "甘肃敦煌西北", 40.36, 93.86, "边塞诗地名具有泛指性，此处以玉门关作边塞意象示意。"],
  凉州词: ["凉州", "凉州", "甘肃武威", 37.93, 102.64],
  夏日绝句: ["乌江", "乌江亭", "安徽和县", 31.72, 118.36],
  四时田园杂兴: ["石湖", "平江府石湖", "江苏苏州", 31.28, 120.59],
  宿新市徐公店: ["新市", "新市镇", "浙江德清", 30.61, 120.29],
  清平乐·村居: ["带湖", "信州上饶带湖", "江西上饶", 28.455, 117.943],
  江畔独步寻花: ["成都", "成都草堂", "四川成都", 30.659, 104.066],
  蜂: ["长安", "唐都长安", "陕西西安", 34.341, 108.94, "具体创作地无确考，此处以罗隐活动中心示意。"],
  独坐敬亭山: ["宣城", "宣州宣城", "安徽宣城", 30.94, 118.758],
  芙蓉楼送辛渐: ["润州", "润州", "江苏镇江", 32.188, 119.425],
  塞下曲: ["阴山", "阴山边塞", "内蒙古中部", 41.2, 111.5, "边塞地点为诗歌意境示意。"],
  墨梅: ["诸暨", "诸暨", "浙江诸暨", 29.71, 120.24],
  蝉: ["长安", "唐都长安", "陕西西安", 34.341, 108.94],
  乞巧: ["福州", "福州", "福建福州", 26.074, 119.296, "具体创作地无确考，此处以林杰故里活动区域示意。"],
  示儿: ["山阴", "绍兴府山阴", "浙江绍兴", 30.0, 120.58],
  题临安邸: ["临安", "南宋都城临安", "浙江杭州", 30.274, 120.155],
  己亥杂诗: ["北京", "京师", "北京", 39.904, 116.407, "龚自珍辞官南归前后所作，此处以京师活动地示意。"],
  稚子弄冰: ["吉水", "吉州吉水", "江西吉水", 27.2, 115.13],
  村晚: ["杭州", "杭州", "浙江杭州", 30.274, 120.155, "作者生平资料较少，地点为江南乡村意象示意。"],
  游子吟: ["溧阳", "溧阳", "江苏溧阳", 31.43, 119.48],
  鸟鸣涧: ["若耶溪", "越州若耶溪", "浙江绍兴", 29.9, 120.6],
  从军行: ["青海", "青海边塞", "青海东部", 36.7, 101.0, "边塞地点为诗歌意境示意。"],
  秋夜将晓出篱门迎凉有感: ["山阴", "绍兴府山阴", "浙江绍兴", 30.0, 120.58],
  闻官军收河南河北: ["梓州", "梓州", "四川三台", 31.1, 105.0],
  宿建德江: ["建德江", "睦州建德", "浙江建德", 29.47, 119.28],
  六月二十七日望湖楼醉书: ["望湖楼", "杭州望湖楼", "浙江杭州", 30.25, 120.15],
  西江月·夜行黄沙道中: ["黄沙岭", "信州黄沙岭", "江西上饶", 28.455, 117.943],
  过故人庄: ["襄阳", "襄州襄阳", "湖北襄阳", 32.009, 112.122],
  七律·长征: ["延安", "陕北", "陕西延安", 36.585, 109.49, "诗作于长征胜利前后，地图以陕北会师与革命根据地示意。"],
  菩萨蛮·大柏地: ["大柏地", "瑞金大柏地", "江西瑞金", 25.9, 115.9],
  采薇: ["镐京", "西周镐京", "陕西西安", 34.25, 108.75, "《诗经》篇目，创作地与具体年代无确考，此处以西周王畿示意。"],
  春夜洛城闻笛: ["洛阳", "东都洛阳", "河南洛阳", 34.619, 112.454],
  送杜少府之任蜀州: ["长安", "唐都长安", "陕西西安", 34.341, 108.94],
  游园不值: ["临安", "临安", "浙江杭州", 30.274, 120.155, "具体创作地无确考，此处以作者活动区域示意。"],
  卜算子·送鲍浩然之浙东: ["汴京", "北宋东京", "河南开封", 34.797, 114.307],
  浣溪沙: ["蕲水", "黄州蕲水", "湖北浠水", 30.45, 115.26],
  清平乐: ["宜州", "宜州", "广西宜州", 24.49, 108.67, "黄庭坚晚年贬居宜州，具体作地有异说。"],
  迢迢牵牛星: ["洛阳", "东汉洛阳", "河南洛阳", 34.619, 112.454, "《古诗十九首》作者与创作地不详，以东汉文人活动中心示意。"],
  寒食: ["长安", "唐都长安", "陕西西安", 34.341, 108.94],
  十五夜望月: ["长安", "唐都长安", "陕西西安", 34.341, 108.94]
};

const existingKeys = new Set(data.works.map((work) => `${titleKey(work.title)}|${work.author}`));
const existingSourceKeys = new Set(data.works.map((work) => work.sourceKey).filter(Boolean));
const newWorks = [];
const skipped = [];

entries.forEach((entry, index) => {
  const key = `${titleKey(entry.title)}|${entry.author}`;
  const sourceKey = `文言文.txt::${entry.section}::${entry.title}`;
  if (existingSourceKeys.has(sourceKey) || existingKeys.has(key)) {
    skipped.push(entry.title);
    return;
  }
  const place = places[placeKey(entry.title)];
  if (!place) {
    console.warn(`缺少地点配置：${entry.title}`);
    return;
  }
  const sourceDynasty =
    entry.dynasty ||
    ({
      汉乐府: "汉",
      北朝民歌: "北朝",
      "《诗经》": "周",
      古诗十九首: "汉",
      佚名: "古代"
    })[entry.author] ||
    "古代";
  const dynastyId = dynastyIds[sourceDynasty] || (entry.author === "古诗十九首" ? "han" : "tang");
  const dynasty = dynastyNames[sourceDynasty] || sourceDynasty;
  const [name, ancient, modern, lat, lng, note] = place;
  const hasLocation = lat !== null && lat !== undefined && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
  const authorYear = authorYears[entry.author] || 1000;
  newWorks.push({
    id: `primary-${String(index + 1).padStart(3, "0")}`,
    sourceKey,
    title: entry.title,
    author: entry.author,
    dynastyId,
    dynasty,
    year:
      entry.title === "七律·长征"
        ? "1935年10月"
        : entry.title === "菩萨蛮·大柏地"
          ? "1933年夏"
          : entry.dynasty === "现代"
            ? "近现代"
        : entry.dynasty
          ? `${entry.dynasty}代`
          : sourceDynasty === "北朝"
            ? "北朝"
            : "创作年代不详",
    yearSort:
      entry.title === "七律·长征" ? 1935 : entry.title === "菩萨蛮·大柏地" ? 1933 : authorYear,
    place: {
      name,
      ancient,
      modern,
      ...(hasLocation ? { lat: Number(lat), lng: Number(lng) } : { located: false }),
      note: note || "小学教材篇目，具体创作地点无确考，此处作学习示意。"
    },
    level: "primary",
    levelLabel: "小学必读",
    textbook: entry.section,
    genre: entry.title.includes("七律")
      ? "七言律诗"
      : entry.title.includes("·") || entry.title.startsWith("忆江南")
        ? "词"
        : "古诗词",
    background: eraBackground[dynastyId] || "本诗为小学教材中的经典篇目，可从意象、节奏与情感入手理解。",
    original: entry.original,
    annotations: entry.annotations,
    translation: entry.translation,
    sourceNote: "原文、注释与译文据用户提供的《文言文.txt》整理；创作地点与年代有异说，以学习示意为准。"
  });
});

const invalid = newWorks.filter((work) => !work.original || !work.translation || !work.annotations.length);
if (invalid.length) {
  console.error(`有 ${invalid.length} 篇缺少原文、译文或注释：`);
  invalid.forEach((work) => console.error(`- ${work.title}`));
  process.exitCode = 1;
}

console.log(`解析小学篇目 ${entries.length} 条；跳过已有 ${skipped.length} 条；待新增 ${newWorks.length} 条。`);
if (skipped.length) console.log(`跳过：${[...new Set(skipped)].join("、")}`);
newWorks.forEach((work) => console.log(`- ${work.textbook}｜${work.title}｜${work.place.name}`));

if (write && newWorks.length && !process.exitCode) {
  data.works.push(...newWorks);
  fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`已写入 data.json，篇目总数：${data.works.length}`);
}
