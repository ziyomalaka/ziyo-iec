import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import HeroIllustration from "@/components/ui/HeroIllustration";
import { getTranslations } from "next-intl/server";

export default async function HowHero() {
  const t = await getTranslations("howItWorks");
  const tCommon = await getTranslations("common");

  return (
    <Section hero padding="sm">
      <Container>
        <Breadcrumbs
          items={[
            { label: tCommon("breadcrumbs.home"), href: "/" },
            { label: tCommon("breadcrumbs.howItWorks") },
          ]}
        />

        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h1 className="heading-page">{t("hero.title")}</h1>
            <p className="mt-5 max-w-lg text-body">{t("hero.description")}</p>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <HeroIllustration />
          </div>
        </div>
      </Container>
    </Section>
  );
}
