import { UserRound } from "lucide-react";

export default function ProfilePageIntro() {
  return (
    <div className="mb-[1.6%] flex w-full items-start gap-[1%]">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center text-[#0756F5]">
        <UserRound className="h-8 w-8" strokeWidth={1.75} />
      </div>
      <div>
        <h1 className="text-[25px] leading-none font-bold text-[#111b39]">Profil</h1>
        <p className="mt-1.5 text-[13px] text-[#31548a]">
          Shaxsiy ma&apos;lumotlaringizni ko&apos;rish va boshqarish.
        </p>
      </div>
    </div>
  );
}
