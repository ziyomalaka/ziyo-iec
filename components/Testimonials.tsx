import { getTranslations } from "next-intl/server";
import { Star, Quote } from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";

const testimonialColors = [
  "bg-gradient-to-br from-primary to-primary-light",
  "bg-gradient-to-br from-emerald-500 to-teal-600",
  "bg-gradient-to-br from-violet-500 to-indigo-600",
];

export default async function Testimonials() {
  const t = await getTranslations("home.testimonials");
  const items = t.raw("items") as Array<{
    name: string;
    role: string;
    text: string;
    initials: string;
  }>;

  return (
    <Section>
      <Container>
        <SectionHeader title={t("title")} centered />
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className="card-hover flex flex-col p-6"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-md ${testimonialColors[index]}`}
                >
                  {testimonial.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-900">{testimonial.name}</h4>
                  <p className="text-xs text-muted">{testimonial.role}</p>
                  <div className="mt-2 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="relative mt-5 flex-1 rounded-xl bg-surface-blue/50 p-4">
                <Quote className="absolute -top-2 left-4 h-5 w-5 text-primary/25" />
                <p className="text-body-sm italic leading-relaxed text-slate-600">
                  &ldquo;{testimonial.text}&rdquo;
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === 0 ? "w-8 bg-primary" : "w-2 bg-primary/20"
              }`}
            />
          ))}
        </div>
      </Container>
    </Section>
  );
}
