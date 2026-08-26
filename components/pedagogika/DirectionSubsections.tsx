import {
  Monitor,
  BookOpen,
  ClipboardCheck,
  Heart,
  Laptop,
  Award,
} from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import Card from "@/components/ui/Card";
import { getTranslations } from "next-intl/server";

const subsectionIcons = [Monitor, BookOpen, ClipboardCheck, Heart, Laptop, Award];
const iconBgs = [
  "bg-blue-100",
  "bg-emerald-100",
  "bg-violet-100",
  "bg-pink-100",
  "bg-orange-100",
  "bg-cyan-100",
];
const iconColors = [
  "text-blue-600",
  "text-emerald-600",
  "text-violet-600",
  "text-pink-600",
  "text-orange-600",
  "text-cyan-600",
];

export default async function DirectionSubsections() {
  const t = await getTranslations("pedagogika");
  const subsections = t.raw("subsections.items") as string[];

  return (
    <Section id="bo-limlar" muted>
      <Container>
        <SectionHeader title={t("subsections.title")} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {subsections.map((title, index) => {
            const Icon = subsectionIcons[index];
            return (
              <Card
                key={title}
                hover
                className="flex flex-col items-center text-center"
              >
                <div
                  className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${iconBgs[index]}`}
                >
                  <Icon className={`h-6 w-6 ${iconColors[index]}`} />
                </div>
                <h3 className="text-sm font-semibold leading-snug text-slate-800">
                  {title}
                </h3>
              </Card>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
