import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import HowStepDetailsTabs from "./HowStepDetailsTabs";
import { getTranslations } from "next-intl/server";

export default async function HowStepDetails() {
  const t = await getTranslations("howItWorks");
  const steps = t.raw("stepDetails.items") as Array<{
    title: string;
    description: string;
    checklist: string[];
  }>;

  return (
    <Section muted>
      <Container>
        <SectionHeader title={t("stepDetails.title")} />
        <HowStepDetailsTabs steps={steps} />
      </Container>
    </Section>
  );
}
