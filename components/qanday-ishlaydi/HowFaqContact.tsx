import { Headphones, MessageCircle, Clock } from "@/lib/icons";
import { WORK_HOURS } from "@/lib/contact";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import Accordion from "@/components/ui/Accordion";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { getLocale, getTranslations } from "next-intl/server";

export default async function HowFaqContact() {
  const locale = await getLocale();
  const t = await getTranslations("howItWorks");
  const tCommon = await getTranslations("common");
  const faqItems = t.raw("faq.items") as Array<{ question: string; answer: string }>;
  const faqs = faqItems.map((_, i) => ({
    question: t(`faq.items.${i}.question`),
    answer: t(`faq.items.${i}.answer`, { hours: WORK_HOURS }),
  }));
  const isRu = locale === "ru";

  return (
    <Section muted>
      <Container>
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionHeader title={tCommon("faqTitle")} />
            <Accordion items={faqs} defaultValue="item-0" />
          </div>

          <div className="flex items-start">
            <Card className="w-full rounded-2xl">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Headphones className="h-8 w-8 text-primary" />
              </div>
              <div className="mb-2 flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                <h3 className="text-lg font-bold text-slate-900">
                  {isRu
                    ? "Не можете найти подходящий курс?"
                    : "Sizga mos kursni topa olmayapsizmi?"}
                </h3>
              </div>
              <p className="text-body-sm">
                {isRu
                  ? "Наши специалисты помогут выбрать подходящий курс"
                  : "Mutaxassislarimiz sizga mos kursni tanlashda yordam beradi"}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                <Clock className="h-3.5 w-3.5" />
                {tCommon("workHoursLabel", { hours: WORK_HOURS })}
              </p>
              <Button href="/aloqa" variant="primary" className="mt-4 w-full">
                {tCommon("buttons.contactUs")}
              </Button>
            </Card>
          </div>
        </div>
      </Container>
    </Section>
  );
}
