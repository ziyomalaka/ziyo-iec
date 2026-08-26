"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Phone, Mail, Menu, X } from "@/lib/icons";
import BrandLogo from "@/components/ui/BrandLogo";
import { CONTACT_EMAIL } from "@/lib/contact";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { cn } from "@/lib/cn";

const topLinks = [
  { key: "about", href: "#" },
  { key: "news", href: "/#yangiliklar" },
  { key: "contact", href: "/aloqa" },
] as const;

const navLinks = [
  { href: "/", key: "home" },
  { href: "/yonalishlar/pedagogika", key: "directions" },
  { href: "/malaka-oshirish", key: "upgrade" },
  { href: "/qayta-tayyorlash", key: "retrain" },
] as const;

function getActiveNav(pathname: string) {
  if (pathname.startsWith("/yonalishlar")) return "directions";
  if (pathname.startsWith("/malaka-oshirish")) return "upgrade";
  if (pathname.startsWith("/qayta-tayyorlash")) return "retrain";
  if (pathname.startsWith("/aloqa")) return "contact";
  if (pathname === "/") return "home";
  return "";
}

export default function Header() {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const activeNav = getActiveNav(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="bg-primary-dark text-white/90 text-sm">
        <Container className="flex w-full items-center justify-between py-2.5">
          <div className="flex items-center gap-4 sm:gap-6">
            <a
              href="tel:+998949380440"
              className="flex items-center gap-1.5 transition-colors hover:text-white"
            >
              <Phone className="h-3.5 w-3.5 shrink-0 opacity-80" />
              <span className="sm:inline">+998 94 938 04 40</span>
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="hidden sm:flex items-center gap-1.5 transition-colors hover:text-white"
            >
              <Mail className="h-3.5 w-3.5 opacity-80" />
              <span>{CONTACT_EMAIL}</span>
            </a>
          </div>
          <div className="flex items-center gap-4 sm:gap-5">
            {topLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                prefetch
                className="hidden md:inline transition-colors hover:text-white"
              >
                {t(`topLinks.${link.key}`)}
              </Link>
            ))}
            <LanguageSwitcher />
          </div>
        </Container>
      </div>

      <div className="border-b border-border/80 bg-white shadow-[0_4px_20px_-8px_rgba(15,35,64,0.12)]">
        <Container className="flex w-full items-center justify-between gap-4 py-3.5">
          <Link href="/" prefetch className="flex items-center gap-3 shrink-0" onClick={closeMobile}>
            <BrandLogo size="sm" priority />
            <div className="hidden flex-col sm:flex">
              <span className="text-lg font-bold leading-tight text-primary-dark lg:text-xl">
                {t("brandName")}
              </span>
              <span className="text-[11px] leading-tight text-muted">{t("brandTagline")}</span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                prefetch
                className={cn(
                  "relative whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors hover:text-primary xl:px-3.5",
                  activeNav === link.key ? "nav-active" : "text-slate-600"
                )}
              >
                {t(`nav.${link.key}`)}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <Button href="/kirish" variant="outline-sm" className="hidden sm:inline-flex">
              {t("buttons.login")}
            </Button>

            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-slate-700 transition-colors hover:border-primary/30 hover:bg-surface-blue lg:hidden"
              aria-label={
                locale === "ru"
                  ? mobileOpen
                    ? "Закрыть меню"
                    : "Открыть меню"
                  : mobileOpen
                    ? "Menyuni yopish"
                    : "Menyuni ochish"
              }
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </Container>
      </div>

      {mobileOpen && (
        <div className="border-b border-border bg-white lg:hidden">
          <Container className="py-4">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  prefetch
                  onClick={closeMobile}
                  className={cn(
                    "rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                    activeNav === link.key
                      ? "bg-primary/10 text-primary"
                      : "text-slate-700 hover:bg-surface-blue hover:text-primary"
                  )}
                >
                  {t(`nav.${link.key}`)}
                </Link>
              ))}
            </nav>

            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 md:hidden">
              {topLinks.map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  prefetch
                  onClick={closeMobile}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-primary"
                >
                  {t(`topLinks.${link.key}`)}
                </Link>
              ))}
            </div>

            <div className="mt-4 sm:hidden">
              <Button href="/kirish" variant="outline-sm" className="w-full" onClick={closeMobile}>
                {t("buttons.login")}
              </Button>
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
