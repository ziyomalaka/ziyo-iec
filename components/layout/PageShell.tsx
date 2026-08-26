import { cn } from "@/lib/cn";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

type PageShellProps = {
  children: React.ReactNode;
  className?: string;
};

export default function PageShell({ children, className }: PageShellProps) {
  return (
    <div className="page-shell">
      <Header />
      <main className={cn("page-main", className)}>{children}</main>
      <Footer />
    </div>
  );
}
