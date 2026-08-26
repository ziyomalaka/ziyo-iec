"use client";

import {
  UserPlus,
  Search,
  PlayCircle,
  ClipboardCheck,
  Award,
  CheckCircle2,
  Shield,
} from "@/lib/icons";
import Card from "@/components/ui/Card";
import Tabs from "@/components/ui/Tabs";

const stepIcons = [UserPlus, Search, PlayCircle, ClipboardCheck, Award];

type StepDetail = {
  title: string;
  description: string;
  checklist: string[];
};

function StepContent({ step, index }: { step: StepDetail; index: number }) {
  const Icon = stepIcons[index];

  return (
    <Card className="rounded-2xl lg:p-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-xl font-bold text-slate-900">
            {index + 1}. {step.title}
          </h3>
          <p className="mt-3 text-body-sm">{step.description}</p>
          <ul className="mt-5 space-y-2.5">
            {step.checklist.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-body-sm text-slate-700"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-center">
          <div className="relative w-full max-w-xs">
            <div className="rounded-xl border border-border bg-surface p-6">
              <div className="mx-auto h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full rounded bg-slate-200" />
                <div className="h-8 w-full rounded border border-border bg-white" />
                <div className="h-8 w-full rounded bg-primary/80" />
              </div>
            </div>
            {index === 0 && (
              <div className="absolute -right-2 top-1/2 -translate-y-1/2">
                <Shield className="h-12 w-12 text-primary/30" />
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

type HowStepDetailsTabsProps = {
  steps: StepDetail[];
};

export default function HowStepDetailsTabs({ steps }: HowStepDetailsTabsProps) {
  const tabItems = steps.map((step, i) => ({
    value: `step-${i}`,
    label: `${i + 1}. ${step.title}`,
    content: <StepContent step={step} index={i} />,
  }));

  return (
    <>
      <div className="lg:hidden">
        <Tabs items={tabItems} />
      </div>
      <div className="hidden lg:block">
        <Tabs orientation="vertical" items={tabItems} />
      </div>
    </>
  );
}
