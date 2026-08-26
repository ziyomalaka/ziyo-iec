import { CheckCircle2, ArrowRight, Award, QrCode } from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import Button from "@/components/ui/Button";
import BrandLogo from "@/components/ui/BrandLogo";
import { getTranslations } from "next-intl/server";

export default async function RetrainDiploma() {
  const t = await getTranslations("retrain");
  const tCommon = await getTranslations("common");
  const benefits = t.raw("diploma.benefits") as string[];

  return (
    <Section id="diplom">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="relative flex justify-center">
            <div className="w-full max-w-md rounded-2xl bg-gradient-to-br from-primary-dark to-primary p-6 shadow-xl">
              <div className="rounded-xl bg-white p-6">
                <div className="text-center">
                  <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {tCommon("diplomLabel")}
                  </div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {tCommon("brandName")}
                  </div>
                </div>
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                  <div className="h-2 w-3/4 mx-auto rounded bg-slate-200" />
                  <div className="h-2 w-1/2 mx-auto rounded bg-slate-100" />
                  <div className="mt-4 flex justify-center gap-4">
                    <BrandLogo size="sm" />
                  </div>
                  <div className="mt-4 h-2 w-2/3 mx-auto rounded bg-slate-100" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <SectionHeader title={t("diploma.title")} className="mb-0" />
            <ul className="mt-6 space-y-3">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-body-sm text-slate-700">{benefit}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Button href="#" variant="primary">
                {tCommon("buttons.verifyDiploma")}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-lg border-2 border-slate-200 bg-white">
                  <QrCode className="h-8 w-8 text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
