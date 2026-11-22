import "server-only";
import { createSign } from "node:crypto";

/**
 * Google Wallet REST client (Loyalty). Auth: service-account JWT (RS256) exchanged for an OAuth token
 * with the wallet_object.issuer scope. "Add to Google Wallet" links are JWTs signed with the same key.
 * Docs: https://developers.google.com/wallet/retail/loyalty-cards
 */
export type GoogleCreds = { issuerId: string; serviceAccountEmail: string; privateKey: string };
const API = "https://walletobjects.googleapis.com/walletobjects/v1";
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");

export function signJwtRS256(payload: Record<string, unknown>, privateKey: string) {
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64(payload)}`;
  const sig = createSign("RSA-SHA256").update(unsigned).sign(privateKey).toString("base64url");
  return `${unsigned}.${sig}`;
}

export function normalizePrivateKey(key: string) {
  const k = key.replace(/\\n/g, "\n").trim();
  if (!/-----BEGIN (RSA )?PRIVATE KEY-----/.test(k)) throw new Error("invalid_private_key");
  return k;
}

const tokenCache = new Map<string, { token: string; exp: number }>();

export async function getAccessToken(creds: GoogleCreds) {
  const cached = tokenCache.get(creds.serviceAccountEmail);
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwtRS256({ iss: creds.serviceAccountEmail, scope: "https://www.googleapis.com/auth/wallet_object.issuer", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }, normalizePrivateKey(creds.privateKey));
  const res = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }) });
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!res.ok || !json.access_token) throw new Error(`google_auth_failed: ${json.error_description ?? json.error ?? res.status}`);
  tokenCache.set(creds.serviceAccountEmail, { token: json.access_token, exp: Date.now() + (json.expires_in ?? 3600) * 1000 });
  return json.access_token;
}

async function call<T>(creds: GoogleCreds, method: string, path: string, body?: unknown): Promise<{ status: number; data: T }> {
  const res = await fetch(`${API}${path}`, { method, headers: { Authorization: `Bearer ${await getAccessToken(creds)}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, data: (text ? JSON.parse(text) : {}) as T };
}

/** Real connectivity check: token exchange + read the issuer this service account must have access to. */
export async function verifyGoogleCredentials(creds: GoogleCreds): Promise<{ ok: true; issuerName?: string } | { ok: false; error: string }> {
  try {
    const r = await call<{ name?: string; error?: { message?: string } }>(creds, "GET", `/issuer/${encodeURIComponent(creds.issuerId)}`);
    if (r.status === 200) return { ok: true, issuerName: r.data.name };
    if (r.status === 403) return { ok: false, error: "service_account_not_authorized" };
    if (r.status === 404) return { ok: false, error: "issuer_not_found" };
    return { ok: false, error: r.data.error?.message ?? `http_${r.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.split(":")[0]! : "unknown" };
  }
}

export const googleIds = (issuerId: string, merchantSlug: string, programId: string, cardSerial?: string) => ({
  classId: `${issuerId}.vayro_${merchantSlug.replace(/[^a-z0-9_]/g, "_")}_${programId.replace(/-/g, "")}`,
  objectId: cardSerial ? `${issuerId}.vayro_card_${cardSerial}` : undefined,
});

/** Insert-or-update (PUT after 404 → POST). */
export async function upsert(creds: GoogleCreds, kind: "loyaltyClass" | "loyaltyObject", id: string, resource: Record<string, unknown>) {
  const existing = await call(creds, "GET", `/${kind}/${encodeURIComponent(id)}`);
  const r = existing.status === 200
    ? await call(creds, "PUT", `/${kind}/${encodeURIComponent(id)}`, { ...resource, id })
    : await call(creds, "POST", `/${kind}`, { ...resource, id });
  if (r.status >= 300) throw new Error(`google_${kind}_${r.status}: ${JSON.stringify(r.data).slice(0, 300)}`);
  return r.data;
}

export function saveToWalletUrl(creds: GoogleCreds, objectId: string, origins: string[]) {
  const jwt = signJwtRS256({ iss: creds.serviceAccountEmail, aud: "google", typ: "savetowallet", origins, iat: Math.floor(Date.now() / 1000), payload: { loyaltyObjects: [{ id: objectId }] } }, normalizePrivateKey(creds.privateKey));
  return `https://pay.google.com/gp/v/save/${jwt}`;
}

/** Adds a message to a loyalty object; TEXT_AND_NOTIFY also pushes a notification (Google rate-limits these per pass). */
export async function addObjectMessage(creds: GoogleCreds, objectId: string, message: { id: string; header: string; body: string; notify: boolean; start: Date; end: Date }) {
  const r = await call<{ error?: { message?: string } }>(creds, "POST", `/loyaltyObject/${encodeURIComponent(objectId)}/addMessage`, {
    message: {
      id: message.id, header: message.header.slice(0, 60), body: message.body.slice(0, 500),
      messageType: message.notify ? "TEXT_AND_NOTIFY" : "TEXT",
      displayInterval: { start: { date: message.start.toISOString() }, end: { date: message.end.toISOString() } },
    },
  });
  if (r.status >= 300) throw new Error(`google_message_${r.status}: ${r.data.error?.message ?? ""}`.slice(0, 300));
}
