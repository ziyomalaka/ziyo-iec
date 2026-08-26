"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { ChevronDown, Globe } from "@/lib/icons";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { useState, useRef, useEffect } from "react";

const localeShortKeys: Record<Locale, "localeUzShort" | "localeRuShort"> = {
  uz: "localeUzShort",
  ru: "localeRuShort",
};

const localeFullKeys: Record<Locale, "localeUz" | "localeRu"> = {
  uz: "localeUz",
  ru: "localeRu",
};

export default function LanguageSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const switchLocale = (next: Locale) => {
    router.replace(pathname, { locale: next });
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 transition-colors hover:text-white"
        aria-label={t("language")}
      >
        <Globe className="h-3.5 w-3.5 opacity-80" />
        {t(localeShortKeys[locale])}
        <ChevronDown
          className={cn("h-3.5 w-3.5 opacity-80 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-[120px] overflow-hidden rounded-xl border border-white/10 bg-primary-dark py-1 shadow-xl">
          {routing.locales.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => switchLocale(loc)}
              className={cn(
                "block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/10",
                locale === loc && "font-semibold text-blue-200"
              )}
            >
              {t(localeFullKeys[loc])}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
