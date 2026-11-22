import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getUser } from "@/lib/auth/session";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <div className="bg-white">
      <SiteHeader signedIn={!!user} />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
