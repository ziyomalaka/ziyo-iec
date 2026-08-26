import { Suspense } from "react";
import ResetPasswordFormCard from "@/components/auth/ResetPasswordFormCard";

export default function ResetPasswordPage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Suspense fallback={null}>
        <ResetPasswordFormCard />
      </Suspense>
    </div>
  );
}
