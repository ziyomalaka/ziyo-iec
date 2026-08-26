import { ArrowRight } from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import { getTranslations } from "next-intl/server";

export default async function RetrainCta() {
  const t = await getTranslations("retrain");
  const tCommon = await getTranslations("common");

  return (
    <Section padding="sm">
      <Container>
        <div className="rounded-2xl bg-gradient-to-r from-primary-dark to-primary px-8 py-10 text-center lg:px-14 lg:py-12">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{t("cta.title")}</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-blue-100">{t("cta.description")}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Button href="#yonalishlar" variant="white">
              {tCommon("buttons.viewDirections")}
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
