import { ArrowRight, Play } from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Button from "@/components/ui/Button";
import HeroIllustration from "@/components/ui/HeroIllustration";
import { getTranslations } from "next-intl/server";

export default async function UpgradeHero() {
  const t = await getTranslations("upgrade");
  const tCommon = await getTranslations("common");

  return (
    <Section hero padding="sm">
      <Container>
        <Breadcrumbs
          items={[
            { label: tCommon("breadcrumbs.home"), href: "/" },
            { label: tCommon("breadcrumbs.upgrade") },
          ]}
        />

        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h1 className="heading-page">{t("hero.title")}</h1>
            <p className="mt-5 max-w-lg text-body">{t("hero.description")}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button href="#kurslar" variant="primary">
                {tCommon("buttons.viewCourses")}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button href="/qanday-ishlaydi" variant="outline">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                  <Play className="h-3.5 w-3.5 fill-primary text-primary" />
                </span>
                {tCommon("buttons.howItWorks")}
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
