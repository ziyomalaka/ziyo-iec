import {
  UserPlus,
  Search,
  PlayCircle,
  ClipboardCheck,
  Award,
} from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import Card from "@/components/ui/Card";
import { getTranslations } from "next-intl/server";

const stepIcons = [UserPlus, Search, PlayCircle, ClipboardCheck, Award];

export default async function HowSteps() {
  const t = await getTranslations("howItWorks");
  const steps = t.raw("steps.items") as Array<{
    number: number;
    title: string;
    description: string;
  }>;

  return (
    <Section>
      <Container>
        <SectionHeader title={t("steps.title")} centered />
        <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-stretch lg:justify-between">
          {steps.map((step, index) => {
            const Icon = stepIcons[index];
            return (
              <div key={step.number} className="flex items-center gap-2 lg:flex-1">
                <Card className="relative flex flex-1 flex-col items-center text-center">
                  <span className="absolute -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    {step.number}
                  </span>
                  <div className="icon-box-circle mb-3 mt-2 h-12 w-12">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-1 text-xs text-muted">{step.description}</p>
                </Card>
                {index < steps.length - 1 && (
                  <div className="hidden h-0.5 w-6 shrink-0 border-t-2 border-dashed border-slate-300 lg:block" />
                )}
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
