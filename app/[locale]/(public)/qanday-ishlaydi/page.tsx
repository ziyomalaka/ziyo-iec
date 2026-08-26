import Stats from "@/components/Stats";
import HowHero from "@/components/qanday-ishlaydi/HowHero";
import HowSteps from "@/components/qanday-ishlaydi/HowSteps";
import HowStepDetails from "@/components/qanday-ishlaydi/HowStepDetails";
import HowWhyUs from "@/components/qanday-ishlaydi/HowWhyUs";
import HowFaqContact from "@/components/qanday-ishlaydi/HowFaqContact";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.pages.howItWorks" });
  return { title: t("title"), description: t("description") };
}

export default function QandayIshlaydiPage() {
  return (
    <>
      <HowHero />
      <HowSteps />
      <HowStepDetails />
      <HowWhyUs />
      <Stats />
      <HowFaqContact />
    </>
  );
}
