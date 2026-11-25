import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env.server";
import { effectiveCredentials } from "@/lib/integrations";
import { currentCampaign } from "./relevance";
import { signingMaterial } from "./apple-cert";
import { appleWwdrPem } from "./apple-wwdr";
import { pushPassUpdates } from "./apns";
import { buildPassJson, packagePass, stampStripSvg, type ApplePassContext } from "./apple-pass";
import { DEFAULT_ICON_PNG_BASE64 } from "./default-icon";
import { renderMessage } from "@/lib/campaign-message";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "https://vayro-app.vercel.app";

export type AppleCreds = { passTypeIdentifier: string; teamId: string; certPem: string; keyPem: string };

export async function appleCredsFor(merchantId: string): Promise<AppleCreds | null> {
  const c = await effectiveCredentials("apple_wallet", merchantId);
  if (!c || c.status !== "verified") return null;
  const m = signingMaterial({ certificate: c.secrets.certificate!, privateKey: c.secrets.privateKey, password: c.secrets.password });
  return { passTypeIdentifier: c.config.passTypeIdentifier!, teamId: c.config.teamId!, ...m };
}

/** Per-pass web-service token, derived (never stored in clear): HMAC(server secret, serial). */
export function appleAuthToken(serial: string, secret = serverEnv().QR_SIGNING_SECRET) {
  return createHmac("sha256", secret).update(`apple-ws:${serial}`).digest("base64url");
}
export function checkAppleAuth(header: string | null, serial: string) {
  const given = /^ApplePass (.+)$/.exec(header ?? "")?.[1];
  if (!given) return false;
  const a = Buffer.from(given), b = Buffer.from(appleAuthToken(serial));
  return a.length === b.length && timingSafeEqual(a, b);
}
const tokenHash = (t: string) => createHash("sha256").update(t).digest("hex");

async function download(path: string | null | undefined) {
  if (!path) return null;
  const { data } = await createAdminClient().storage.from("brand-assets").download(path);
  return data ? Buffer.from(await data.arrayBuffer()) : null;
}

/** Latest Wallet campaign message for this customer (last 7 days), shown on the back of the pass. */
async function latestNews(customerId: string, programId: string, merchantName: string, firstName: string) {
  const { data } = await createAdminClient().from("campaign_deliveries")
    .select("sent_at, campaign:campaigns!inner(channel, program_id, content)")
    .eq("customer_id", customerId).eq("status", "sent").eq("campaign.channel", "wallet")
    .gte("sent_at", new Date(Date.now() - 7 * 86400000).toISOString())
    .order("sent_at", { ascending: false }).limit(5);
  const hit = (data ?? []).find((d) => !d.campaign.program_id || d.campaign.program_id === programId);
  const body = (hit?.campaign.content as { body?: string } | undefined)?.body;
  return body ? renderMessage(body, { prenom: firstName, commerce: merchantName }) : null;
}

/** Builds the signed .pkpass for a card, from the current database state. */
export async function buildApplePass(cardId: string, creds: AppleCreds) {
  const db = createAdminClient();
  const { data: card } = await db.from("loyalty_cards").select("id, merchant_id, program_id, customer_id, serial, balance, public_token, status, updated_at, customer:customers(first_name)").eq("id", cardId).single();
  if (!card) throw new Error("card_not_found");
  const [{ data: m }, { data: p }, { data: d }, { data: locs }, { data: camps }] = await Promise.all([
    db.from("merchants").select("id, name, locale, logo_path").eq("id", card.merchant_id).single(),
    db.from("loyalty_programs").select("id, name, type, stamps_required, reward_title, terms").eq("id", card.program_id).single(),
    db.from("card_designs").select("background_color, foreground_color, label_color, accent_color, stamp_icon, logo_text, logo_path, strip_path").eq("program_id", card.program_id).maybeSingle(),
    db.from("locations").select("id, name, latitude, longitude, geo_enabled, geo_radius_m, geo_message, is_active").eq("merchant_id", card.merchant_id),
    db.from("location_campaigns").select("id, message, location_ids, program_ids, starts_at, ends_at, status").eq("merchant_id", card.merchant_id).eq("status", "active"),
  ]);
  const firstName = card.customer?.first_name ?? "";
  const ctx: ApplePassContext = {
    appUrl: appUrl(), passTypeIdentifier: creds.passTypeIdentifier, teamIdentifier: creds.teamId,
    merchant: { id: m!.id, name: m!.name, locale: m!.locale }, program: p!,
    design: d ? { background_color: d.background_color, foreground_color: d.foreground_color, label_color: d.label_color, logo_text: d.logo_text } : null,
    locations: locs ?? [], campaign: currentCampaign(camps ?? [], card.program_id),
  };
  const passJson = buildPassJson(ctx, {
    serial: card.serial, balance: card.balance, public_token: card.public_token, status: card.status, customerName: firstName,
    authenticationToken: appleAuthToken(card.serial), news: await latestNews(card.customer_id, card.program_id, m!.name, firstName),
  });

  const bg = d?.background_color ?? "#101828";
  const files: Record<string, Buffer> = { "pass.json": Buffer.from(JSON.stringify(passJson)) };
  const logo = await download(d?.logo_path ?? m!.logo_path);
  const iconSrc = logo ?? Buffer.from(DEFAULT_ICON_PNG_BASE64, "base64");
  for (const [suffix, size] of [["", 29], ["@2x", 58], ["@3x", 87]] as const) {
    files[`icon${suffix}.png`] = await sharp(iconSrc).resize(size, size, { fit: "contain", background: bg }).flatten({ background: bg }).png().toBuffer();
  }
  if (logo) {
    for (const [suffix, w, h] of [["", 160, 50], ["@2x", 320, 100], ["@3x", 480, 150]] as const) {
      files[`logo${suffix}.png`] = await sharp(logo).resize(w, h, { fit: "inside" }).png().toBuffer();
    }
  }
  const stripImage = await download(d?.strip_path);
  let strip: Buffer | null = null;
  if (p!.type !== "points" && p!.stamps_required) {
    const bgData = stripImage ? `data:image/png;base64,${(await sharp(stripImage).resize(1125, 369, { fit: "cover" }).png().toBuffer()).toString("base64")}` : undefined;
    strip = await sharp(Buffer.from(stampStripSvg({ required: p!.stamps_required, balance: card.balance, background: bg, filled: d?.accent_color ?? d?.label_color ?? "#C6F36B", empty: d?.foreground_color ?? "#FFFFFF", icon: d?.stamp_icon ?? "coffee", backgroundImage: bgData }))).png().toBuffer();
  } else if (stripImage) {
    strip = await sharp(stripImage).resize(1125, 369, { fit: "cover" }).png().toBuffer();
  }
  if (strip) {
    files["strip@3x.png"] = strip;
    files["strip@2x.png"] = await sharp(strip).resize(750, 246).png().toBuffer();
    files["strip.png"] = await sharp(strip).resize(375, 123).png().toBuffer();
  }
  const pkpass = packagePass(files, { certPem: creds.certPem, keyPem: creds.keyPem }, await appleWwdrPem());
  return { pkpass, card };
}

/** Records (or refreshes) the Apple pass row for a card. */
export async function ensureApplePass(card: { id: string; merchant_id: string; serial: string }, creds: AppleCreds) {
  const db = createAdminClient();
  const { data: existing } = await db.from("wallet_passes").select("id, last_updated_at").eq("card_id", card.id).eq("platform", "apple").maybeSingle();
  if (existing) {
    await db.from("wallet_passes").update({ pass_type_identifier: creds.passTypeIdentifier, removed_at: null }).eq("id", existing.id);
    return existing;
  }
  const { data } = await db.from("wallet_passes").insert({ merchant_id: card.merchant_id, card_id: card.id, platform: "apple", serial_number: card.serial, pass_type_identifier: creds.passTypeIdentifier, auth_token_hash: tokenHash(appleAuthToken(card.serial)) }).select("id, last_updated_at").single();
  return data!;
}

/** Marks passes as changed and pushes every registered device; prunes tokens Apple reports as gone. */
export async function notifyApplePasses(passIds: string[], creds?: AppleCreds | null) {
  if (!passIds.length) return { pushed: 0 };
  const db = createAdminClient();
  const { data: passes } = await db.from("wallet_passes").select("id, merchant_id, version").in("id", passIds);
  const now = new Date().toISOString();
  for (const p of passes ?? []) await db.from("wallet_passes").update({ version: p.version + 1, last_updated_at: now }).eq("id", p.id);
  const { data: regs } = await db.from("apple_device_registrations").select("id, push_token, pass_id").in("pass_id", passIds);
  if (!regs?.length) return { pushed: 0 };
  creds ??= await appleCredsFor(passes![0]!.merchant_id);
  if (!creds) return { pushed: 0 };
  const tokens = [...new Set(regs.map((r) => r.push_token))];
  const results = await pushPassUpdates(tokens, { certPem: creds.certPem, keyPem: creds.keyPem, topic: creds.passTypeIdentifier });
  const gone = results.filter((r) => r.status === 410 || r.reason === "BadDeviceToken" || r.reason === "Unregistered").map((r) => r.token);
  if (gone.length) await db.from("apple_device_registrations").delete().in("push_token", gone);
  const failed = results.filter((r) => r.status !== 200 && !gone.includes(r.token));
  if (failed.length) await db.from("system_logs").insert({ level: "warn", source: "wallet.apple.apns", message: `${failed.length} push(es) failed`, context: { sample: failed.slice(0, 3).map((f) => ({ status: f.status, reason: f.reason })) } });
  await db.from("wallet_passes").update({ last_pushed_at: now }).in("id", passIds);
  return { pushed: results.filter((r) => r.status === 200).length };
}

export async function refreshAppleCardIfIssued(cardId: string) {
  const { data } = await createAdminClient().from("wallet_passes").select("id").eq("card_id", cardId).eq("platform", "apple").is("removed_at", null).maybeSingle();
  if (data) await notifyApplePasses([data.id]);
}

export async function refreshAppleMerchant(merchantId: string) {
  const creds = await appleCredsFor(merchantId);
  if (!creds) return { skipped: "apple_not_configured" };
  const { data } = await createAdminClient().from("wallet_passes").select("id").eq("merchant_id", merchantId).eq("platform", "apple").is("removed_at", null).limit(5000);
  return notifyApplePasses((data ?? []).map((p) => p.id), creds);
}
