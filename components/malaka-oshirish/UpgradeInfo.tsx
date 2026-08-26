import {
  RefreshCw,
  Lightbulb,
  TrendingUp,
  Award,
  GraduationCap,
  Briefcase,
  Users,
  Building2,
} from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import Card from "@/components/ui/Card";
import { getTranslations } from "next-intl/server";

const benefitIcons = [RefreshCw, Lightbulb, TrendingUp, Award];
const benefitColors = [
  "bg-blue-100 text-blue-600",
  "bg-emerald-100 text-emerald-600",
  "bg-orange-100 text-orange-600",
  "bg-violet-100 text-violet-600",
];
const forWhomIcons = [GraduationCap, Briefcase, Users, Building2];

export default async function UpgradeInfo() {
  const t = await getTranslations("upgrade");
  const tCommon = await getTranslations("common");
  const benefits = t.raw("info.benefits") as Array<{
    title: string;
    description: string;
  }>;
  const forWhom = t.raw("info.forWhom") as string[];

  return (
    <Section>
      <Container className="grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionHeader title={t("info.title")} className="mb-6" />
          <div className="grid gap-4 sm:grid-cols-2">
            {benefits.map((b, index) => {
              const Icon = benefitIcons[index];
              return (
                <Card key={b.title} className="flex gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${benefitColors[index]}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{b.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      {b.description}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <Card className="rounded-2xl bg-blue-50/40">
          <h2 className="mb-4 text-xl font-bold text-slate-900">{tCommon("forWhom")}</h2>
          <ul className="space-y-3">
            {forWhom.map((label, index) => {
              const Icon = forWhomIcons[index];
              return (
                <li key={label} className="flex items-center gap-3 text-body-sm text-slate-700">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  {label}
                </li>
              );
            })}
          </ul>
        </Card>
      </Container>
    </Section>
  );
}
