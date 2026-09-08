import SelectProgramView from "@/components/select-program/SelectProgramView";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.selectProgram" });

  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default function SelectProgramPage() {
  return <SelectProgramView />;
}
