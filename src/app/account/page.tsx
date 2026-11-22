import { getTranslations } from "next-intl/server";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { MfaManager, PasswordForm, ProfileForm } from "./account-forms";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ require?: string }> }) {
  const user = await requireUser("/account");
  const t = await getTranslations("account");
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("full_name, phone, locale").eq("id", user.id).single();
  const mustMfa = (await searchParams).require === "mfa";
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-semibold tracking-[-0.03em]">{t("title")}</h1><p className="mt-1 text-fg-muted" dir="ltr">{user.email}</p></div>
      {mustMfa && <p className="flex items-center gap-2 rounded-2xl border border-warning-500/30 bg-warning-50 p-4 text-sm font-medium text-warning-700"><ShieldAlert className="size-5" />{t("adminRequired")}</p>}
      <Card><CardHeader><div><CardTitle>{t("security")}</CardTitle><p className="mt-1 text-sm text-fg-muted">{t("securityDesc")}</p></div></CardHeader><CardContent><MfaManager redirectTo={mustMfa ? "/admin" : null} /></CardContent></Card>
      <Card><CardHeader><CardTitle>{t("profile")}</CardTitle></CardHeader><CardContent><ProfileForm profile={{ full_name: profile?.full_name ?? "", phone: profile?.phone ?? "", locale: profile?.locale ?? "fr" }} /></CardContent></Card>
      <Card><CardHeader><CardTitle>{t("password")}</CardTitle></CardHeader><CardContent><PasswordForm /></CardContent></Card>
    </div>
  );
}
