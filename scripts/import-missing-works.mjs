import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(root, "文言文.txt");
const dataPath = path.join(root, "data.json");
const write = process.argv.includes("--write");

const lines = fs.readFileSync(sourcePath, "utf8").replace(/\r/g, "").split("\n").map((line) => line.trim());
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

const sectionPattern = /^(?:[一二三四五六七八九]年级[上下]册|必修[上下]册|选择性必修[上中下]册)$/;
const markerPattern = /^(?:\d+｜.+|\d+[.、]\s*.+)$/;

const rawEntries = [];
let section = "";

for (let index = 0; index < lines.length; index += 1) {
  const line = lines[index];
  if (sectionPattern.test(line)) {
    section = line;
    continue;
  }
  if (!line || !markerPattern.test(line)) continue;

  let next = index + 1;
  while (next < lines.length && !lines[next]) next += 1;
  if (lines[next] !== "【原文】") continue;

  let end = index + 1;
  while (end < lines.length) {
    if (end > index + 1 && (sectionPattern.test(lines[end]) || markerPattern.test(lines[end]))) break;
    end += 1;
  }

  const block = lines.slice(index + 1, end);
  rawEntries.push({
    section,
    heading: line,
    title: cleanHeading(line),
    original: sectionText(block, "【原文】", ["【注释】", "【译文】"]),
    annotations: parseAnnotations(sectionText(block, "【注释】", ["【译文】"])),
    translation: sectionText(block, "【译文】", []),
    sourceLine: index + 1
  });
}

function cleanHeading(line) {
  if (line.includes("｜")) return line.split("｜")[1].trim();
  return line.replace(/^\d+[.、]\s*/, "").trim();
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
    if (match) {
      result.push({ term: match[1].trim(), note: match[2].trim() });
    } else if (result.length) {
      result[result.length - 1].note += ` ${trimmed}`;
    }
  }
  return result;
}

const meta = [
  {
    match: /^杞人忧天/,
    id: "qirenyoutian",
    author: "列御寇及后学",
    dynastyId: "zhou",
    dynasty: "战国·郑",
    year: "战国时期",
    yearSort: -350,
    place: ["圃田", "郑国圃田", "河南郑州", 34.75, 113.66],
    placeNote: "《列子》作者与成书地点有争议，此处以列子故里圃田作学习示意。",
    level: "junior",
    textbook: "七年级上册",
    genre: "寓言",
    background: "战国诸子善以寓言说理。《杞人忧天》借对天地崩坠的担忧，讨论人如何面对无端忧虑。"
  },
  {
    match: /^穿井得一人/,
    id: "chuanjingdeyiren",
    author: "吕不韦及门客",
    dynastyId: "qin",
    dynasty: "战国末·秦",
    year: "约前239年",
    yearSort: -239,
    place: ["咸阳", "秦国咸阳", "陕西咸阳", 34.333, 108.708],
    placeNote: "《吕氏春秋》编成于秦都咸阳；故事本身发生于宋国。",
    level: "junior",
    textbook: "七年级上册",
    genre: "寓言",
    background: "《吕氏春秋》汇集诸子学说，借“挖井得一人”的讹传说明传闻不可轻信。"
  },
  {
    match: /^闻王昌龄左迁龙标遥有此寄/,
    id: "wenwangchangling",
    author: "李白",
    authorId: "libai",
    dynastyId: "tang",
    dynasty: "盛唐",
    year: "约天宝八载（749）",
    yearSort: 749,
    place: ["扬州", "扬州", "江苏扬州", 32.394, 119.413],
    placeNote: "创作地有异说，通常系于李白在扬州听到王昌龄被贬消息时。",
    level: "junior",
    textbook: "七年级上册",
    genre: "七言绝句",
    background: "王昌龄被贬为龙标尉，李白闻讯远寄此诗，以明月寄托对友人的牵挂。"
  },
  {
    match: /^次北固山下/,
    id: "cibeigushanxia",
    author: "王湾",
    dynastyId: "tang",
    dynasty: "盛唐",
    year: "开元初年",
    yearSort: 713,
    place: ["北固山", "润州北固山", "江苏镇江", 32.219, 119.462],
    placeNote: "王湾往来吴楚间，泊舟北固山下时所作。",
    level: "junior",
    textbook: "七年级上册",
    genre: "五言律诗",
    background: "盛唐士人常经运河、长江往来求仕。诗中残夜海日与旧年江春，写出时序交替中的乡愁。"
  },
  {
    match: /^峨眉山月歌/,
    id: "emeishanyuege",
    author: "李白",
    authorId: "libai",
    dynastyId: "tang",
    dynasty: "盛唐",
    year: "开元十二年（724）",
    yearSort: 724,
    place: ["峨眉山", "嘉州峨眉山", "四川峨眉山", 29.52, 103.33],
    placeNote: "李白初离蜀地、顺江东下时所作，诗歌空间由峨眉山延伸至渝州。",
    level: "junior",
    textbook: "七年级上册",
    genre: "七言绝句",
    background: "青年李白初次出蜀远游，峨眉山月成为故乡与旅途之间的情感纽带。"
  },
  {
    match: /^江南逢李龟年/,
    id: "jiangnanfengliguinian",
    author: "杜甫",
    authorId: "dufu",
    dynastyId: "tang",
    dynasty: "中唐",
    year: "大历五年（770）",
    yearSort: 770,
    place: ["潭州", "潭州", "湖南长沙", 28.228, 112.938],
    placeNote: "杜甫晚年漂泊湖湘，在潭州遇见流落江南的宫廷乐师李龟年。",
    level: "junior",
    textbook: "七年级上册",
    genre: "七言绝句",
    background: "安史之乱后开元盛世崩解，两位昔日京城旧识在江南重逢，繁华与衰老形成强烈对照。"
  },
  {
    match: /^行军九日思长安故园/,
    id: "xingjunjiuri",
    author: "岑参",
    dynastyId: "tang",
    dynasty: "中唐",
    year: "至德二载（757）",
    yearSort: 757,
    place: ["凤翔", "凤翔府", "陕西凤翔", 34.52, 107.39],
    placeNote: "岑参随军收复长安途中重九登高，创作地有凤翔等说。",
    level: "junior",
    textbook: "七年级上册",
    genre: "五言绝句",
    background: "安史之乱中长安沦陷，诗人行军途中逢重阳，想到故园菊花可能正在战场旁开放。"
  },
  {
    match: /^夜上受降城闻笛/,
    id: "yeshangshoujiangcheng",
    author: "李益",
    dynastyId: "tang",
    dynasty: "中唐",
    year: "约贞元年间",
    yearSort: 790,
    place: ["受降城", "西受降城", "内蒙古巴彦淖尔一带", 41.1, 108.4],
    placeNote: "受降城具体位置与诗作年代有异说，此处取唐代西受降城作示意。",
    level: "junior",
    textbook: "七年级上册",
    genre: "七言绝句",
    background: "中唐边患长期存在，月夜芦笛触发戍边将士普遍的思乡情绪。"
  },
  {
    match: /^孙权劝学/,
    id: "sunquanquanxue",
    author: "司马光",
    dynastyId: "song",
    dynasty: "北宋",
    year: "元丰七年（1084）",
    yearSort: 1084,
    place: ["洛阳", "西京洛阳", "河南洛阳", 34.619, 112.454],
    placeNote: "《资治通鉴》由司马光主持编纂于洛阳；孙权劝学故事发生于三国吴地。",
    level: "junior",
    textbook: "七年级下册",
    genre: "史传散文",
    background: "《资治通鉴》以编年体总结历代治乱。孙权劝吕蒙读书一则强调学习能改变人的才略。"
  },
  {
    match: /^陋室铭/,
    id: "loushiming",
    author: "刘禹锡",
    dynastyId: "tang",
    dynasty: "中唐",
    year: "约长庆四年（824）",
    yearSort: 824,
    place: ["和州", "和州", "安徽和县", 31.717, 118.36],
    placeNote: "写作地点有和州、洛阳等说，此处取刘禹锡任和州刺史期间的通行说法。",
    level: "junior",
    textbook: "七年级下册",
    genre: "铭",
    background: "刘禹锡屡遭贬谪，以“陋室”自况，借屋室之陋反衬品德与精神生活之充实。"
  },
  {
    match: /^河中石兽/,
    id: "hezhongshishou",
    author: "纪昀",
    dynastyId: "qing",
    dynasty: "清",
    year: "约嘉庆三年（1798）",
    yearSort: 1798,
    place: ["北京", "京师", "北京", 39.904, 116.407],
    placeNote: "故事发生地在沧州，纪昀在北京阅微草堂整理《阅微草堂笔记》。",
    level: "junior",
    textbook: "七年级下册",
    genre: "笔记小说",
    background: "《阅微草堂笔记》借怪异见闻说理。河中石兽一则讽刺只凭书本和主观经验判断事物。"
  },
  {
    match: /^劝学/,
    id: "quanxue",
    author: "荀子",
    dynastyId: "zhou",
    dynasty: "战国·赵",
    year: "战国晚期",
    yearSort: -250,
    place: ["兰陵", "楚国兰陵", "山东兰陵", 34.85, 118.05],
    placeNote: "《劝学》为《荀子》首篇，创作地点不可确考，此处以荀子晚年居兰陵讲学作示意。",
    level: "senior",
    textbook: "必修上册",
    genre: "议论散文",
    background: "战国诸子竞相论学，荀子以比喻和排比强调后天学习、积累与环境的作用。"
  },
  {
    match: /^归园田居（其一）/,
    id: "guiyuantianju1",
    author: "陶渊明",
    authorId: "taoyuanming",
    dynastyId: "jin",
    dynasty: "东晋",
    year: "义熙元年（405）",
    yearSort: 405,
    place: ["柴桑", "浔阳柴桑", "江西九江", 29.705, 115.981],
    placeNote: "陶渊明辞彭泽令归田后所作，具体写作时间有异说。",
    level: "senior",
    textbook: "必修上册",
    genre: "五言古诗",
    background: "陶渊明不愿在官场中扭曲本性，归田后以质朴语言写重新获得自由的喜悦。"
  },
  {
    match: /^谏太宗十思疏/,
    id: "jiantaizongshisishu",
    author: "魏征",
    dynastyId: "tang",
    dynasty: "初唐",
    year: "贞观十一年（637）",
    yearSort: 637,
    place: ["长安", "唐都长安", "陕西西安", 34.341, 108.94],
    placeNote: "魏征任谏议大夫时在长安上疏唐太宗。",
    level: "senior",
    textbook: "必修下册",
    genre: "奏疏",
    background: "贞观之治走向稳定后，魏征提醒唐太宗居安思危，以“十思”约束君主权力。"
  },
  {
    match: /^咏雪/,
    id: "yongxue",
    author: "刘义庆",
    dynastyId: "nanbeichao",
    dynasty: "南朝宋",
    year: "约元嘉年间",
    yearSort: 440,
    place: ["建康", "南朝宋都城建康", "江苏南京", 32.06, 118.796],
    placeNote: "《世说新语》由刘义庆组织编撰于建康；谢家咏雪故事场景并非作者亲历。",
    level: "junior",
    textbook: "七年级上册",
    genre: "志人小说",
    background: "魏晋南朝士族重视言辞机锋与文化修养，咏雪一则通过比喻比较人物才情。"
  },
  {
    match: /^陈太丘与友期行/,
    id: "chentaiqiu",
    author: "刘义庆",
    dynastyId: "nanbeichao",
    dynasty: "南朝宋",
    year: "约元嘉年间",
    yearSort: 440,
    place: ["建康", "南朝宋都城建康", "江苏南京", 32.06, 118.796],
    placeNote: "《世说新语》编撰于建康；故事发生地点在陈太丘出行途中。",
    level: "junior",
    textbook: "七年级上册",
    genre: "志人小说",
    background: "《世说新语》记录汉末至东晋名士言行，本则通过元方对答讨论信与礼。"
  }
];

const newWorks = [];
const matched = [];
const translationOverrides = {
  hezhongshishou:
    "沧州南面有一座寺庙靠近河岸，山门倒塌进河里，两只石兽一起沉入水中。过了十多年，僧人募集资金重修寺庙，到水中寻找两只石兽，始终找不到，认为它们顺流而下了。他们划着几只小船，拖着铁耙，找了十多里也没有踪迹。\n\n一位讲学家在寺中设馆讲学，听说后笑着说：“你们不能推究事物的道理。这石兽又不是木片，怎么能被暴涨的河水带走？石头坚硬沉重，沙子松软轻浮，石兽埋在沙里，只会越沉越深罢了。沿河往下游寻找，不是颠倒错乱吗？”众人佩服，认为这是确切之论。\n\n一位老河兵听说后又笑着说：“凡是河中丢失石头，都应当到上游寻找。石头坚硬沉重，沙子松软轻浮，水冲不动石头，它反激的力量必定会在石头下方迎水处冲刷沙子，形成坑穴，越冲越深，冲到石头一半高度时，石头必定倒进坑穴中。这样再次冲刷，石头又再翻转。翻转不停，于是反而逆流而上了。到下游寻找固然错，在原处沙中寻找不更错吗？”按照他的话去找，果然在几里外找到了石兽。如此看来，天下的事只知其一、不知其二的很多，怎么能凭借道理主观判断呢？"
};

for (const item of meta) {
  const entry = rawEntries.find((candidate) => item.match.test(candidate.title));
  if (!entry) {
    console.error(`未在材料中找到：${item.id}`);
    continue;
  }
  matched.push(entry.title);
  if (data.works.some((work) => work.id === item.id)) continue;
  const [name, ancient, modern, lat, lng] = item.place;
  newWorks.push({
    id: item.id,
    title: entry.title.replace(/\s+(《[^》]+》|[^《》\s]+)$/, "").trim(),
    ...(item.authorId ? { authorId: item.authorId } : {}),
    author: item.author,
    dynastyId: item.dynastyId,
    dynasty: item.dynasty,
    year: item.year,
    yearSort: item.yearSort,
    place: {
      name,
      ancient,
      modern,
      lat,
      lng,
      note: item.placeNote
    },
    level: item.level,
    levelLabel: item.level === "senior" ? "高中必考" : "初中必考",
    textbook: item.textbook,
    genre: item.genre,
    background: item.background,
    original: entry.original,
    annotations: entry.annotations,
    translation: translationOverrides[item.id] || entry.translation,
    sourceNote: "原文、注释与译文据用户提供的《文言文.txt》整理；创作地与年代异说以学习示意为准。"
  });
}

console.log(`材料中匹配到 ${matched.length} 个目标篇目；待补入 ${newWorks.length} 篇。`);
for (const work of newWorks) {
  console.log(
    `- ${work.title}｜${work.author}｜${work.original.length} 字原文｜${work.annotations.length} 条注释｜${work.translation.length} 字译文`
  );
  if (!work.original || !work.translation || !work.annotations.length) {
    console.error(`  字段缺失：原文=${Boolean(work.original)} 注释=${work.annotations.length} 译文=${Boolean(work.translation)}`);
  }
}

if (newWorks.length && (newWorks.some((work) => !work.original || !work.translation) || newWorks.some((work) => !work.annotations.length))) {
  console.error("部分篇目缺少原文、译文或注释，请先检查材料格式。");
  process.exitCode = 1;
}

if (write && newWorks.length && !process.exitCode) {
  data.works.push(...newWorks);
  fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`已写入 data.json，篇目总数：${data.works.length}`);
}
