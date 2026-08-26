import { CheckCircle2, Award } from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import Card from "@/components/ui/Card";
import BrandLogo from "@/components/ui/BrandLogo";
import { getTranslations } from "next-intl/server";

export default async function CertificateInfo() {
  const t = await getTranslations("pedagogika");
  const tCommon = await getTranslations("common");
  const benefits = t.raw("certificate.benefits") as string[];

  return (
    <Section id="sertifikat" muted>
      <Container>
        <SectionHeader title={t("certificate.title")} />
        <Card className="grid items-center gap-10 rounded-2xl lg:grid-cols-2">
          <div>
            <ul className="space-y-4">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  <span className="text-body-sm text-slate-700">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative flex justify-center">
            <div className="w-full max-w-sm rounded-xl border-2 border-slate-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-lg">
              <div className="mb-4 text-center">
                <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {tCommon("certificateLabel")}
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900">
                  {tCommon("brandName")}
                </div>
              </div>
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <div className="h-2 w-3/4 mx-auto rounded bg-slate-200" />
                <div className="h-2 w-1/2 mx-auto rounded bg-slate-100" />
                <div className="mt-4 flex justify-center">
                  <BrandLogo size="sm" />
                </div>
                <div className="mt-4 h-2 w-2/3 mx-auto rounded bg-slate-100" />
              </div>
            </div>
            <div className="absolute -right-2 -top-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Award className="h-8 w-8 text-primary" />
            </div>
          </div>
        </Card>
      </Container>
    </Section>
  );
}
