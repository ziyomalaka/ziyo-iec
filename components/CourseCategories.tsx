import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, GraduationCap, BadgeCheck, PlayCircle, Building2 } from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";

const categoryMeta = [
  {
    icon: GraduationCap,
    iconBg: "bg-blue-500/10 text-blue-600",
    cardBg: "bg-gradient-to-br from-blue-50 to-white border-blue-100/80",
    href: "/malaka-oshirish",
  },
  {
    icon: BadgeCheck,
    iconBg: "bg-emerald-500/10 text-emerald-600",
    cardBg: "bg-gradient-to-br from-emerald-50 to-white border-emerald-100/80",
    href: "/qayta-tayyorlash",
  },
  {
    icon: PlayCircle,
    iconBg: "bg-orange-500/10 text-orange-600",
    cardBg: "bg-gradient-to-br from-orange-50 to-white border-orange-100/80",
  },
  {
    icon: Building2,
    iconBg: "bg-purple-500/10 text-purple-600",
    cardBg: "bg-gradient-to-br from-purple-50 to-white border-purple-100/80",
  },
];

export default async function CourseCategories() {
  const t = await getTranslations("home.categories");
  const tCommon = await getTranslations("common");
  const items = t.raw("items") as Array<{ title: string; description: string }>;

  return (
    <Section id="yonalishlar" className="pt-12 lg:pt-16">
      <Container>
        <SectionHeader
          title={t("title")}
          link={{ href: "#", label: tCommon("viewAllDirections") }}
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {items.map((cat, index) => {
            const meta = categoryMeta[index];
            const Icon = meta.icon;
            return (
              <div
                key={cat.title}
                className={`group rounded-2xl border p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${meta.cardBg}`}
              >
                <div
                  className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${meta.iconBg}`}
                >
                  <Icon className="h-7 w-7 stroke-[1.75]" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{cat.title}</h3>
                <p className="mt-2 text-body-sm leading-relaxed">{cat.description}</p>
                <Link
                  href={"href" in meta && meta.href ? meta.href : "#"}
                  className="link-arrow mt-5"
                >
                  {tCommon("details")}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
