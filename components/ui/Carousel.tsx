"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "@/lib/icons";
import { cn } from "@/lib/cn";

type CarouselProps = {
  children: React.ReactNode;
  className?: string;
  slideClassName?: string;
  showArrows?: boolean;
};

export default function Carousel({
  children,
  className,
  slideClassName,
  showArrows = true,
}: CarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    slidesToScroll: 1,
    containScroll: "trimSnaps",
  });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  const arrowClass =
    "absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-primary/15 bg-white text-primary shadow-lg shadow-primary/10 transition-all hover:border-primary/30 hover:bg-surface-blue disabled:opacity-30 lg:flex";

  return (
    <div className={cn("relative px-1", className)}>
      {showArrows && (
        <>
          <button
            onClick={scrollPrev}
            disabled={!canPrev}
            className={cn(arrowClass, "-left-5")}
            aria-label="Oldingi"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={scrollNext}
            disabled={!canNext}
            className={cn(arrowClass, "-right-5")}
            aria-label="Keyingi"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
      <div ref={emblaRef} className="overflow-hidden">
        <div className={cn("flex gap-5", slideClassName)}>{children}</div>
      </div>
    </div>
  );
}

export function CarouselSlide({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 shrink-0 grow-0 basis-[280px]", className)}>
      {children}
    </div>
  );
}
