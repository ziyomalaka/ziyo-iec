import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import ContactHero from "@/components/aloqa/ContactHero";
import ContactCards from "@/components/aloqa/ContactCards";
import ContactForm from "@/components/aloqa/ContactForm";
import ContactMap from "@/components/aloqa/ContactMap";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.pages.contact" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function AloqaPage() {
  return (
    <>
      <ContactHero />
      <ContactCards />
      <Section>
        <Container className="grid gap-8 lg:grid-cols-2">
          <ContactForm />
          <ContactMap />
        </Container>
      </Section>
    </>
  );
}
