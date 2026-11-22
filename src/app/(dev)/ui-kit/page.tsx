import { notFound } from "next/navigation";
import { CreditCard, Gift, Plus, Search, Sparkles, Users } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState, ErrorState } from "@/components/ui/states";

export const metadata = { title: "UI kit", robots: { index: false } };

/** Internal visual reference of the VAYRO design system. Not available in production. */
export default function UiKitPage() {
  if (process.env.NODE_ENV === "production" && process.env.VAYRO_UI_KIT !== "1") notFound();
  return (
    <main className="container-page space-y-12 py-10">
      <div className="flex items-center justify-between"><Logo /><Badge tone="lime" dot>Design system</Badge></div>
      <PageHeader eyebrow="VAYRO" title="Design system" description="Tokens, components and states used across the platform." actions={<><Button variant="secondary">Secondary</Button><Button><Plus />Primary</Button></>} />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Midnight Navy", "#101828", "bg-navy text-white"], ["Electric Lime", "#C6F36B", "bg-lime text-ink-900"], ["Pure White", "#FFFFFF", "bg-white text-ink-900 border"], ["Ink 500", "#667085", "bg-ink-500 text-white"]].map(([n, h, c]) => (
          <div key={n} className={`rounded-2xl p-4 ${c}`}><div className="text-sm font-semibold">{n}</div><div className="font-mono text-xs opacity-70">{h}</div><div className="h-10" /></div>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard highlight label="Cartes actives" value="12 480" delta={12.4} deltaLabel="vs mois dernier" icon={<CreditCard />} />
        <StatCard label="Clients" value="8 912" delta={4.1} deltaLabel="vs mois dernier" icon={<Users />} />
        <StatCard label="Récompenses" value="1 204" delta={-2.3} deltaLabel="vs mois dernier" icon={<Gift />} />
        <StatCard label="Taux de retour" value="64%" delta={8} deltaLabel="vs mois dernier" icon={<Sparkles />} />
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <Button variant="accent" size="lg">Créer mon espace</Button>
        <Button>Primary</Button><Button variant="secondary">Secondary</Button><Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button><Button loading>Loading</Button>
        <Badge>Neutral</Badge><Badge tone="success" dot>Actif</Badge><Badge tone="warning" dot>Essai</Badge><Badge tone="danger" dot>Suspendu</Badge><Badge tone="ink">Pro</Badge>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><div><CardTitle>Formulaire</CardTitle><CardDescription>Champs, aides et erreurs.</CardDescription></div></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Nom du commerce" htmlFor="n" hint="Visible sur la carte de vos clients."><Input id="n" placeholder="Café Lumière" /></Field>
            <Field label="Email" htmlFor="e" error="Adresse email invalide"><Input id="e" aria-invalid defaultValue="cafe@" /></Field>
            <Field label="Recherche" htmlFor="s"><Input id="s" leading={<Search />} placeholder="Rechercher un client…" /></Field>
          </CardContent>
          <CardFooter><Button variant="ghost">Annuler</Button><Button>Enregistrer</Button></CardFooter>
        </Card>
        <Card><CardContent className="space-y-3"><Skeleton className="h-6 w-1/3" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-32 w-full rounded-xl" /><Skeleton className="h-4 w-1/2" /></CardContent></Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <EmptyState icon={<Users />} title="Aucun client pour l'instant" description="Partagez votre lien d'inscription ou votre QR code pour accueillir vos premiers clients." action={<Button><Plus />Ajouter un client</Button>} />
        <ErrorState title="Impossible de charger les données" description="Vérifiez votre connexion puis réessayez." action={<Button variant="secondary">Réessayer</Button>} />
      </section>

      <section className="relative overflow-hidden rounded-3xl bg-ink-900 p-10 text-white">
        <div className="bg-grid absolute inset-0" />
        <div className="relative">
          <p className="font-script text-5xl text-lime-300">Nos tarifs</p>
          <p className="font-display mt-4 text-8xl leading-none">99 <span className="align-middle text-3xl">TND / mois</span></p>
        </div>
      </section>
    </main>
  );
}
