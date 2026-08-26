import LoginPage from "@/components/kirish/LoginPage";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.pages.login" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function KirishPage() {
  return <LoginPage />;
}
