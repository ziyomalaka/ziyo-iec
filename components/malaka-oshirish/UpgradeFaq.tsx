import { MessageCircle } from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import Accordion from "@/components/ui/Accordion";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { getLocale, getTranslations } from "next-intl/server";

export default async function UpgradeFaq() {
  const locale = await getLocale();
  const t = await getTranslations("upgrade");
  const tCommon = await getTranslations("common");
  const faqs = t.raw("faq.items") as Array<{ question: string; answer: string }>;
  const isRu = locale === "ru";

  return (
    <Section id="faq" muted>
      <Container>
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionHeader title={tCommon("faqTitle")} />
            <Accordion items={faqs} defaultValue="item-0" columns={2} />
          </div>

          <div className="flex items-start">
            <Card className="w-full rounded-2xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
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
              <Button href="/aloqa" variant="outline" className="mt-4 w-full">
                {tCommon("buttons.contactUs")}
              </Button>
            </Card>
          </div>
        </div>
      </Container>
    </Section>
  );
}
