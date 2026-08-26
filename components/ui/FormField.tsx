import { cn } from "@/lib/cn";

type FormFieldProps = {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
};

export default function FormField({ label, error, children, className }: FormFieldProps) {
  return (
    <div className={cn(className)}>
      {label && <label className="label-field">{label}</label>}
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
