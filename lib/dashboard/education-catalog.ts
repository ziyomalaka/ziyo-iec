import type { CourseCatalogItem, InstitutionType } from "@/lib/dashboard/types";

export type { InstitutionType };

export type EducationDirection = {
  id: string;
  institution: InstitutionType;
  title: string;
  description: string;
  imageGradient: string;
};

export {
  educationLevelLabels as institutionLabels,
  educationLevelTabs as institutionTabs,
} from "@/lib/dashboard/education-level";

const maktabgacha: Array<Pick<EducationDirection, "id" | "title" | "description">> = [
  { id: "tarbiyachi", title: "Maktabgacha ta'lim", description: "Tarbiyachi va metodistlar uchun." },
  { id: "rivojlanish", title: "Bolalar rivojlanishi", description: "Maktabgacha yoshdagi bolalar rivoji." },
  { id: "oyin", title: "O'yin orqali ta'lim", description: "Maktabgacha ta'limda o'yin metodikasi." },
  { id: "nutq", title: "Nutq rivojlantirish", description: "Maktabgacha nutq va muloqot." },
  { id: "tarbiya", title: "Maktabgacha tarbiya", description: "Tarbiya ishlari va ota-onalar bilan hamkorlik." },
  { id: "inklyuziv", title: "Inklyuziv maktabgacha ta'lim", description: "Maxsus ehtiyojli bolalar bilan ishlash." },
];

const maktab: Array<Pick<EducationDirection, "id" | "title" | "description">> = [
  { id: "boshlangich", title: "Boshlang'ich ta'lim", description: "1–4-sinflar metodikasi va baholash." },
  { id: "ona-tili", title: "Ona tili", description: "Nutq, yozuv va til savodxonligi." },
  { id: "adabiyot", title: "O'zbek adabiyoti", description: "Adabiy tahlil va o'qish madaniyati." },
  { id: "rus-tili", title: "Rus tili", description: "Rus tili o'qitish metodikasi." },
  { id: "rus-adabiyoti", title: "Rus adabiyoti", description: "Rus adabiyoti darslari." },
  { id: "ingliz-tili", title: "Ingliz tili", description: "Chet tili va kommunikatsiya." },
  { id: "nemis-tili", title: "Nemis tili", description: "Nemis tili o'qitish metodikasi." },
  { id: "fransuz-tili", title: "Fransuz tili", description: "Fransuz tili darslari." },
  { id: "matematika", title: "Matematika", description: "Zamonaviy matematika metodikasi." },
  { id: "informatika", title: "Informatika", description: "Raqamli savodxonlik va dasturlash asoslari." },
  { id: "fizika", title: "Fizika", description: "Tajriba va amaliy fizika darslari." },
  { id: "astronomiya", title: "Astronomiya", description: "Astronomiya asoslari." },
  { id: "kimyo", title: "Kimyo", description: "Laboratoriya va kimyo o'qitish." },
  { id: "biologiya", title: "Biologiya", description: "Tabiiy fanlar va ekologik ta'lim." },
  { id: "tarix", title: "Tarix", description: "Tarix fanini o'qitish metodikasi." },
  { id: "uzb-tarixi", title: "O'zbekiston tarixi", description: "Milliy tarix darslari." },
  { id: "jahon-tarixi", title: "Jahon tarixi", description: "Jahon tarixi o'qitish." },
  { id: "geografiya", title: "Geografiya", description: "Geografiya va iqtisodiy geografiya." },
  { id: "huquq", title: "Huquq", description: "Huquqiy savodxonlik darslari." },
  { id: "iqtisodiyot", title: "Iqtisodiyot", description: "Iqtisodiy bilim asoslari." },
  { id: "davlat-huquq", title: "Davlat va huquq asoslari", description: "Davlat va huquq fanlari." },
  { id: "jismoniy", title: "Jismoniy tarbiya", description: "Sport va sog'lom turmush." },
  { id: "sanat", title: "Tasviriy san'at", description: "Ijodiy va amaliy san'at." },
  { id: "chizmachilik", title: "Chizmachilik", description: "Chizmachilik va dizayn asoslari." },
  { id: "musiqa", title: "Musiqa", description: "Musiqa ta'limi metodikasi." },
  { id: "texnologiya", title: "Texnologiya", description: "Mehnat va texnologiya darslari." },
  { id: "manaviyat", title: "Ma'naviyat va ma'rifat", description: "Tarbiya va ma'naviy ta'lim." },
  { id: "tarbiya", title: "Tarbiya", description: "Sinf rahbarligi va tarbiya ishlari." },
  { id: "sogliq", title: "Sog'liqni saqlash asoslari", description: "Sog'lom turmush tarzi." },
  { id: "chqbt", title: "Chaqiriqqa qadar tayyorgarlik", description: "CHQBT darslari." },
  { id: "steam", title: "STEAM", description: "Fanlararo loyihaviy ta'lim." },
  { id: "inklyuziv", title: "Inklyuziv ta'lim", description: "Maxsus ehtiyojli o'quvchilar bilan ishlash." },
  { id: "maxsus", title: "Maxsus pedagogika", description: "Korreksion ta'lim metodikasi." },
  { id: "pedagogika", title: "Pedagogika", description: "Pedagogik mahorat va tarbiya." },
  { id: "raqamli", title: "Raqamli pedagogika", description: "Raqamli vositalar va platformalar." },
  { id: "psixologiya", title: "Psixologiya", description: "Maktab psixologiyasi." },
  { id: "sinf-rahbar", title: "Sinf rahbarligi", description: "Sinf jamoasi va ota-onalar bilan ishlash." },
];

const kollej: Array<Pick<EducationDirection, "id" | "title" | "description">> = [
  { id: "boshlangich", title: "Boshlang'ich ta'lim", description: "Boshlang'ich sinf o'qituvchilari." },
  { id: "pedagogika", title: "Pedagogika", description: "Kasbiy pedagogik tayyorgarlik." },
  { id: "maxsus", title: "Maxsus pedagogika", description: "Korreksion pedagogika." },
  { id: "it", title: "Axborot texnologiyalari", description: "IT va raqamli ko'nikmalar." },
  { id: "dasturlash", title: "Dasturlash", description: "Dasturlash asoslari." },
  { id: "buxgalteriya", title: "Buxgalteriya hisobi", description: "Hisob va moliyaviy savodxonlik." },
  { id: "iqtisodiyot", title: "Iqtisodiyot", description: "Iqtisodiyot va tadbirkorlik." },
  { id: "bank", title: "Bank ishi", description: "Bank va moliya asoslari." },
  { id: "soliq", title: "Soliq va soliqqa tortish", description: "Soliq hisobi." },
  { id: "huquq", title: "Huquqshunoslik", description: "Huquq fanlari metodikasi." },
  { id: "tibbiyot", title: "Tibbiyot asoslari", description: "Tibbiyot kolleji pedagogikasi." },
  { id: "hamshiralik", title: "Hamshiralik ishi", description: "Hamshiralik fanlarini o'qitish." },
  { id: "farmatsiya", title: "Farmatsiya", description: "Farmatsiya asoslari." },
  { id: "stomatologiya", title: "Stomatologiya", description: "Stomatologiya asoslari." },
  { id: "turizm", title: "Turizm", description: "Turizm va mehmondo'stlik." },
  { id: "mehmonxona", title: "Mehmonxona xo'jaligi", description: "Mehmonxona servisi." },
  { id: "servis", title: "Servis", description: "Xizmat ko'rsatish yo'nalishi." },
  { id: "oshpazlik", title: "Oshpazlik", description: "Oshpazlik va ovqatlanish." },
  { id: "yengil-sanoat", title: "Yengil sanoat", description: "Tikuvchilik va yengil sanoat." },
  { id: "dizayn", title: "Dizayn", description: "Dizayn va ijodiy kasblar." },
  { id: "qurilish", title: "Qurilish", description: "Qurilish va muhandislik asoslari." },
  { id: "elektrotexnika", title: "Elektrotexnika", description: "Elektr va energetika asoslari." },
  { id: "transport", title: "Avtomobil transporti", description: "Transport va texnik xizmat." },
  { id: "logistika", title: "Logistika", description: "Logistika va tashish." },
  { id: "qishloq", title: "Qishloq xo'jaligi", description: "Agrar ta'lim metodikasi." },
  { id: "veterinariya", title: "Veterinariya", description: "Veterinariya asoslari." },
  { id: "chet-tillari", title: "Chet tillari", description: "Kollejda til o'qitish." },
  { id: "jismoniy", title: "Jismoniy tarbiya", description: "Sport va jismoniy tarbiya." },
  { id: "musiqa", title: "Musiqa ta'limi", description: "Musiqa pedagogikasi." },
];

const universitet: Array<Pick<EducationDirection, "id" | "title" | "description">> = [
  { id: "pedagogika", title: "Pedagogika", description: "Oliy ta'lim pedagogikasi." },
  { id: "boshlangich", title: "Boshlang'ich ta'lim", description: "Boshlang'ich ta'lim fakulteti." },
  { id: "maxsus", title: "Maxsus pedagogika", description: "Korreksion pedagogika." },
  { id: "filologiya", title: "Filologiya", description: "Til va adabiyot yo'nalishi." },
  { id: "uzb-filologiya", title: "O'zbek filologiyasi", description: "O'zbek tili va adabiyoti." },
  { id: "rus-filologiya", title: "Rus filologiyasi", description: "Rus tili va adabiyoti." },
  { id: "ingliz-filologiya", title: "Ingliz filologiyasi", description: "Ingliz tili va adabiyoti." },
  { id: "tarjima", title: "Tarjima", description: "Tarjima nazariyasi va amaliyoti." },
  { id: "matematika", title: "Matematika", description: "Oliy matematika ta'limi." },
  { id: "amaliy-matematika", title: "Amaliy matematika", description: "Amaliy matematika va informatika." },
  { id: "fizika", title: "Fizika", description: "Fizika oliy ta'limi." },
  { id: "kimyo", title: "Kimyo", description: "Kimyo oliy ta'limi." },
  { id: "biologiya", title: "Biologiya", description: "Biologiya va ekologiya." },
  { id: "geografiya", title: "Geografiya", description: "Geografiya va tabiatshunoslik." },
  { id: "tarix", title: "Tarix", description: "Tarix va madaniyatshunoslik." },
  { id: "falsafa", title: "Falsafa", description: "Falsafa va mantiq." },
  { id: "sotsiologiya", title: "Sotsiologiya", description: "Ijtimoiy fanlar." },
  { id: "psixologiya", title: "Psixologiya", description: "Pedagogik va amaliy psixologiya." },
  { id: "iqtisodiyot", title: "Iqtisodiyot", description: "Iqtisodiyot va tahlil." },
  { id: "menejment", title: "Menejment", description: "Boshqaruv va tashkilot." },
  { id: "moliya", title: "Moliya", description: "Moliya va bank ishi." },
  { id: "huquq", title: "Huquqshunoslik", description: "Huquq fanlari." },
  { id: "it", title: "Axborot texnologiyalari", description: "IT va raqamli innovatsiyalar." },
  { id: "dasturiy", title: "Dasturiy injiniring", description: "Dasturiy ta'minot muhandisligi." },
  { id: "tibbiyot", title: "Tibbiyot", description: "Tibbiyot oliy ta'limi." },
  { id: "stomatologiya", title: "Stomatologiya", description: "Stomatologiya fakulteti." },
  { id: "farmatsiya", title: "Farmatsiya", description: "Farmatsiya ta'limi." },
  { id: "muhandislik", title: "Muhandislik", description: "Texnika va muhandislik." },
  { id: "qurilish", title: "Qurilish", description: "Qurilish muhandisligi." },
  { id: "arxitektura", title: "Arxitektura", description: "Arxitektura va shaharsozlik." },
  { id: "energetika", title: "Energetika", description: "Energetika muhandisligi." },
  { id: "transport", title: "Transport", description: "Transport tizimlari." },
  { id: "jurnalistika", title: "Jurnalistika", description: "Media va kommunikatsiya." },
  { id: "xalqaro", title: "Xalqaro munosabatlar", description: "Xalqaro huquq va diplomatiya." },
  { id: "jismoniy", title: "Jismoniy tarbiya", description: "Sport va jismoniy tarbiya." },
  { id: "sanat", title: "San'at va madaniyat", description: "San'at, musiqa, madaniyat." },
  { id: "musiqa", title: "Musiqa ta'limi", description: "Musiqa oliy ta'limi." },
  { id: "qishloq", title: "Qishloq xo'jaligi", description: "Agrar oliy ta'lim." },
  { id: "veterinariya", title: "Veterinariya", description: "Veterinariya oliy ta'limi." },
];

const gradients = [
  "from-[#5B4BDB] to-[#2E2A8A]",
  "from-[#0756F5] to-[#043087]",
  "from-[#0B6B4F] to-[#083D2E]",
  "from-[#B45309] to-[#7C2D12]",
  "from-[#0EA5A4] to-[#0F766E]",
  "from-[#7C3AED] to-[#4C1D95]",
] as const;

function withMeta(
  institution: InstitutionType,
  items: Array<Pick<EducationDirection, "id" | "title" | "description">>
): EducationDirection[] {
  return items.map((item, index) => ({
    ...item,
    id: `${institution}-${item.id}`,
    institution,
    imageGradient: gradients[index % gradients.length],
  }));
}

export const educationDirections: EducationDirection[] = [
  ...withMeta("maktabgacha", maktabgacha),
  ...withMeta("umumtalim", maktab),
  ...withMeta("orta-maxsus", kollej),
  ...withMeta("oliy", universitet),
];

const tones = ["purple", "green", "blue"] as const;

function makeCourse(direction: EducationDirection, index: number): CourseCatalogItem {
  const hours = index % 3 === 0 ? 36 : 72;
  const modules = hours === 36 ? 4 : 8;

  return {
    id: `course-${direction.id}`,
    title: `${direction.title} — malaka oshirish`,
    direction: direction.title,
    institution: direction.institution,
    subject: direction.title,
    courseType: "Malaka oshirish",
    status: "Ochiq",
    language: "O'zbek tili",
    description: direction.description,
    duration: hours === 36 ? "1.5 oy" : "3 oy",
    hours,
    modulesCount: modules,
    studentsCount: 180 + index * 13,
    rating: 4.5,
    price: 0,
    hasCertificate: true,
    format: "Onlayn",
    level: "O'rta",
    imageGradient: direction.imageGradient,
    badgeTone: tones[index % tones.length],
    instructor: "ZiyoMalaka o'qituvchisi",
    goal: `${direction.title} yo'nalishida malaka oshirish.`,
    audience:
      direction.institution === "maktabgacha"
        ? "Maktabgacha ta'lim tarbiyachilari"
        : direction.institution === "umumtalim"
          ? "Umumta'lim maktabi o'qituvchilari"
          : direction.institution === "orta-maxsus"
            ? "O'rta maxsus ta'lim o'qituvchilari"
            : "Oliy ta'lim professor-o'qituvchilari",
    lessonsCount: modules * 3,
    syllabus: [
      {
        id: `${direction.id}-m1`,
        title: "Modul 1: Nazariy asoslar",
        lessons: [
          { id: `${direction.id}-l1`, title: "Kirish darsi", duration: "45 daqiqa" },
          { id: `${direction.id}-l2`, title: `${direction.title} metodikasi`, duration: "50 daqiqa" },
        ],
      },
      {
        id: `${direction.id}-m2`,
        title: "Modul 2: Amaliy mashg'ulotlar",
        lessons: [{ id: `${direction.id}-l3`, title: "Amaliy dars", duration: "60 daqiqa" }],
      },
    ],
  };
}

export const educationCourses: CourseCatalogItem[] = educationDirections.map(makeCourse);

export function getDirectionsByInstitution(institution: InstitutionType | "all") {
  if (institution === "all") return educationDirections;
  return educationDirections.filter((item) => item.institution === institution);
}

export function getEducationCourses(institution: InstitutionType | "all") {
  if (institution === "all") return educationCourses;
  return educationCourses.filter((course) => course.institution === institution);
}

export function getEducationCourseById(id: string) {
  return educationCourses.find((course) => course.id === id);
}

export function getDirectionById(id: string) {
  return educationDirections.find((item) => item.id === id);
}

export function isLocalEducationCourseId(id: string) {
  return (
    id.startsWith("course-maktabgacha-") ||
    id.startsWith("course-umumtalim-") ||
    id.startsWith("course-orta-maxsus-") ||
    id.startsWith("course-oliy-") ||
    id.startsWith("course-maktab-") ||
    id.startsWith("course-kollej-") ||
    id.startsWith("course-universitet-")
  );
}
