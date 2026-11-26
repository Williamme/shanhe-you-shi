import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dataPath = path.join(root, "data.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const write = process.argv.includes("--write");

const profiles = [
  ["luobinwang", "骆宾王", "字观光", "初唐", "约619—684", 619, 684, "初唐四杰之一，少年即以诗文知名。", ["义乌"]],
  ["lishen", "李绅", "字公垂", "中唐", "772—846", 772, 846, "中唐诗人，新乐府运动参与者，作品关注民生疾苦。", ["湖州"]],
  ["liqiao", "李峤", "字巨山", "初唐", "645—714", 645, 714, "初唐政治家、诗人，咏物诗数量丰富。", ["长安"]],
  ["menghaoran", "孟浩然", "字浩然", "盛唐", "689—740", 689, 740, "盛唐山水田园诗人，诗风清淡自然，与王维并称“王孟”。", ["襄阳", "建德江"]],
  ["jiadao", "贾岛", "字浪仙", "中唐", "779—843", 779, 843, "中唐苦吟诗人，诗风清峭，善于锤炼字句。", ["终南山"]],
  ["yangwanli", "杨万里", "字廷秀，号诚斋", "南宋", "1127—1206", 1127, 1206, "南宋诗人，创立自然活泼的“诚斋体”，善写日常小景。", ["吉水", "新市", "杭州"]],
  ["wangzhihuan", "王之涣", "字季凌", "盛唐", "688—742", 688, 742, "盛唐边塞诗人，作品气象开阔，今存诗不多。", ["蒲州"]],
  ["gaoding", "高鼎", "生平资料较少", "晚清", "约1828—1880", 1828, 1880, "晚清诗人，《村居》以明快笔调描绘春日儿童放风筝。", ["杭州"]],
  ["hezhizhang", "贺知章", "字季真，号四明狂客", "盛唐", "659—744", 659, 744, "盛唐诗人、书法家，性情旷达，晚年归隐越州。", ["长安"]],
  ["wangwan", "王湾", "字号待考", "盛唐", "约693—751", 693, 751, "盛唐诗人，以《次北固山下》闻名，诗境开阔。", ["北固山"]],
  ["yeshaoweng", "叶绍翁", "字嗣宗，号靖逸", "南宋", "约1194—1269", 1194, 1269, "南宋江湖派诗人，擅长七绝，多写田园与隐逸生活。", ["临安"]],
  ["zengji", "曾几", "字吉甫，号茶山居士", "南宋", "1084—1166", 1084, 1166, "南宋诗人，陆游曾从其学诗，诗风清雅。", ["衢州"]],
  ["wanghan", "王翰", "字子羽", "盛唐", "约687—726", 687, 726, "盛唐边塞诗人，个性豪放，《凉州词》苍凉慷慨。", ["凉州"]],
  ["wangwei", "王维", "字摩诘，号摩诘居士", "盛唐", "701—761", 701, 761, "盛唐山水田园诗人、画家，苏轼称其“诗中有画，画中有诗”。", ["长安", "若耶溪"]],
  ["luyue", "卢钺", "字威节，号梅坡", "南宋", "约1220—？", 1220, 1290, "南宋诗人，《雪梅》以梅雪争春写理趣。", ["临安"]],
  ["fanchengda", "范成大", "字至能，号石湖居士", "南宋", "1126—1193", 1126, 1193, "南宋中兴四大诗人之一，田园诗尤其著名。", ["石湖"]],
  ["luoyin", "罗隐", "字昭谏", "晚唐", "833—909", 833, 909, "晚唐诗人，诗多讽刺与身世之感，语言警策。", ["长安"]],
  ["lulun", "卢纶", "字允言", "中唐", "739—799", 739, 799, "大历十才子之一，边塞诗雄浑有力。", ["阴山"]],
  ["wangmian", "王冕", "字元章，号煮石山农", "元", "1287—1359", 1287, 1359, "元代画家、诗人，善画墨梅，诗风质朴清高。", ["诸暨"]],
  ["yushinan", "虞世南", "字伯施", "初唐", "558—638", 558, 638, "初唐书法家、诗人，凌烟阁二十四功臣之一。", ["长安"]],
  ["linjie", "林杰", "字智周", "晚唐", "831—847", 831, 847, "唐代早逝诗人，少年有才，《乞巧》清新自然。", ["福州"]],
  ["linsheng", "林升", "字云友", "南宋", "约1180—？", 1180, 1250, "南宋诗人，以《题临安邸》讽刺偏安朝廷而闻名。", ["临安"]],
  ["gongzizhen", "龚自珍", "字璱人，号定盦", "清", "1792—1841", 1792, 1841, "晚清思想家、诗人，诗文富有变革精神。", ["北京", "镇江"]],
  ["leizhen", "雷震", "生平资料较少", "南宋", "约1200—？", 1200, 1270, "南宋诗人，《村晚》以短小篇幅写乡村晚景。", ["杭州"]],
  ["mengjiao", "孟郊", "字东野", "中唐", "751—814", 751, 814, "中唐苦吟诗人，与贾岛并称“郊寒岛瘦”。", ["溧阳"]],
  ["hanhong", "韩翃", "字君平", "中唐", "719—788", 719, 788, "大历十才子之一，诗风清丽，《寒食》广为传诵。", ["长安"]],
  ["wangjian", "王建", "字仲初", "中唐", "767—830", 767, 830, "中唐乐府诗人，擅长以通俗语言写民生与宫词。", ["长安"]],
  ["wangguan", "王观", "字通叟", "北宋", "1035—1100", 1035, 1100, "北宋词人，词风婉丽，善写送别与春景。", ["汴京"]],
  ["huangtingjian", "黄庭坚", "字鲁直，号山谷道人", "北宋", "1045—1105", 1045, 1105, "北宋诗人、书法家，江西诗派开创者。", ["宜州"]],
  ["wangbo", "王勃", "字子安", "初唐", "650—676", 650, 676, "初唐四杰之首，才思敏捷，《滕王阁序》传诵千古。", ["长安", "洪州"]],
  ["dumu", "杜牧", "字牧之", "晚唐", "803—852", 803, 852, "晚唐诗人，与李商隐并称“小李杜”，咏史诗尤为出色。", ["长安", "池州", "黄州赤壁"]],
  ["maozedong", "毛泽东", "字润之", "近现代", "1893—1976", 1893, 1976, "中国革命家、诗人，擅长以古典诗词形式书写现代革命历程。", ["大柏地", "延安"]],
  ["wangchangling", "王昌龄", "字少伯", "盛唐", "698—756", 698, 756, "盛唐边塞诗人，七绝成就突出，被称为“七绝圣手”。", ["玉门关", "青海", "润州", "江南"]]
].map(([id, name, alias, era, yearSpan, birth, death, bio, placeOrder]) => ({
  id,
  name,
  alias,
  era,
  yearSpan,
  birth,
  death,
  bio,
  placeOrder
}));

const collective = {
  id: "folk",
  name: "民歌与佚名",
  alias: "《诗经》、汉乐府、北朝民歌、古诗十九首",
  era: "先秦至南北朝",
  yearSpan: "集体创作",
  birth: null,
  death: null,
  bio: "这些作品来自《诗经》、乐府民歌、古诗十九首等集体创作传统，并非单一作者的个人行旅。下列地点按诗歌所属地域与文学传统串联。",
  placeOrder: ["镐京", "江南水乡", "敕勒川", "北朝民歌流传地", "洛阳"],
  collectiveAuthors: ["《诗经》", "汉乐府", "北朝民歌", "古诗十九首", "佚名"],
  looseWorkTitles: ["画"]
};

const existingExtras = {
  李白: [
    { place: "桃花潭", ancient: "泾县桃花潭", modern: "安徽泾县", lat: 30.48, lng: 118.33, year: "约755年", titles: ["赠汪伦"] },
    { place: "庐山", ancient: "江州庐山", modern: "江西九江", lat: 29.56, lng: 115.98, year: "约756年", titles: ["望庐山瀑布"] }
  ],
  杜甫: [
    { place: "梓州", ancient: "梓州", modern: "四川三台", lat: 31.1, lng: 105.0, year: "广德元年（763）", titles: ["闻官军收河南河北"] }
  ],
  苏轼: [
    { place: "杭州", ancient: "杭州", modern: "浙江杭州", lat: 30.274, lng: 120.155, year: "元祐四年（1089）", titles: ["赠刘景文", "饮湖上初晴后雨", "六月二十七日望湖楼醉书"] },
    { place: "庐山", ancient: "江州庐山", modern: "江西九江", lat: 29.56, lng: 115.98, year: "元丰七年（1084）", titles: ["题西林壁"] },
    { place: "蕲水", ancient: "黄州蕲水", modern: "湖北浠水", lat: 30.45, lng: 115.26, year: "元丰五年（1082）", titles: ["浣溪沙"] }
  ],
  李清照: [
    { place: "乌江", ancient: "乌江亭", modern: "安徽和县", lat: 31.72, lng: 118.36, year: "建炎三年（1129）", titles: ["夏日绝句"] }
  ]
};

const accents = ["#8b6b4d", "#6d7e6b", "#8f5d4b", "#6e7589", "#88704e", "#5d746c"];
const normalizePlace = (value) => String(value || "").replace(/\s+/g, "");
const primaryWorks = data.works.filter((work) => work.level === "primary");
const worksByTitle = new Map(data.works.map((work) => [work.title, work]));

for (const profile of profiles) {
  let author = data.authors.find((item) => item.name === profile.name || item.id === profile.id);
  if (!author) {
    author = {
      id: profile.id,
      name: profile.name,
      alias: profile.alias,
      aliases: profile.alias && profile.alias !== "字号待考" && profile.alias !== "生平资料较少" ? [profile.alias] : [],
      era: profile.era,
      birth: profile.birth,
      death: profile.death,
      yearSpan: profile.yearSpan,
      bio: `${profile.bio} 下列路线按小学教材及其他关联作品的地点串联，非完整生平考证。`,
      accent: accents[data.authors.length % accents.length],
      routeLabel: "教材作品足迹",
      route: []
    };
    data.authors.push(author);
  }
}

let folkAuthor = data.authors.find((author) => author.id === collective.id);
if (!folkAuthor) {
  folkAuthor = {
    id: collective.id,
    name: collective.name,
    alias: collective.alias,
    aliases: collective.collectiveAuthors,
    era: collective.era,
    birth: null,
    death: null,
    yearSpan: collective.yearSpan,
    bio: collective.bio,
    accent: "#7a6a58",
    routeLabel: "民歌地域足迹",
    route: []
  };
  data.authors.push(folkAuthor);
}

const authorByName = new Map(data.authors.map((author) => [author.name, author]));
const newAuthorIds = new Set(profiles.map((profile) => profile.id));

for (const work of data.works) {
  const collectiveAuthor = collective.collectiveAuthors.includes(work.author);
  const author = collectiveAuthor ? folkAuthor : authorByName.get(work.author);
  if (!author) continue;
  if (collectiveAuthor || newAuthorIds.has(author.id) || work.levels?.includes("primary") || work.level === "primary") {
    work.authorId = author.id;
  }
}

for (const profile of profiles) {
  const author = authorByName.get(profile.name);
  if (!author) continue;
  const works = data.works.filter((work) => work.authorId === author.id && Number.isFinite(Number(work.place.lat)));
  if (!works.length) continue;
  const places = [...profile.placeOrder];
  for (const work of works) {
    if (!places.includes(work.place.name)) places.push(work.place.name);
  }
  places.forEach((placeName) => {
    const placeWorks = works.filter((work) => work.place.name === placeName);
    if (!placeWorks.length) return;
    const first = placeWorks[0];
    let stop = author.route.find((item) => normalizePlace(item.name) === normalizePlace(placeName));
    if (!stop) {
      stop = {
        id: `${author.id}-${author.route.length + 1}`,
        name: first.place.name,
        ancient: first.place.ancient,
        modern: first.place.modern,
        lat: first.place.lat,
        lng: first.place.lng,
        year: "教材关联",
        story: `教材中与${first.place.name}相关的作品有：${placeWorks.map((work) => `《${work.title}》`).join("、")}。`,
        workIds: []
      };
      author.route.push(stop);
    }
    placeWorks.forEach((work) => {
      if (!stop.workIds.includes(work.id)) stop.workIds.push(work.id);
    });
  });
}

for (const work of primaryWorks) {
  if (!work.authorId) continue;
  const author = data.authors.find((item) => item.id === work.authorId);
  if (!author || newAuthorIds.has(author.id) || author.id === folkAuthor.id) continue;
  const matchingStops = author.route.filter(
    (stop) =>
      normalizePlace(stop.name) === normalizePlace(work.place.name) ||
      (Number.isFinite(Number(stop.lat)) &&
        Math.abs(Number(stop.lat) - Number(work.place.lat)) < 0.06 &&
        Math.abs(Number(stop.lng) - Number(work.place.lng)) < 0.06)
  );
  const stop = matchingStops[matchingStops.length - 1];
  if (stop && !stop.workIds.includes(work.id)) stop.workIds.push(work.id);
}

for (const [authorName, extras] of Object.entries(existingExtras)) {
  const author = authorByName.get(authorName);
  if (!author) continue;
  for (const extra of extras) {
    let stop = author.route.find((item) => item.id === `extra-${author.id}-${author.route.length + 1}`);
    const titledWorks = extra.titles.map((title) => worksByTitle.get(title)).filter(Boolean);
    if (!titledWorks.length) continue;
    stop = author.route.find((item) => normalizePlace(item.name) === normalizePlace(extra.place));
    if (!stop) {
      stop = {
        id: `extra-${author.id}-${author.route.length + 1}`,
        name: extra.place,
        ancient: extra.ancient,
        modern: extra.modern,
        lat: extra.lat,
        lng: extra.lng,
        year: extra.year,
        story: `行旅中与${extra.place}相关的作品：${titledWorks.map((work) => `《${work.title}》`).join("、")}。`,
        workIds: []
      };
      author.route.push(stop);
    }
    titledWorks.forEach((work) => {
      if (!stop.workIds.includes(work.id)) stop.workIds.push(work.id);
    });
  }
  author.route.sort((a, b) => routeYear(a.year) - routeYear(b.year));
}

const folkWorks = data.works.filter((work) => work.authorId === folkAuthor.id);
for (const placeName of collective.placeOrder) {
  const placeWorks = folkWorks.filter((work) => work.place.name === placeName && Number.isFinite(Number(work.place.lat)));
  if (!placeWorks.length) continue;
  const first = placeWorks[0];
  let stop = folkAuthor.route.find((item) => normalizePlace(item.name) === normalizePlace(placeName));
  if (!stop) {
    stop = {
      id: `folk-${folkAuthor.route.length + 1}`,
      name: first.place.name,
      ancient: first.place.ancient,
      modern: first.place.modern,
      lat: first.place.lat,
      lng: first.place.lng,
      year: "文学传统",
      story: `这一站点关联${placeWorks.map((work) => `《${work.title}》`).join("、")}等作品。它们是集体创作传统的一部分，不应当作单一作者的生平行旅。`,
      workIds: placeWorks.map((work) => work.id)
    };
    folkAuthor.route.push(stop);
  }
}
folkAuthor.looseWorkIds = folkWorks
  .filter((work) => !Number.isFinite(Number(work.place.lat)))
  .map((work) => work.id);

const unassigned = primaryWorks.filter((work) => !work.authorId);
const missingOnRoute = primaryWorks.filter((work) => {
  if (!work.authorId) return false;
  const author = data.authors.find((item) => item.id === work.authorId);
  if (!author) return true;
  if (author.looseWorkIds?.includes(work.id)) return false;
  return !author.route.some((stop) => (stop.workIds || []).includes(work.id));
});

console.log(`新增作者档案：${profiles.length + 1} 位（含“民歌与佚名”集体条目）`);
console.log(`小学篇目已分配作者：${primaryWorks.length - unassigned.length}/${primaryWorks.length}`);
if (unassigned.length) console.log(`未分配：${unassigned.map((work) => work.title).join("、")}`);
if (missingOnRoute.length) console.log(`未进入地点路线：${missingOnRoute.map((work) => work.title).join("、")}`);

if (write) {
  fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`已写入 data.json：${data.authors.length} 位作者。`);
}

function routeYear(year) {
  const match = String(year || "").match(/(\d{3,4})/);
  return match ? Number(match[1]) : 9999;
}
