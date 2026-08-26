import PageShell from "@/components/layout/PageShell";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PageShell>{children}</PageShell>;
}
