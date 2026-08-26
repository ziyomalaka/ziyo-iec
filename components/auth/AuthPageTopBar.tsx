"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ArrowLeft } from "@/lib/icons";
import LoginLanguageSwitcher from "@/components/kirish/LoginLanguageSwitcher";

export default function AuthPageTopBar() {
  const t = useTranslations("common");
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="flex shrink-0 items-center justify-between py-1">
      <button
        type="button"
        onClick={handleBack}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white text-slate-700 shadow-sm transition-colors hover:border-primary hover:text-primary"
        aria-label={t("back")}
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <LoginLanguageSwitcher />
    </div>
  );
}
