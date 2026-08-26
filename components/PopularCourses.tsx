import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Star, Clock, BookOpen, Monitor, Heart, ArrowRight } from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const courseMeta = [
  { gradient: "from-blue-500 to-indigo-600", badgeColor: "bg-emerald-500" },
  { gradient: "from-violet-500 to-purple-600", badgeColor: "bg-primary" },
  { gradient: "from-emerald-500 to-teal-600", badgeColor: "bg-red-500" },
  { gradient: "from-orange-500 to-amber-600", badgeColor: "" },
  { gradient: "from-cyan-500 to-blue-600", badgeColor: "bg-emerald-500" },
];

export default async function PopularCourses() {
  const t = await getTranslations("pedagogika.courses");
  const tCommon = await getTranslations("common");
  const courses = t.raw("items") as Array<{
    title: string;
    badge: string | null;
    type: string;
    hours: string;
    lessons: string;
    rating: number;
    reviews: number;
    price: string;
    oldPrice: string | null;
  }>;

  return (
    <Section muted>
      <Container>
        <SectionHeader title={t("title")} />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {courses.map((course, index) => {
            const meta = courseMeta[index];
            return (
              <Card key={course.title} hover padding={false} className="overflow-hidden">
                <div className={`relative h-36 bg-gradient-to-br ${meta.gradient}`}>
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
                  <h3 className="min-h-[2.5rem] text-sm font-bold leading-snug text-slate-900 line-clamp-2">
                    {course.title}
                  </h3>
                  <div className="mt-3 space-y-1.5 text-xs text-muted">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="h-3 w-3" />
                      {course.type}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {course.hours} · {course.lessons}
                    </div>
                    <div className="flex items-center gap-1.5">
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
                  <div className="mt-3 flex items-center gap-2">
                    <Button href="/yonalishlar/pedagogika" variant="primary-sm" className="flex-1">
                      {tCommon("details")}
                    </Button>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500 transition-colors"
                      aria-label={tCommon("addToFavorites")}
                    >
                      <Heart className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Button href="/yonalishlar/pedagogika" variant="outline">
            {tCommon("viewAllCourses")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Container>
    </Section>
  );
}
