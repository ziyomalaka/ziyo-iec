import { getTranslations } from "next-intl/server";
import { ArrowRight, Play } from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import FadeIn from "@/components/ui/FadeIn";
import HeroIllustration from "@/components/ui/HeroIllustration";
import DotPattern from "@/components/ui/DotPattern";

export default async function Hero() {
  const t = await getTranslations("home.hero");
  const tCommon = await getTranslations("common");

  return (
    <Section hero padding="none" className="relative overflow-hidden pb-6 lg:pb-10">
      <DotPattern />
      <div className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-primary/10 blur-xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-primary/5 blur-xl" />

      <Container className="relative flex w-full flex-col items-stretch gap-12 py-16 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:py-20 xl:py-24">
        <FadeIn className="flex flex-1 flex-col justify-center lg:max-w-[48%]">
          <h1 className="heading-page">
            {t("title")}{" "}
            <span className="bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
              {t("titleHighlight")}
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-body lg:text-lg">{t("description")}</p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Button href="/yonalishlar/pedagogika" variant="primary">
              {tCommon("buttons.viewDirections")}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button href="/qanday-ishlaydi" variant="outline">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Play className="h-4 w-4 fill-primary text-primary" />
              </span>
              {tCommon("buttons.howItWorks")}
            </Button>
          </div>
        </FadeIn>

        <FadeIn delay={0.1} className="flex flex-1 items-center justify-center lg:justify-end">
          <div className="w-full max-w-xl">
            <HeroIllustration priority />
          </div>
        </FadeIn>
      </Container>
    </Section>
  );
}
