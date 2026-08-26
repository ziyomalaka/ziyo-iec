import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import Accordion from "@/components/ui/Accordion";
import { getTranslations } from "next-intl/server";

export default async function RetrainFaq() {
  const t = await getTranslations("retrain");
  const tCommon = await getTranslations("common");
  const faqs = t.raw("faq.items") as Array<{ question: string; answer: string }>;

  return (
    <Section id="faq" muted>
      <Container>
        <SectionHeader title={tCommon("faqTitle")} />
        <Accordion items={faqs} defaultValue="item-0" columns={2} />
      </Container>
    </Section>
  );
}
