"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { ChevronDown, Globe } from "@/lib/icons";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { useEffect, useRef, useState } from "react";

const localeFullKeys: Record<Locale, "localeUz" | "localeRu"> = {
  uz: "localeUz",
  ru: "localeRu",
};

export default function LoginLanguageSwitcher() {
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
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-primary"
        aria-label={t("language")}
      >
        <Globe className="h-4 w-4" />
        {t(localeFullKeys[locale])}
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[140px] overflow-hidden rounded-lg border border-border bg-white py-1 shadow-lg">
          {routing.locales.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => switchLocale(loc)}
              className={cn(
                "block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-surface",
                locale === loc && "font-medium text-primary"
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
