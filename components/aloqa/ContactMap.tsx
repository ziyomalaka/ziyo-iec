import { MapPin, ExternalLink } from "@/lib/icons";
import { GOOGLE_MAPS_EMBED_URL, GOOGLE_MAPS_URL } from "@/lib/contact";
import Card from "@/components/ui/Card";
import { getTranslations } from "next-intl/server";

export default async function ContactMap() {
  const t = await getTranslations("contact.map");
  const tCommon = await getTranslations("common");

  return (
    <Card className="rounded-2xl">
      <h2 className="text-xl font-bold text-slate-900">{t("title")}</h2>

      <div className="relative mt-6 overflow-hidden rounded-xl border border-border aspect-[4/3]">
        <iframe
          title={t("title")}
          src={GOOGLE_MAPS_EMBED_URL}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />

        <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-slate-100 bg-white p-4 shadow-md">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium text-slate-900">{t("addressLine1")}</p>
              <p className="text-xs text-muted">{t("addressLine2")}</p>
              <p className="mt-1 text-xs text-muted">{t("coordinates")}</p>
            </div>
          </div>
          <a
            href={GOOGLE_MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="link-arrow mt-3 text-xs font-semibold"
          >
            {tCommon("buttons.openDirections")}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </Card>
  );
}
