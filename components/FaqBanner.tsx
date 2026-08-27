import { getTranslations } from "next-intl/server";
import { MessageCircle, HelpCircle } from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";

export default async function FaqBanner() {
  const t = await getTranslations("home.faqBanner");
  const tCommon = await getTranslations("common");

  return (
    <Section padding="sm">
      <Container>
        <div className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-r from-[#e8f2ff] via-surface-blue to-[#dce9ff] px-4 py-8 sm:px-8 sm:py-12 lg:px-16 lg:py-14">
          <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-8 right-20 h-32 w-32 rounded-full bg-accent/10 blur-2xl" />

          <div className="relative z-10 flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-lg">
              <h2 className="heading-section">{t("title")}</h2>
              <div className="mt-3 h-1 w-10 rounded-full bg-primary/80" />
              <p className="mt-4 text-body-sm lg:text-base">{t("description")}</p>
            </div>
            <Button href="#" variant="primary" className="shrink-0">
              {tCommon("buttons.viewFaq")}
            </Button>
          </div>

          <div className="pointer-events-none absolute right-10 top-1/2 hidden -translate-y-1/2 lg:block">
            <div className="relative h-28 w-28">
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-primary/15">
                <MessageCircle className="h-14 w-14 text-primary/50" />
              </div>
              <div className="absolute -right-2 -top-2 flex h-16 w-16 items-center justify-center rounded-full bg-accent/25 shadow-lg">
                <HelpCircle className="h-9 w-9 text-accent" />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
