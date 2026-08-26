import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  FaFacebook,
  FaTelegram,
  FaInstagram,
  FaYoutube,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  Clock,
} from "@/lib/icons";
import { WORK_HOURS, GOOGLE_MAPS_URL, CONTACT_EMAIL } from "@/lib/contact";
import Container from "@/components/ui/Container";
import BrandLogo from "@/components/ui/BrandLogo";

const platformHrefs = [
  "/",
  "/yonalishlar/pedagogika",
  "/malaka-oshirish",
  "/qayta-tayyorlash",
];

const socialKeys = ["facebook", "telegram", "instagram", "youtube"] as const;

const socialHrefs: Record<(typeof socialKeys)[number], string> = {
  facebook: "#",
  telegram: "https://t.me/ziyomalaka_uz",
  instagram: "#",
  youtube: "#",
};

const socialIcons = {
  facebook: FaFacebook,
  telegram: FaTelegram,
  instagram: FaInstagram,
  youtube: FaYoutube,
};

type UsefulLink = { label: string; href: string };

export default async function Footer() {
  const t = await getTranslations("footer");
  const tCommon = await getTranslations("common");

  const platformLinks = t.raw("platformLinks") as string[];
  const usefulLinks = t.raw("usefulLinksItems") as UsefulLink[];

  return (
    <footer className="mt-auto w-full bg-primary-dark text-white">
      <div className="h-1 bg-gradient-to-r from-primary via-primary-light to-primary" />
      <Container className="py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-3">
              <BrandLogo size="sm" />
              <div className="flex flex-col">
                <span className="text-lg font-bold leading-tight">{tCommon("brandName")}</span>
                <span className="text-[11px] leading-tight text-blue-200/80">
                  {tCommon("brandTagline")}
                </span>
              </div>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-blue-100/80">
              {t("description")}
            </p>
            <div className="mt-5 flex gap-3">
              {socialKeys.map((key) => {
                const Icon = socialIcons[key];
                const label = t(`social.${key}`);
                return (
                  <a
                    key={key}
                    href={socialHrefs[key]}
                    aria-label={label}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 transition-all hover:border-white/30 hover:bg-white/15"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-200">
              {t("platform")}
            </h4>
            <ul className="space-y-2.5">
              {platformLinks.map((link, index) => (
                <li key={link}>
                  <Link
                    href={platformHrefs[index] ?? "#"}
                    prefetch
                    className="text-sm text-blue-100/80 hover:text-white transition-colors"
                  >
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-200">
              {t("usefulLinks")}
            </h4>
            <ul className="space-y-2.5">
              {usefulLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    prefetch
                    className="text-sm text-blue-100/80 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-200">
              {t("contact")}
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href={GOOGLE_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 text-sm text-blue-100/80 hover:text-white transition-colors"
                >
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  {t("address")}
                </a>
              </li>
              <li>
                <a
                  href="tel:+998949380440"
                  className="flex items-center gap-2.5 text-sm text-blue-100/80 hover:text-white transition-colors"
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  +998 94 938 04 40
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="flex items-center gap-2.5 text-sm text-blue-100/80 hover:text-white transition-colors"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-blue-100/80">
                <Clock className="h-4 w-4 shrink-0" />
                {tCommon("workHoursLabel", { hours: WORK_HOURS })}
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-200">
              {t("subscribe")}
            </h4>
            <p className="mb-3 text-sm text-blue-100/80">
              {t("subscribeDescription")}
            </p>
            <div className="flex overflow-hidden rounded-xl shadow-sm">
              <input
                type="email"
                placeholder={t("emailPlaceholder")}
                className="flex-1 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none"
              />
              <button className="flex items-center justify-center bg-primary px-4 transition-colors hover:bg-primary-light">
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-center text-sm text-blue-200/60">
          {tCommon("copyright")}
        </div>
      </Container>
    </footer>
  );
}
