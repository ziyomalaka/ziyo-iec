import { Star, Clock, BookOpen, Monitor } from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { getTranslations } from "next-intl/server";

const courseMeta = [
  { gradient: "from-violet-500 to-indigo-600", badgeColor: "bg-orange-500", href: undefined },
  { gradient: "from-emerald-500 to-teal-600", badgeColor: "bg-emerald-500", href: undefined },
  { gradient: "from-blue-500 to-cyan-600", badgeColor: "bg-orange-500", href: "/yonalishlar/pedagogika" as const },
  { gradient: "from-orange-500 to-amber-600", badgeColor: "", href: undefined },
  { gradient: "from-pink-500 to-rose-600", badgeColor: "bg-emerald-500", href: undefined },
];

export default async function RetrainPopularCourses() {
  const t = await getTranslations("retrain");
  const tCommon = await getTranslations("common");
  const courses = t.raw("popularCourses.items") as Array<{
    title: string;
    category: string;
    months: string;
    hours: string;
    rating: number;
    reviews: number;
    price: string;
    badge: string | null;
  }>;

  return (
    <Section id="kurslar">
      <Container>
        <SectionHeader
          title={t("popularCourses.title")}
          link={{ href: "#", label: tCommon("viewAllCourses") }}
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {courses.map((course, index) => {
            const meta = courseMeta[index];
            return (
              <Card key={course.title} hover padding={false} className="overflow-hidden">
                <div className={`relative h-32 bg-gradient-to-br ${meta.gradient}`}>
                  {course.badge &&
                    !/chegirma|скидк/i.test(course.badge) && (
                    <span
                      className={`absolute left-3 top-3 rounded-full ${meta.badgeColor} px-2 py-0.5 text-xs font-semibold text-white`}
                    >
                      {course.badge}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-bold leading-snug text-slate-900 line-clamp-2 min-h-[2.5rem]">
                    {course.title}
                  </h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                    <BookOpen className="h-3 w-3" />
                    {course.category}
                  </p>
                  <div className="mt-2 space-y-1 text-xs text-muted">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {course.months} · {course.hours}
                    </div>
                    <div className="flex items-center gap-1">
                      <Monitor className="h-3 w-3" />
                      {tCommon("online")}
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="flex items-center gap-1 text-xs">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {course.rating} ({course.reviews})
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      href={meta.href ?? "#"}
                      variant="outline-sm"
                      className="flex-1"
                    >
                      {tCommon("details")}
                    </Button>
                    <Button variant="primary-sm" className="flex-1">
                      {tCommon("buttons.enroll")}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
