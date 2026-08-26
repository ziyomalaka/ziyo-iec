import { getTranslations } from "next-intl/server";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";

export default async function Partners() {
  const t = await getTranslations("home.partners");
  const items = t.raw("items") as Array<{ name: string; abbr: string }>;

  return (
    <Section padding="sm" className="border-y border-border/60 bg-white">
      <Container>
        <SectionHeader title={t("title")} centered />
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4 lg:gap-8">
          {items.map((partner) => (
            <div
              key={partner.abbr}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-surface/50 px-4 py-8 grayscale opacity-75 transition-all hover:grayscale-0 hover:opacity-100 hover:shadow-sm"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-lg font-bold text-slate-400 shadow-sm ring-1 ring-border/60">
                {partner.abbr}
              </div>
              <p className="mt-4 text-center text-xs leading-snug text-muted">{partner.name}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
