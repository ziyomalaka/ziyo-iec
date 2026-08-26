import { Target, GraduationCap, Users, TrendingUp } from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import Card from "@/components/ui/Card";
import { getTranslations } from "next-intl/server";

const cardIcons = [Target, GraduationCap, Users, TrendingUp];
const cardColors = [
  "bg-blue-100 text-blue-600",
  "bg-emerald-100 text-emerald-600",
  "bg-violet-100 text-violet-600",
  "bg-orange-100 text-orange-600",
];
const sidebarHrefs = [
  "#haqida",
  "#bo-limlar",
  "#kurslar",
  "#nima-organasiz",
  "#jarayon",
  "#sertifikat",
  "#faq",
];

export default async function DirectionAbout() {
  const t = await getTranslations("pedagogika");
  const sidebarLinks = t.raw("about.sidebar") as string[];
  const infoCards = t.raw("about.cards") as Array<{
    title: string;
    description: string;
  }>;

  return (
    <Section id="haqida">
      <Container>
        <SectionHeader title={t("about.title")} />

        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="lg:w-56 shrink-0">
            <nav className="space-y-1 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
              {sidebarLinks.map((link, i) => (
                <a
                  key={link}
                  href={sidebarHrefs[i]}
                  className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                    i === 0
                      ? "bg-primary text-white font-medium"
                      : "text-slate-600 hover:bg-white hover:text-primary"
                  }`}
                >
                  {link}
                </a>
              ))}
            </nav>
          </aside>

          <div className="grid flex-1 gap-5 sm:grid-cols-2">
            {infoCards.map((card, index) => {
              const Icon = cardIcons[index];
              return (
                <Card key={card.title}>
                  <div
                    className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${cardColors[index]}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-slate-900">{card.title}</h3>
                  <p className="mt-2 text-body-sm">{card.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </Container>
    </Section>
  );
}
