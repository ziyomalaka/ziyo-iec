import { Suspense } from "react";
import ResetPasswordFormCard from "@/components/auth/ResetPasswordFormCard";

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Suspense fallback={null}>
        <ResetPasswordFormCard />
      </Suspense>
    </div>
  );
}
