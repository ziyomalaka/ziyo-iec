import {
  Compass,
  BookOpen,
  UserPlus,
  FileText,
  Wallet,
  PlayCircle,
  ShieldCheck,
  Award,
  ChevronRight,
} from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import { getTranslations } from "next-intl/server";

const stepIcons = [Compass, BookOpen, UserPlus, FileText, Wallet, PlayCircle, ShieldCheck, Award];
const stepColors = [
  "bg-blue-100 text-blue-600",
  "bg-emerald-100 text-emerald-600",
  "bg-violet-100 text-violet-600",
  "bg-orange-100 text-orange-600",
  "bg-emerald-100 text-emerald-600",
  "bg-blue-100 text-blue-600",
  "bg-violet-100 text-violet-600",
  "bg-orange-100 text-orange-600",
];

export default async function UpgradeProcess() {
  const t = await getTranslations("upgrade");
  const steps = t.raw("process.steps") as string[];

  return (
    <Section id="jarayon" muted>
      <Container>
        <SectionHeader title={t("process.title")} centered />
        <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-start lg:justify-between">
          {steps.map((label, index) => {
            const Icon = stepIcons[index];
            return (
              <div key={label} className="flex items-center gap-1 lg:flex-1">
                <div className="flex flex-col items-center text-center flex-1">
                  <div
                    className={`mb-2 flex h-11 w-11 items-center justify-center rounded-full ${stepColors[index]}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="max-w-[80px] text-[10px] font-medium leading-tight text-slate-700">
                    {label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <ChevronRight className="hidden h-4 w-4 shrink-0 text-slate-300 lg:block" />
                )}
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
