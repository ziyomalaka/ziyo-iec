import { getTranslations } from "next-intl/server";
import {
  UserPlus,
  BookOpen,
  PlayCircle,
  ClipboardCheck,
  Award,
} from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";

const stepIcons = [UserPlus, BookOpen, PlayCircle, ClipboardCheck, Award];

export default async function HowItWorks() {
  const t = await getTranslations("home.howItWorks");
  const steps = t.raw("steps") as Array<{
    number: number;
    title: string;
    description: string;
  }>;

  return (
    <Section id="qanday-ishlaydi">
      <Container>
        <SectionHeader title={t("title")} centered />

        <div className="relative">
          <div
            aria-hidden
            className="absolute left-[10%] right-[10%] top-8 hidden h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent lg:block"
          />

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
            {steps.map((step, index) => {
              const Icon = stepIcons[index];
              return (
                <div key={step.number} className="relative flex flex-col items-center text-center">
                  <div className="relative z-10 mb-5 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30">
                    <Icon className="h-7 w-7 stroke-[1.75]" />
                    <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-primary-light text-xs font-bold text-white shadow">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-2 max-w-[180px] text-xs leading-relaxed text-muted">
                    {step.description}
                  </p>
                  {index < steps.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute -right-3 top-9 hidden text-primary/30 lg:block"
                    >
                      →
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </Section>
  );
}
