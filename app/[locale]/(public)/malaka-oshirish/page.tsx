import UpgradeHero from "@/components/malaka-oshirish/UpgradeHero";
import UpgradeInfo from "@/components/malaka-oshirish/UpgradeInfo";
import UpgradeDirections from "@/components/malaka-oshirish/UpgradeDirections";
import UpgradePopularCourses from "@/components/malaka-oshirish/UpgradePopularCourses";
import UpgradeProcess from "@/components/malaka-oshirish/UpgradeProcess";
import UpgradeLearningCert from "@/components/malaka-oshirish/UpgradeLearningCert";
import UpgradeFaq from "@/components/malaka-oshirish/UpgradeFaq";
import UpgradeCta from "@/components/malaka-oshirish/UpgradeCta";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.pages.upgrade" });
  return { title: t("title"), description: t("description") };
}

export default function MalakaOshirishPage() {
  return (
    <>
      <UpgradeHero />
      <UpgradeInfo />
      <UpgradeDirections />
      <UpgradePopularCourses />
      <UpgradeProcess />
      <UpgradeLearningCert />
      <UpgradeFaq />
      <UpgradeCta />
    </>
  );
}
