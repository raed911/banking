import { requireMerchant } from "@/lib/auth/session";
import { signOut } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

// Temporary landing until the dashboard shell is built (Phase 3).
export default async function DashboardPage() {
  const { membership } = await requireMerchant();
  return (
    <main className="container-page py-16">
      <h1 data-testid="dashboard-title" className="text-3xl font-semibold tracking-tight">{membership.merchant.name}</h1>
      <p className="mt-2 text-fg-muted">{membership.role.name}</p>
      <form action={signOut} className="mt-8"><Button variant="secondary">Sign out</Button></form>
    </main>
  );
}
