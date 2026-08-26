import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import DirectionCoursesClient from "./DirectionCoursesClient";
import { getTranslations } from "next-intl/server";

export default async function DirectionCourses() {
  const t = await getTranslations("pedagogika");
  const tCommon = await getTranslations("common");
  const courses = t.raw("courses.items") as Array<{
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
  const filters = t.raw("courses.filters") as string[];

  return (
    <Section id="kurslar">
      <Container>
        <SectionHeader title={t("courses.title")} />
        <DirectionCoursesClient
          courses={courses}
          filters={filters}
          searchPlaceholder={t("courses.searchPlaceholder")}
          filtersLabel={tCommon("buttons.filters")}
          onlineLabel={tCommon("online")}
          detailsLabel={tCommon("details")}
          addToFavoritesLabel={tCommon("addToFavorites")}
          viewAllCoursesLabel={tCommon("viewAllCourses")}
        />
      </Container>
    </Section>
  );
}
