import { Link } from "@/i18n/navigation";
import { ArrowRight, GraduationCap, Calculator, Monitor, Heart, Scale, Languages } from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import Card from "@/components/ui/Card";
import { getTranslations } from "next-intl/server";

const directionMeta = [
  { icon: GraduationCap, color: "bg-blue-100 text-blue-600", href: "/yonalishlar/pedagogika" as const },
  { icon: Calculator, color: "bg-emerald-100 text-emerald-600", href: "#" as const },
  { icon: Monitor, color: "bg-violet-100 text-violet-600", href: "#" as const },
  { icon: Heart, color: "bg-pink-100 text-pink-600", href: "#" as const },
  { icon: Scale, color: "bg-orange-100 text-orange-600", href: "#" as const },
  { icon: Languages, color: "bg-cyan-100 text-cyan-600", href: "#" as const },
];

export default async function RetrainDirections() {
  const t = await getTranslations("retrain");
  const tCommon = await getTranslations("common");
  const directions = t.raw("directions.items") as Array<{
    title: string;
    courses: number;
  }>;

  return (
    <Section id="yonalishlar" muted>
      <Container>
        <SectionHeader
          title={t("directions.title")}
          link={{ href: "#", label: tCommon("viewAllDirectionsFull") }}
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {directions.map((dir, index) => {
            const meta = directionMeta[index];
            const Icon = meta.icon;
            return (
              <Link key={dir.title} href={meta.href}>
                <Card hover className="group h-full">
                  <div
                    className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${meta.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-slate-900">{dir.title}</h3>
                  <p className="mt-1 text-body-sm">
                    {tCommon("coursesAvailable", { count: dir.courses })}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
                    {tCommon("buttons.goToDirection")}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
