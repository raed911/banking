import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { cookies } from "next/headers";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  // Only decides which header button to show: a cookie check avoids an Auth round-trip on every public page.
  const signedIn = (await cookies()).getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
  return (
    <div className="bg-white">
      <SiteHeader signedIn={signedIn} />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
