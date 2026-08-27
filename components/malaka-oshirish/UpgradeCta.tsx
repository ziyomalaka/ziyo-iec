import { ArrowRight, BookOpen } from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import { getTranslations } from "next-intl/server";

export default async function UpgradeCta() {
  const t = await getTranslations("upgrade");
  const tCommon = await getTranslations("common");

  return (
    <Section padding="sm">
      <Container>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-dark to-primary px-4 py-8 sm:px-8 sm:py-10 lg:flex lg:items-center lg:justify-between lg:px-14 lg:py-12">
          <div className="relative z-10 flex items-center gap-4">
            <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
              <BookOpen className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">{t("cta.title")}</h2>
              <p className="mt-2 text-sm text-blue-100">{t("cta.description")}</p>
            </div>
          </div>
          <div className="relative z-10 mt-6 flex flex-wrap gap-3 lg:mt-0">
            <Button href="#kurslar" variant="white">
              {tCommon("buttons.viewCourses")}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button href="#" variant="outline" className="border-white/30 text-primary hover:bg-white/10 hover:border-white/30 hover:text-white">
              {tCommon("buttons.register")}
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
