import { Phone, FaTelegram, FaInstagram, Mail } from "@/lib/icons";
import { WORK_HOURS, CONTACT_EMAIL } from "@/lib/contact";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import { getTranslations } from "next-intl/server";

const PHONE_NUMBER = "+998 94 938 04 40";

const contactMeta = [
  {
    icon: Phone,
    href: "tel:+998949380440",
    color: "bg-blue-100 text-blue-600",
    value: PHONE_NUMBER,
  },
  {
    icon: FaTelegram,
    href: "https://t.me/ziyomalaka_uz",
    color: "bg-sky-100 text-sky-600",
  },
  {
    icon: FaInstagram,
    href: "https://www.instagram.com/ziyo_xalqaro_talim_markazi",
    color: "bg-pink-100 text-pink-600",
  },
  {
    icon: Mail,
    href: `mailto:${CONTACT_EMAIL}`,
    color: "bg-violet-100 text-violet-600",
  },
];

export default async function ContactCards() {
  const t = await getTranslations("contact.cards");
  const tCommon = await getTranslations("common");
  const items = t.raw("items") as Array<{ title: string; value: string }>;
  const workHoursShort = tCommon("workHoursShort", { hours: WORK_HOURS });

  const contacts = contactMeta.map((meta, index) => ({
    ...items[index],
    ...meta,
    sub: workHoursShort,
  }));

  return (
    <Section muted className="border-y border-slate-100" padding="sm">
      <Container className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
        {contacts.map((c) => (
          <a key={c.title} href={c.href}>
            <Card hover className="h-full">
              <div
                className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${c.color}`}
              >
                <c.icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">{c.title}</h3>
              <p className="mt-1 text-sm font-medium text-primary">{c.value}</p>
              <p className="mt-0.5 text-xs text-muted">{c.sub}</p>
            </Card>
          </a>
        ))}
      </Container>
    </Section>
  );
}
