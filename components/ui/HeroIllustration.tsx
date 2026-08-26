import Image from "next/image";
import { cn } from "@/lib/cn";

type HeroIllustrationProps = {
  className?: string;
  priority?: boolean;
};

export default function HeroIllustration({ className, priority }: HeroIllustrationProps) {
  return (
    <div className={cn("relative w-full max-w-xl", className)}>
      <Image
        src="/images/hero-laptop-books.png"
        alt="ZiyoMalaka onlayn ta'lim platformasi — noutbuk, kitoblar va diplom"
        width={960}
        height={720}
        priority={priority}
        sizes="(max-width: 1024px) 90vw, 576px"
        quality={75}
        className="h-auto w-full object-contain drop-shadow-2xl"
      />
    </div>
  );
}
