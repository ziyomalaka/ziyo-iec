import {
  BookOpen,
  UserPlus,
  Wallet,
  PlayCircle,
  ClipboardCheck,
  Award,
  ChevronRight,
} from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import { getTranslations } from "next-intl/server";

const stepIcons = [BookOpen, UserPlus, Wallet, PlayCircle, ClipboardCheck, Award];

export default async function StudyProcess() {
  const t = await getTranslations("pedagogika");
  const steps = t.raw("studyProcess.steps") as string[];

  return (
    <Section id="jarayon">
      <Container>
        <SectionHeader title={t("studyProcess.title")} centered />
        <div className="flex flex-col items-center gap-4 lg:flex-row lg:justify-between">
          {steps.map((label, index) => {
            const Icon = stepIcons[index];
            return (
              <div key={label} className="flex items-center gap-2 lg:flex-1">
                <div className="flex flex-col items-center text-center flex-1">
                  <div className="icon-box-circle mb-3 h-14 w-14">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-medium text-slate-700">{label}</span>
                </div>
                {index < steps.length - 1 && (
                  <ChevronRight className="hidden h-5 w-5 shrink-0 text-slate-300 lg:block" />
                )}
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
