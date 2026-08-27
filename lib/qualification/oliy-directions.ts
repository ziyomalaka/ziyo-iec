export const OLIY_DIRECTIONS = [
  { id: "pedagogika", title: "Pedagogika", description: "Oliy ta'lim pedagogikasi." },
  { id: "maktabgacha-talim", title: "Maktabgacha ta'lim", description: "Maktabgacha ta'lim pedagogikasi." },
  { id: "tasviriy-sanat", title: "Tasviriy san'at va muhandislik grafikasi", description: "Tasviriy san'at va muhandislik grafikasi." },
  { id: "biologiya", title: "Biologiya", description: "Biologiya oliy ta'limi." },
  { id: "falsafa", title: "Falsafa", description: "Falsafa va mantiq." },
  { id: "matematika", title: "Matematika va amaliy matematika", description: "Matematika va amaliy matematika." },
  { id: "fizika-astronomiya", title: "Fizika va astronomiya", description: "Fizika va astronomiya." },
  { id: "tarix", title: "Tarix", description: "Tarix oliy ta'limi." },
  { id: "texnologiya-talimi", title: "Texnologiya ta'limi", description: "Texnologiya ta'limi metodikasi." },
  { id: "jurnalistika-pr", title: "Jurnalistika va PR xizmati", description: "Jurnalistika va PR xizmati." },
  { id: "soliqlar", title: "Soliqlar va soliqqa tortish", description: "Soliqlar va soliqqa tortish." },
  { id: "biznesni-boshqarish", title: "Biznesni boshqarish", description: "Biznesni boshqarish." },
  { id: "menejment", title: "Menejment", description: "Menejment va tashkilot." },
  { id: "buxgalteriya", title: "Buxgalteriya hisobi va audit", description: "Buxgalteriya hisobi va audit." },
  { id: "bank-ishi", title: "Bank ishi", description: "Bank ishi." },
  { id: "raqamli-iqtisodiyot", title: "Raqamli iqtisodiyot", description: "Raqamli iqtisodiyot." },
  { id: "moliya", title: "Moliya va moliyaviy texnologiyalar", description: "Moliya va moliyaviy texnologiyalar." },
  { id: "ijtimoiy-ish", title: "Ijtimoiy ish", description: "Ijtimoiy ish." },
  { id: "jismoniy-madaniyat", title: "Jismoniy madaniyat", description: "Jismoniy madaniyat." },
  { id: "milliy-goya", title: "Milliy g'oya, ma'naviyat asoslari va huquq ta'limi", description: "Milliy g'oya, ma'naviyat asoslari va huquq ta'limi." },
  { id: "inklyuziv-talim", title: "Inklyuziv ta'lim", description: "Inklyuziv ta'lim." },
  { id: "gidrologiya", title: "Gidrologiya", description: "Gidrologiya." },
  { id: "geologiya", title: "Geologiya", description: "Geologiya." },
  { id: "geografiya-iqlim", title: "Geografiya va iqlimshunoslik", description: "Geografiya va iqlimshunoslik." },
  { id: "arxivshunoslik", title: "Arxivshunoslik", description: "Arxivshunoslik." },
  { id: "ekologiya", title: "Ekologiya va atrof muhitni muhofazasi", description: "Ekologiya va atrof muhitni muhofazasi." },
  { id: "sotsiologiya", title: "Sotsiologiya", description: "Sotsiologiya." },
  { id: "psixologiya", title: "Psixologiya", description: "Psixologiya." },
] as const;

export const OLIY_DIRECTION_TITLES = OLIY_DIRECTIONS.map((item) => item.title);

export function normalizeDirectionTitle(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[ʼ‘’`'ʻ´]/g, "")
    .replace(/[^a-z0-9\u0400-\u04ff]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "Pedagogika (Oliy ta'lim)" → "pedagogika" — student katalogi bilan bir xil kalit. */
export function canonicalDirectionTitleKey(value?: string | null) {
  let key = normalizeDirectionTitle(value);
  if (!key) return "";
  const suffixes = ["oliy talim", "umumtalim", "maktabgacha talim", "orta maxsus talim", "orta maxsus"];
  for (const suffix of suffixes) {
    if (!key.endsWith(` ${suffix}`)) continue;
    const stripped = key.slice(0, -(suffix.length + 1)).trim();
    if (stripped) return stripped;
  }
  return key;
}

export function directionTitlesMatch(a?: string | null, b?: string | null) {
  const left = canonicalDirectionTitleKey(a);
  const right = canonicalDirectionTitleKey(b);
  if (left && right && left === right) return true;
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length <= right.length ? right : left;
  if (!shorter || !longer.startsWith(`${shorter} `)) return false;
  return OLIY_DIRECTION_TITLES.some((item) => canonicalDirectionTitleKey(item) === shorter);
}

export function isCanonicalOliyTitle(title?: string | null) {
  const key = canonicalDirectionTitleKey(title);
  if (!key) return false;
  return OLIY_DIRECTION_TITLES.some((item) => canonicalDirectionTitleKey(item) === key);
}
