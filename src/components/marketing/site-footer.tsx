import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";

export async function SiteFooter() {
  const t = await getTranslations("site");
  const cols = [
    { title: t("footer.product"), links: [["/features", t("nav.features")], ["/pricing", t("nav.pricing")], ["/register", t("nav.start")]] },
    { title: t("footer.company"), links: [["/about", t("nav.about")], ["/contact", t("nav.contact")], ["/login", t("nav.login")]] },
    { title: t("footer.legal"), links: [["/legal/terms", t("footer.terms")], ["/legal/privacy", t("footer.privacy")]] },
  ];
  return (
    <footer className="border-t border-white/5 bg-ink-950 text-ink-300">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div><Logo tone="light" /><p className="mt-4 max-w-xs text-sm">{t("footer.tagline")}</p></div>
        {cols.map((c) => (
          <div key={c.title}><div className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">{c.title}</div>
            <ul className="mt-4 space-y-2.5 text-sm">{c.links.map(([href, label]) => <li key={href}><Link href={href!} className="transition hover:text-white">{label}</Link></li>)}</ul>
          </div>
        ))}
      </div>
      <div className="container-page border-t border-white/5 py-6 text-xs text-ink-500">© {new Date().getFullYear()} VAYRO. {t("footer.rights")}</div>
    </footer>
  );
}
