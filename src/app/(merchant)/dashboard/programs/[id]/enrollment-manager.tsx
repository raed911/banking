"use client";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import { Copy, Download, Link2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createLink, toggleLink } from "@/features/programs/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SubmitButton } from "@/components/forms/submit-button";
import { cn } from "@/lib/utils";

type Link = { id: string; name: string; code: string; is_active: boolean; uses: number; require_phone: boolean; require_email: boolean; collect_birthday: boolean };

function Qr({ url, className }: { url: string; className?: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => { QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#101828", light: "#FFFFFF" } }).then(setSvg); }, [url]);
  // svg is generated locally by the qrcode library from our own URL
  return <div className={cn("aspect-square [&_svg]:size-full", className)} dangerouslySetInnerHTML={{ __html: svg }} />;
}

function NewLinkForm({ programId, onDone }: { programId: string; onDone: () => void }) {
  const t = useTranslations("programs");
  const [state, action] = useActionState(createLink.bind(null, programId), null);
  useEffect(() => { if (state?.ok) onDone(); }, [state, onDone]);
  return (
    <form action={action} className="space-y-4">
      <Field label={t("enroll.linkName")} htmlFor="l-name"><Input id="l-name" name="name" required maxLength={60} placeholder={t("enroll.linkNamePlaceholder")} /></Field>
      {(["require_phone", "require_email", "collect_birthday"] as const).map((k) => (
        <label key={k} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm font-medium">
          {t(`enroll.${k === "require_phone" ? "requirePhone" : k === "require_email" ? "requireEmail" : "collectBirthday"}`)}
          <Switch name={k} defaultChecked={k === "require_phone"} />
        </label>
      ))}
      <div className="flex justify-end"><SubmitButton>{t("enroll.create")}</SubmitButton></div>
    </form>
  );
}

export function EnrollmentManager({ programId, appUrl, links, canEdit, merchantName }: { programId: string; appUrl: string; links: Link[]; canEdit: boolean; merchantName: string }) {
  const t = useTranslations("programs.enroll");
  const tStatus = useTranslations("programs.status");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const urlFor = (code: string) => `${appUrl}/join/${code}`;

  async function download(link: Link) {
    const data = await QRCode.toDataURL(urlFor(link.code), { width: 1200, margin: 2, color: { dark: "#101828", light: "#FFFFFF" } });
    const a = document.createElement("a");
    a.href = data;
    a.download = `vayro-${merchantName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${link.code}.png`;
    a.click();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-fg-muted">{t("desc")}</p>
        {canEdit && <Button variant="secondary" onClick={() => setOpen(true)}><Plus />{t("newLink")}</Button>}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {links.map((l) => (
          <Card key={l.id} className={cn("overflow-hidden", !l.is_active && "opacity-60")}>
            <div className="flex gap-5 p-5">
              <div className="w-32 shrink-0 rounded-2xl border border-border bg-white p-2 sm:w-36"><Qr url={urlFor(l.code)} /></div>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center gap-2"><Link2 className="size-4 text-fg-subtle" /><span className="truncate font-semibold">{l.name}</span></div>
                <div className="mt-1 truncate font-mono text-xs text-fg-muted" dir="ltr">{urlFor(l.code).replace(/^https?:\/\//, "")}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone={l.is_active ? "success" : "neutral"} dot>{l.is_active ? tStatus("active") : t("inactive")}</Badge>
                  <Badge>{t("uses", { count: l.uses })}</Badge>
                </div>
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(urlFor(l.code)).then(() => toast.success(t("copied")))}><Copy />{t("copy")}</Button>
                  <Button size="sm" variant="secondary" onClick={() => download(l)}><Download />PNG</Button>
                  {canEdit && <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(() => toggleLink(programId, l.id, !l.is_active))}>{l.is_active ? t("disable") : t("enable")}</Button>}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={t("newLink")}><NewLinkForm programId={programId} onDone={() => setOpen(false)} /></DialogContent>
      </Dialog>
    </div>
  );
}
