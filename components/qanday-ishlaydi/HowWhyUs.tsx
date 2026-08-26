import {
  GraduationCap,
  Monitor,
  Award,
  Target,
  Headphones,
  Shield,
} from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import Card from "@/components/ui/Card";
import { getTranslations } from "next-intl/server";

const featureIcons = [
  GraduationCap,
  Monitor,
  Award,
  Target,
  Headphones,
  Shield,
];

export default async function HowWhyUs() {
  const t = await getTranslations("howItWorks");
  const features = t.raw("whyUs.items") as Array<{
    title: string;
    description: string;
  }>;

  return (
    <Section>
      <Container>
        <SectionHeader title={t("whyUs.title")} centered />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, index) => {
            const Icon = featureIcons[index];
            return (
              <Card key={f.title}>
                <div className="icon-box-circle mb-3 h-10 w-10">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">{f.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {f.description}
                </p>
              </Card>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
