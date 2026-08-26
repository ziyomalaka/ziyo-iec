import { redirect } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminItRedirectPage({ params }: Props) {
  const { locale } = await params;
  redirect({ href: "/admin/software/qualification", locale });
}
