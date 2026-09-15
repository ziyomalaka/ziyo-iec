"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/errors";
import { getAuthToken, getAuthUser } from "@/lib/auth/session";
import { getPostLoginPath, isStaffRole } from "@/lib/auth/roles";
import { fetchStudentProgram, programHomePath, saveProgramType } from "@/lib/auth/program";
import { isRetrainingApiEnabled, resolveFrontendProgram, setTempProgramType } from "@/lib/retraining/temp-state";
import { signOut } from "@/lib/auth/sign-out";
import type { ProgramType } from "@/lib/validations/register";
import AuthPageTopBar from "@/components/auth/AuthPageTopBar";
import BrandLogo from "@/components/ui/BrandLogo";
import Button from "@/components/ui/Button";
import ProgramTypeField from "@/components/royxatdan-otish/ProgramTypeField";
import LoadingState from "@/components/dashboard/ui/LoadingState";

export default function SelectProgramView() {
  const t = useTranslations("auth.selectProgram");
  const tRegister = useTranslations("register.form");
  const tv = useTranslations("validation.register");
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [value, setValue] = useState<ProgramType | "">("");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const token = getAuthToken();
    if (!token) {
      router.replace("/kirish");
      return;
    }

    const role = getAuthUser()?.role;
    if (isStaffRole(role)) {
      router.replace(getPostLoginPath(role));
      return;
    }

    const temp = resolveFrontendProgram();
    if (temp) {
      router.replace(programHomePath(temp, getAuthUser()?.retraining_type));
      return;
    }

    fetchStudentProgram()
      .then((snapshot) => {
        if (!active) return;
        if (snapshot.program) {
          router.replace(programHomePath(snapshot.program, snapshot.retrainingType));
          return;
        }
        setChecking(false);
      })
      .catch(() => {
        if (active) setChecking(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  const handleSubmit = async () => {
    if (value !== "MALAKA_OSHIRISH" && value !== "QAYTA_TAYYORLASH") {
      setError(tv("programTypeRequired"));
      return;
    }

    setSaving(true);
    try {
      if (!isRetrainingApiEnabled()) setTempProgramType(value);
      const saved = isRetrainingApiEnabled()
        ? await saveProgramType(value)
        : value;
      toast.success(t("toast.successTitle"), { description: t("toast.successDescription") });
      router.replace(programHomePath(saved ?? value));
      router.refresh();
    } catch (caught) {
      const message = caught instanceof ApiError ? caught.message : t("toast.errorDescription");
      setError(message);
      toast.error(t("toast.errorTitle"), { description: message });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/kirish");
  };

  if (checking) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F7F9FC] p-6">
        <div className="w-full max-w-3xl">
          <LoadingState />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-y-auto bg-gradient-to-br from-slate-50 via-surface-blue/30 to-surface-blue/50 px-4 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
      <AuthPageTopBar />

      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-xl shadow-primary/5 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <BrandLogo size="lg" />
            <h1 className="mt-5 text-2xl font-bold text-slate-900">{t("title")}</h1>
            <p className="mt-2 text-body-sm">{t("subtitle")}</p>
          </div>

          <div className="mt-8 space-y-5">
            <ProgramTypeField
              value={value}
              onChange={(next) => {
                setValue(next);
                setError(undefined);
              }}
              label={t("label")}
              optionLabel={(option) => tRegister(`programTypes.${option}`)}
              error={error}
            />

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !value}
              className="w-full"
            >
              {saving ? t("submitting") : t("submit")}
            </Button>

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full text-center text-xs font-medium text-muted transition-colors hover:text-primary"
            >
              {t("signOut")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
