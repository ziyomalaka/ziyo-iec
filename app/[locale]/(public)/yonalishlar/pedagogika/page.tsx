import DirectionHero from "@/components/pedagogika/DirectionHero";
import DirectionAbout from "@/components/pedagogika/DirectionAbout";
import DirectionSubsections from "@/components/pedagogika/DirectionSubsections";
import DirectionCourses from "@/components/pedagogika/DirectionCourses";
import WhatYouLearn from "@/components/pedagogika/WhatYouLearn";
import StudyProcess from "@/components/pedagogika/StudyProcess";
import CertificateInfo from "@/components/pedagogika/CertificateInfo";
import DirectionFaq from "@/components/pedagogika/DirectionFaq";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.pages.pedagogika" });
  return { title: t("title"), description: t("description") };
}

export default function PedagogikaPage() {
  return (
    <>
      <DirectionHero />
      <DirectionAbout />
      <DirectionSubsections />
      <DirectionCourses />
      <WhatYouLearn />
      <StudyProcess />
      <CertificateInfo />
      <DirectionFaq />
    </>
  );
}
