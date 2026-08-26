import {
  Lightbulb,
  Calendar,
  ClipboardCheck,
  Laptop,
  Award,
} from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import Card from "@/components/ui/Card";
import { getTranslations } from "next-intl/server";

const outcomeIcons = [Lightbulb, Calendar, ClipboardCheck, Laptop, Award];
const outcomeColors = [
  "bg-blue-100 text-blue-600",
  "bg-emerald-100 text-emerald-600",
  "bg-violet-100 text-violet-600",
  "bg-orange-100 text-orange-600",
  "bg-cyan-100 text-cyan-600",
];

export default async function WhatYouLearn() {
  const t = await getTranslations("pedagogika");
  const outcomes = t.raw("whatYouLearn.items") as Array<{
    title: string;
    description: string;
  }>;

  return (
    <Section id="nima-organasiz" muted>
      <Container>
        <SectionHeader title={t("whatYouLearn.title")} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {outcomes.map((item, index) => {
            const Icon = outcomeIcons[index];
            return (
              <Card key={item.title} className="flex gap-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${outcomeColors[index]}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {item.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
