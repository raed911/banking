import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { effectiveCredentials } from "@/lib/integrations";
import { currentCampaign } from "./relevance";
import { googleIds, upsert, type GoogleCreds } from "./google";
import { buildLoyaltyClass, buildLoyaltyObject, type PassContext } from "./google-pass";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "https://vayro-app.vercel.app";

export async function googleCredsFor(merchantId: string): Promise<GoogleCreds | null> {
  const c = await effectiveCredentials("google_wallet", merchantId);
  if (!c || c.status !== "verified") return null;
  return { issuerId: c.config.issuerId!, serviceAccountEmail: c.config.serviceAccountEmail!, privateKey: c.secrets.privateKey! };
}

async function context(merchantId: string, programId: string): Promise<PassContext & { slug: string }> {
  const db = createAdminClient();
  const [{ data: m }, { data: p }, { data: d }, { data: locs }, { data: camps }] = await Promise.all([
    db.from("merchants").select("id, name, locale, slug").eq("id", merchantId).single(),
    db.from("loyalty_programs").select("id, name, type, stamps_required, reward_title, terms").eq("id", programId).single(),
    db.from("card_designs").select("background_color, strip_path, logo_text").eq("program_id", programId).maybeSingle(),
    db.from("locations").select("id, name, latitude, longitude, geo_enabled, geo_radius_m, geo_message, is_active").eq("merchant_id", merchantId),
    db.from("location_campaigns").select("id, message, location_ids, program_ids, starts_at, ends_at, status").eq("merchant_id", merchantId).eq("status", "active"),
  ]);
  return { appUrl: appUrl(), merchant: { id: m!.id, name: m!.name, locale: m!.locale }, slug: m!.slug, program: p!, design: d, locations: locs ?? [], campaign: currentCampaign(camps ?? [], programId) };
}

/** Creates/updates the class and the card's object, records the pass. Returns the object id. */
export async function syncGoogleCard(cardId: string, creds?: GoogleCreds | null) {
  const db = createAdminClient();
  const { data: card } = await db.from("loyalty_cards").select("id, merchant_id, program_id, serial, balance, public_token, status, customer:customers(first_name)").eq("id", cardId).single();
  if (!card) throw new Error("card_not_found");
  creds ??= await googleCredsFor(card.merchant_id);
  if (!creds) throw new Error("google_not_configured");
  const ctx = await context(card.merchant_id, card.program_id);
  const { classId, objectId } = googleIds(creds.issuerId, ctx.slug, card.program_id, card.serial);
  await upsert(creds, "loyaltyClass", classId, buildLoyaltyClass(classId, ctx));
  await upsert(creds, "loyaltyObject", objectId!, buildLoyaltyObject(objectId!, classId, ctx, { serial: card.serial, balance: card.balance, public_token: card.public_token, status: card.status, customerName: card.customer?.first_name ?? "" }));
  const { data: existing } = await db.from("wallet_passes").select("id, version").eq("card_id", card.id).eq("platform", "google").maybeSingle();
  if (existing) await db.from("wallet_passes").update({ version: existing.version + 1, last_updated_at: new Date().toISOString(), removed_at: null }).eq("id", existing.id);
  else await db.from("wallet_passes").insert({ merchant_id: card.merchant_id, card_id: card.id, platform: "google", serial_number: objectId!, google_object_id: objectId!, google_class_id: classId });
  return { objectId: objectId!, creds };
}

/** Pushes current state to every Google pass of a card (no-op if the card has none). */
export async function refreshGoogleCardIfIssued(cardId: string) {
  const db = createAdminClient();
  const { data } = await db.from("wallet_passes").select("id").eq("card_id", cardId).eq("platform", "google").is("removed_at", null).maybeSingle();
  if (data) await syncGoogleCard(cardId);
}

/** Re-publishes classes and objects for a merchant (geofence/campaign/design changes). */
export async function refreshGoogleMerchant(merchantId: string) {
  const creds = await googleCredsFor(merchantId);
  if (!creds) return { skipped: "google_not_configured" };
  const db = createAdminClient();
  const { data: passes } = await db.from("wallet_passes").select("card_id").eq("merchant_id", merchantId).eq("platform", "google").is("removed_at", null).limit(2000);
  let updated = 0;
  for (const p of passes ?? []) { await syncGoogleCard(p.card_id, creds); updated++; }
  return { updated };
}
