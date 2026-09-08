import { cn } from "@/lib/cn";

type FormFieldProps = {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
};

export default function FormField({ label, error, children, className, required }: FormFieldProps) {
  return (
    <div className={cn(className)}>
      {label ? (
        <label className="label-field">
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </label>
      ) : null}
      {children}
      {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
