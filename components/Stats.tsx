import { getTranslations } from "next-intl/server";
import { Users, BookOpen, Video, Award, ShieldCheck } from "@/lib/icons";
import Container from "@/components/ui/Container";

const statIcons = [Users, BookOpen, Video, Award, ShieldCheck];

export default async function Stats() {
  const t = await getTranslations("home.stats");
  const items = t.raw("items") as Array<{ value: string; label: string }>;

  return (
    <section className="relative z-10 -mt-8 w-full lg:-mt-12">
      <Container>
        <div className="overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-[0_8px_40px_-12px_rgba(37,99,235,0.2)]">
          <div className="grid grid-cols-2 divide-y divide-border/60 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-y-0">
            {items.map((stat, index) => {
              const Icon = statIcons[index];
              return (
                <div
                  key={stat.label}
                  className="flex flex-col items-center px-4 py-8 text-center sm:px-6"
                >
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-blue">
                    <Icon className="h-5 w-5 stroke-[1.75] text-primary" />
                  </div>
                  <div className="text-2xl font-extrabold tracking-tight text-primary-dark lg:text-[1.65rem]">
                    {stat.value}
                  </div>
                  <div className="mt-1.5 max-w-[140px] text-xs leading-snug text-muted sm:text-sm">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
