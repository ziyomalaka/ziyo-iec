import {
  Award,
  Briefcase,
  Clock,
  Target,
  Handshake,
} from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import { getTranslations } from "next-intl/server";

const featureIcons = [Award, Briefcase, Clock, Target, Handshake];

export default async function RetrainFeatures() {
  const t = await getTranslations("retrain");
  const items = t.raw("features.items") as Array<string | { label: string }>;
  const labels = items.map((item) => (typeof item === "string" ? item : item.label));

  return (
    <Section muted className="border-y border-slate-100" padding="none">
      <Container className="grid grid-cols-2 gap-6 py-8 sm:grid-cols-3 lg:grid-cols-5">
        {labels.map((label, index) => {
          const Icon = featureIcons[index];
          return (
            <div key={`${label}-${index}`} className="flex flex-col items-center text-center">
              <div className="icon-box-circle mb-2 h-11 w-11">
                {Icon ? <Icon className="h-5 w-5" /> : null}
              </div>
              <span className="text-xs font-medium text-slate-700 sm:text-sm">
                {label}
              </span>
            </div>
          );
        })}
      </Container>
    </Section>
  );
}
