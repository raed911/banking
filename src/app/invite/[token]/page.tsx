import Link from "next/link";
import { createHash } from "node:crypto";
import { getTranslations } from "next-intl/server";
import { Users } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { AcceptButton } from "./accept-button";

export const metadata = { title: "Invitation", robots: { index: false } };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations("team.accept");
  const valid = /^[A-Za-z0-9_-]{20,64}$/.test(token);
  const { data } = valid ? await createAdminClient().rpc("invitation_preview", { p_token_hash: createHash("sha256").update(token).digest("hex") }) : { data: null };
  const inv = data as { merchant: string; role: string; email: string; expired: boolean; used: boolean } | null;
  const user = await getUser();
  const next = encodeURIComponent(`/invite/${token}`);
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-md text-center">
        <Logo className="mb-10 justify-center" />
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-ink-900 text-lime-300"><Users className="size-7" /></div>
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">{t("title")}</h1>
        {!inv || inv.used ? <p className="mt-3 text-fg-muted">{t("invalid")}</p> : inv.expired ? <p className="mt-3 text-fg-muted">{t("expired")}</p> : (
          <>
            <p className="mt-3 text-fg-muted">{t("desc", { merchant: inv.merchant, role: inv.role })}</p>
            {user ? (
              user.email?.toLowerCase() === inv.email.toLowerCase() ? <AcceptButton token={token} label={t("cta")} /> : <p className="mt-6 rounded-xl bg-warning-50 p-3 text-sm text-warning-700">{t("email_mismatch", { email: inv.email })}</p>
            ) : (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-fg-muted">{t("loginFirst", { email: inv.email })}</p>
                <div className="flex justify-center gap-2"><Button asChild variant="secondary"><Link href={`/login?next=${next}`}>{t("login")}</Link></Button><Button asChild variant="accent"><Link href={`/register?next=${next}`}>{t("register")}</Link></Button></div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
