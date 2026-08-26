import { CheckCircle2, Users, Shield, TrendingUp, BookOpen } from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import Card from "@/components/ui/Card";
import { getTranslations } from "next-intl/server";

const benefitIcons = [Shield, TrendingUp, BookOpen, Users];

export default async function RetrainInfo() {
  const t = await getTranslations("retrain");
  const tCommon = await getTranslations("common");
  const paragraphs = t.raw("info.paragraphs") as string[];
  const benefits = t.raw("info.benefits") as string[];
  const forWhom = t.raw("info.forWhom") as string[];

  return (
    <Section>
      <Container className="grid gap-10 lg:grid-cols-2">
        <div>
          <SectionHeader title={t("info.title")} className="mb-0" />
          {paragraphs.map((paragraph, index) => (
            <p
              key={paragraph.slice(0, 40)}
              className={`text-body-sm ${index === 0 ? "mt-4" : "mt-3"}`}
            >
              {paragraph}
            </p>
          ))}
          <div className="mt-6 flex flex-wrap gap-4">
            {benefits.map((label, index) => {
              const Icon = benefitIcons[index];
              return (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-3 py-1.5"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-slate-700">{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <Card className="rounded-2xl bg-blue-50/40">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
              <Users className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{tCommon("forWhom")}</h2>
          </div>
          <ul className="space-y-3">
            {forWhom.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-body-sm text-slate-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </Container>
    </Section>
  );
}
