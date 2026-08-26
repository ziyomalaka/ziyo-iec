import { BookOpen, Users, Award, Star, ArrowRight } from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import HeroIllustration from "@/components/ui/HeroIllustration";
import { getTranslations } from "next-intl/server";

const statIcons = [BookOpen, Users, Award, Star];

export default async function DirectionHero() {
  const t = await getTranslations("pedagogika");
  const tCommon = await getTranslations("common");
  const stats = t.raw("hero.stats") as Array<{ value: string; label: string }>;

  return (
    <Section hero padding="sm">
      <Container>
        <Breadcrumbs
          items={[
            { label: tCommon("breadcrumbs.home"), href: "/" },
            { label: tCommon("breadcrumbs.directions"), href: "/#yonalishlar" },
            { label: tCommon("breadcrumbs.pedagogika") },
          ]}
        />

        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <Badge variant="success" className="mb-4">
              {t("hero.badge")}
            </Badge>
            <h1 className="heading-page">{t("hero.title")}</h1>
            <p className="mt-4 max-w-lg text-body">{t("hero.description")}</p>

            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {stats.map((stat, index) => {
                const Icon = statIcons[index];
                return (
                  <div key={stat.label} className="text-center sm:text-left">
                    <div className="mb-1 flex justify-center sm:justify-start">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-lg font-bold text-slate-900">{stat.value}</div>
                    <div className="text-xs text-muted">{stat.label}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="#kurslar" variant="primary">
                {tCommon("buttons.viewCourses")}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button href="#haqida" variant="outline">
                {tCommon("buttons.aboutDirection")}
              </Button>
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <HeroIllustration />
          </div>
        </div>
      </Container>
    </Section>
  );
}
