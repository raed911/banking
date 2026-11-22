"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = ["features", "pricing", "about", "contact"] as const;

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations("site.nav");
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-300", scrolled || open ? "bg-ink-950/80 backdrop-blur-xl" : "bg-transparent")}>
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Link href="/" aria-label="VAYRO"><Logo tone="light" size={30} /></Link>
        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((k) => <Link key={k} href={`/${k}`} className={cn("rounded-lg px-3 py-2 text-sm font-medium transition", pathname === `/${k}` ? "text-white" : "text-ink-300 hover:text-white")}>{t(k)}</Link>)}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <LocaleSwitcher tone="light" />
          {signedIn ? <Button asChild variant="accent" size="sm"><Link href="/dashboard">{t("dashboard")}</Link></Button> : (
            <><Button asChild variant="ghost" size="sm" className="text-ink-200 hover:bg-white/10 hover:text-white"><Link href="/login">{t("login")}</Link></Button><Button asChild variant="accent" size="sm"><Link href="/register">{t("start")}</Link></Button></>
          )}
        </div>
        <button className="grid size-10 place-items-center rounded-xl text-white md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>{open ? <X /> : <Menu />}</button>
      </div>
      {open && (
        <div className="container-page animate-fade-in space-y-1 pb-6 md:hidden">
          {LINKS.map((k) => <Link key={k} href={`/${k}`} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 text-lg font-medium text-white">{t(k)}</Link>)}
          <div className="flex items-center gap-2 pt-3"><LocaleSwitcher tone="light" />
            <Button asChild variant="glass" className="flex-1"><Link href={signedIn ? "/dashboard" : "/login"}>{signedIn ? t("dashboard") : t("login")}</Link></Button>
            {!signedIn && <Button asChild variant="accent" className="flex-1"><Link href="/register">{t("start")}</Link></Button>}
          </div>
        </div>
      )}
    </header>
  );
}
