import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import CourseCategories from "@/components/CourseCategories";
import WhyChooseUs from "@/components/WhyChooseUs";
import HowItWorks from "@/components/HowItWorks";
import PopularCourses from "@/components/PopularCourses";
import Partners from "@/components/Partners";
import Testimonials from "@/components/Testimonials";
import News from "@/components/News";
import FaqBanner from "@/components/FaqBanner";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.pages.home" });
  return { title: t("title"), description: t("description") };
}

export default function Home() {
  return (
    <>
      <Hero />
      <Stats />
      <CourseCategories />
      <WhyChooseUs />
      <HowItWorks />
      <PopularCourses />
      <Partners />
      <Testimonials />
      <News />
      <FaqBanner />
    </>
  );
}
