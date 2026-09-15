import { notFound } from "next/navigation";
import { parseRetrainingSegment } from "@/lib/retraining/kind";

type Props = {
  children: React.ReactNode;
  params: Promise<{ kind: string }>;
};

export function generateStaticParams() {
  return [{ kind: "general" }, { kind: "professional" }, { kind: "pedagogical" }];
}

export default async function RetrainingKindLayout({ children, params }: Props) {
  const { kind } = await params;
  if (!parseRetrainingSegment(kind)) notFound();
  return children;
}
