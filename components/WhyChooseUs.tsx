import { getTranslations } from "next-intl/server";
import {
  GraduationCap,
  ShieldCheck,
  Award,
  Clock,
  Headphones,
} from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";

const featureIcons = [GraduationCap, ShieldCheck, Award, Clock, Headphones];

export default async function WhyChooseUs() {
  const t = await getTranslations("home.whyUs");
  const items = t.raw("items") as Array<{ title: string; description: string }>;

  return (
    <Section muted>
      <Container>
        <SectionHeader title={t("title")} centered />
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
          {items.map((feature, index) => {
            const Icon = featureIcons[index];
            return (
              <div
                key={feature.title}
                className="group flex flex-col items-center rounded-2xl bg-white/70 px-4 py-6 text-center transition-colors hover:bg-white"
              >
                <div className="icon-box-outline mb-5 h-16 w-16 transition-colors group-hover:border-primary/40 group-hover:bg-surface-blue">
                  <Icon className="h-7 w-7 stroke-[1.5]" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
