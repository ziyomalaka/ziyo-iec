import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";

const newsColors = [
  "from-primary to-primary-light",
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-indigo-600",
  "from-orange-500 to-amber-600",
];

export default async function News() {
  const t = await getTranslations("home.news");
  const tCommon = await getTranslations("common");
  const items = t.raw("items") as Array<{ title: string; date: string }>;

  return (
    <Section muted id="yangiliklar">
      <Container>
        <SectionHeader
          title={t("title")}
          link={{ href: "#", label: tCommon("viewAllNews") }}
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, index) => (
            <Link
              key={item.title}
              href="#"
              className="card-hover group flex flex-col overflow-hidden sm:flex-row lg:flex-col"
            >
              <div
                className={`h-28 shrink-0 bg-gradient-to-br sm:h-auto sm:w-28 lg:h-36 lg:w-full ${newsColors[index]}`}
              />
              <div className="flex flex-1 flex-col justify-center p-4">
                <h3 className="text-sm font-semibold leading-snug text-slate-900 transition-colors group-hover:text-primary line-clamp-3">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs font-medium text-primary/70">{item.date}</p>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </Section>
  );
}
