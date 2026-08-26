import ResetPasswordPage from "@/components/auth/ResetPasswordPage";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.pages.resetPassword" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function ParolniQaytaOrnatishPage() {
  return <ResetPasswordPage />;
}
