import { Headphones, Clock } from "@/lib/icons";
import { WORK_HOURS } from "@/lib/contact";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import Accordion from "@/components/ui/Accordion";
import Button from "@/components/ui/Button";
import { getLocale, getTranslations } from "next-intl/server";

export default async function DirectionFaq() {
  const locale = await getLocale();
  const t = await getTranslations("pedagogika");
  const tCommon = await getTranslations("common");
  const faqItems = t.raw("faq.items") as Array<{ question: string; answer: string }>;
  const faqs = faqItems.map((_, i) => ({
    question: t(`faq.items.${i}.question`),
    answer: t(`faq.items.${i}.answer`, { hours: WORK_HOURS }),
  }));
  const isRu = locale === "ru";

  return (
    <Section id="faq">
      <Container>
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionHeader title={tCommon("faqTitle")} />
            <Accordion items={faqs} defaultValue="item-0" columns={2} />
          </div>

          <div className="flex items-start">
            <div className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-surface-blue to-surface-blue/60 p-6">
              <h3 className="text-lg font-bold text-slate-900">
                {isRu
                  ? "Не можете найти подходящий курс?"
                  : "Sizga mos kursni topa olmayapsizmi?"}
              </h3>
              <p className="mt-2 text-body-sm">
                {isRu
                  ? "Наши специалисты помогут выбрать подходящий курс"
                  : "Mutaxassislarimiz sizga mos kursni tanlashda yordam beradi"}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                <Clock className="h-3.5 w-3.5" />
                {tCommon("workHoursLabel", { hours: WORK_HOURS })}
              </p>
              <Button href="/aloqa" variant="primary" className="mt-4">
                {tCommon("buttons.requestHelp")}
              </Button>
              <div className="absolute -bottom-2 -right-2 opacity-20">
                <Headphones className="h-24 w-24 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
