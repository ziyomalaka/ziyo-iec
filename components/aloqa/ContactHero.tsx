import { Headphones, Mail, MessageCircle, Smartphone, Clock } from "@/lib/icons";
import { WORK_HOURS } from "@/lib/contact";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Badge from "@/components/ui/Badge";
import { getTranslations } from "next-intl/server";

export default async function ContactHero() {
  const t = await getTranslations("contact.hero");
  const tCommon = await getTranslations("common");

  return (
    <Section hero padding="sm">
      <Container>
        <Breadcrumbs
          items={[
            { label: tCommon("breadcrumbs.home"), href: "/" },
            { label: tCommon("breadcrumbs.contact") },
          ]}
        />

        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h1 className="heading-page">{t("title")}</h1>
            <p className="mt-4 max-w-lg text-body">{t("description")}</p>
            <p className="mt-2 text-body-sm">{t("subtitle")}</p>
            <Badge variant="primary" className="mt-3 inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {tCommon("workHoursLabel", { hours: WORK_HOURS })}
            </Badge>
          </div>

          <div className="relative hidden justify-center lg:flex">
            <div className="relative flex items-end gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Headphones className="h-8 w-8 text-primary" />
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
                <Mail className="h-6 w-6 text-primary mb-2" />
                <div className="h-2 w-20 rounded bg-slate-200" />
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-md">
                <Smartphone className="h-6 w-6 text-primary mb-2" />
                <MessageCircle className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="absolute -bottom-2 left-0">
                <div className="h-8 w-8 rounded-full bg-green-400/70" />
                <div className="mx-auto mt-1 h-4 w-6 rounded-b-md bg-amber-700/50" />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
