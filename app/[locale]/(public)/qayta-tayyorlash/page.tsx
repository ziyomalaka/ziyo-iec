import RetrainHero from "@/components/qayta-tayyorlash/RetrainHero";
import RetrainFeatures from "@/components/qayta-tayyorlash/RetrainFeatures";
import RetrainInfo from "@/components/qayta-tayyorlash/RetrainInfo";
import RetrainDirections from "@/components/qayta-tayyorlash/RetrainDirections";
import RetrainPopularCourses from "@/components/qayta-tayyorlash/RetrainPopularCourses";
import RetrainProcess from "@/components/qayta-tayyorlash/RetrainProcess";
import RetrainDiploma from "@/components/qayta-tayyorlash/RetrainDiploma";
import RetrainFaq from "@/components/qayta-tayyorlash/RetrainFaq";
import RetrainCta from "@/components/qayta-tayyorlash/RetrainCta";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.pages.retrain" });
  return { title: t("title"), description: t("description") };
}

export default function QaytaTayyorlashPage() {
  return (
    <>
      <RetrainHero />
      <RetrainFeatures />
      <RetrainInfo />
      <RetrainDirections />
      <RetrainPopularCourses />
      <RetrainProcess />
      <RetrainDiploma />
      <RetrainFaq />
      <RetrainCta />
    </>
  );
}
