import {
  Video,
  FileText,
  ClipboardList,
  MessageCircle,
  BarChart3,
  Award,
  Download,
  Headphones,
  CheckCircle2,
} from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import Card from "@/components/ui/Card";
import BrandLogo from "@/components/ui/BrandLogo";
import { getTranslations } from "next-intl/server";

const learningIcons = [
  Video,
  FileText,
  ClipboardList,
  MessageCircle,
  BarChart3,
  Award,
  Download,
  Headphones,
];

export default async function UpgradeLearningCert() {
  const t = await getTranslations("upgrade");
  const tCommon = await getTranslations("common");
  const learningItems = t.raw("learningCert.learningItems") as string[];
  const certFeatures = t.raw("learningCert.certFeatures") as string[];

  return (
    <Section>
      <Container>
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeader title={t("learningCert.learningTitle")} className="mb-6" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {learningItems.map((label, index) => {
                const Icon = learningIcons[index];
                return (
                  <Card
                    key={label}
                    className="flex flex-col items-center bg-slate-50/50 text-center"
                  >
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium text-slate-700">{label}</span>
                  </Card>
                );
              })}
            </div>
          </div>

          <div>
            <SectionHeader title={t("learningCert.certTitle")} className="mb-6" />
            <Card className="rounded-2xl">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-xl bg-gradient-to-br from-blue-50 to-white p-4 border border-slate-100">
                  <div className="text-center">
                    <div className="text-xs font-semibold uppercase text-primary">
                      {tCommon("certificateLabel")}
                    </div>
                    <div className="mt-1 font-bold text-slate-900">
                      {tCommon("brandName")}
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="h-1.5 w-full rounded bg-slate-200" />
                    <div className="h-1.5 w-3/4 mx-auto rounded bg-slate-100" />
                    <div className="mt-3 flex justify-center">
                      <BrandLogo size="sm" />
                    </div>
                  </div>
                </div>
                <div>
                  <ul className="space-y-2.5">
                    {certFeatures.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-body-sm text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </Container>
    </Section>
  );
}
