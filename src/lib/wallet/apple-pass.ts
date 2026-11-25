import { createHash } from "node:crypto";
import forge from "node-forge";
import { appleRelevance, type ActiveLocationCampaign, type GeoLocation } from "./relevance";
import { zipStore } from "./zip";
import { STAMP_ICON_SVG } from "./stamp-icons";

/**
 * Apple Wallet (PassKit) — pure builders, no network:
 *   buildPassJson  → pass.json for a store card (stamps / points / visits)
 *   stampStripSvg  → the stamp grid shown on the card's strip
 *   packagePass    → manifest.json (SHA-1 per file) + detached PKCS#7 signature (SHA-256, signer cert + Apple WWDR) → .pkpass zip
 */
export type ApplePassContext = {
  appUrl: string;
  passTypeIdentifier: string;
  teamIdentifier: string;
  merchant: { id: string; name: string; locale: string; maps_url?: string | null; review_url?: string | null };
  program: { id: string; name: string; type: "stamps" | "points" | "visits"; stamps_required: number | null; reward_title: string | null; terms: string | null };
  design: { background_color: string; foreground_color: string; label_color: string; logo_text: string | null } | null;
  locations: GeoLocation[];
  campaign: ActiveLocationCampaign | null;
};
export type ApplePassCard = { serial: string; balance: number; public_token: string; status: string; customerName: string; authenticationToken: string; news: string | null; referralUrl?: string | null };

type L = "fr" | "ar" | "en";
const lang = (l: string): L => (l === "ar" || l === "en" ? l : "fr");
const TXT = {
  stamps: { fr: "Tampons", ar: "أختام", en: "Stamps" },
  points: { fr: "Points", ar: "نقاط", en: "Points" },
  visits: { fr: "Passages", ar: "زيارات", en: "Visits" },
  member: { fr: "Membre", ar: "العضو", en: "Member" },
  reward: { fr: "Récompense", ar: "المكافأة", en: "Reward" },
  news: { fr: "Actualité", ar: "جديد", en: "News" },
  welcome: { fr: "Bienvenue chez {m} !", ar: "أهلاً بك في {m}!", en: "Welcome to {m}!" },
  myCard: { fr: "Ma carte en ligne", ar: "بطاقتي على الإنترنت", en: "My card online" },
  open: { fr: "Ouvrir", ar: "فتح", en: "Open" },
  terms: { fr: "Conditions", ar: "الشروط", en: "Terms" },
  balanceChange: { fr: "Votre carte : %@", ar: "بطاقتك: %@", en: "Your card: %@" },
  number: { fr: "N° de carte", ar: "رقم البطاقة", en: "Card number" },
  invite: { fr: "Invitez un ami", ar: "ادعُ صديقًا", en: "Invite a friend" },
  inviteLink: { fr: "Partager mon lien", ar: "مشاركة رابطي", en: "Share my link" },
  review: { fr: "Votre avis compte", ar: "رأيك يهمنا", en: "Leave a review" },
  reviewLink: { fr: "Laisser un avis ⭐", ar: "اترك تقييمًا ⭐", en: "Write a review ⭐" },
  maps: { fr: "Nous trouver", ar: "موقعنا", en: "Find us" },
  mapsLink: { fr: "Itinéraire", ar: "الاتجاهات", en: "Directions" },
} as const;

export function hexToRgb(hex: string | null | undefined, fallback = "rgb(16,24,40)") {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");
  if (!m) return fallback;
  const n = parseInt(m[1]!, 16);
  return `rgb(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255})`;
}

export function progressText(type: ApplePassContext["program"]["type"], balance: number, required: number | null) {
  return type !== "points" && required ? `${Math.min(balance, required)} / ${required}` : String(balance);
}

export function buildPassJson(ctx: ApplePassContext, card: ApplePassCard) {
  const l = lang(ctx.merchant.locale);
  const p = ctx.program;
  const name = (ctx.design?.logo_text || ctx.merchant.name).slice(0, 40);
  const cardUrl = `${ctx.appUrl}/c/${card.public_token}`;
  const rel = appleRelevance(ctx.locations, { merchantName: ctx.merchant.name, campaign: ctx.campaign });
  const news = (card.news || ctx.campaign?.message || TXT.welcome[l].replace("{m}", ctx.merchant.name)).slice(0, 500);
  const secondary = [
    ...(card.customerName ? [{ key: "member", label: TXT.member[l], value: card.customerName.slice(0, 40) }] : []),
    ...(p.reward_title ? [{ key: "reward", label: TXT.reward[l], value: p.reward_title.slice(0, 40), textAlignment: "PKTextAlignmentRight" }] : []),
  ];
  return {
    formatVersion: 1,
    passTypeIdentifier: ctx.passTypeIdentifier,
    teamIdentifier: ctx.teamIdentifier,
    serialNumber: card.serial,
    organizationName: ctx.merchant.name.slice(0, 64),
    description: `${ctx.merchant.name} · ${p.name}`.slice(0, 120),
    logoText: name,
    backgroundColor: hexToRgb(ctx.design?.background_color, "rgb(16,24,40)"),
    foregroundColor: hexToRgb(ctx.design?.foreground_color, "rgb(255,255,255)"),
    labelColor: hexToRgb(ctx.design?.label_color, "rgb(198,243,107)"),
    sharingProhibited: true,
    webServiceURL: `${ctx.appUrl}/api/wallet/apple/ws`,
    authenticationToken: card.authenticationToken,
    barcodes: [{ format: "PKBarcodeFormatQR", message: `VYS.${card.serial}`, messageEncoding: "iso-8859-1", altText: card.serial }],
    ...(card.status !== "active" ? { voided: true } : {}),
    storeCard: {
      headerFields: [{ key: "balance", label: TXT[p.type][l], value: progressText(p.type, card.balance, p.stamps_required), changeMessage: TXT.balanceChange[l] }],
      // Stamp programs show the grid on the strip image; points show the big number.
      primaryFields: p.type === "points" ? [{ key: "points", label: TXT.points[l], value: card.balance }] : [],
      secondaryFields: secondary,
      backFields: [
        { key: "news", label: TXT.news[l], value: news, changeMessage: "%@" },
        { key: "card", label: TXT.myCard[l], value: cardUrl, attributedValue: `<a href="${cardUrl}">${TXT.open[l]}</a>` },
        ...(ctx.merchant.review_url ? [{ key: "review", label: TXT.review[l], value: ctx.merchant.review_url, attributedValue: `<a href="${ctx.merchant.review_url}">${TXT.reviewLink[l]}</a>` }] : []),
        ...(ctx.merchant.maps_url ? [{ key: "maps", label: TXT.maps[l], value: ctx.merchant.maps_url, attributedValue: `<a href="${ctx.merchant.maps_url}">${TXT.mapsLink[l]}</a>` }] : []),
        ...(card.referralUrl ? [{ key: "invite", label: TXT.invite[l], value: card.referralUrl, attributedValue: `<a href="${card.referralUrl}">${TXT.inviteLink[l]}</a>` }] : []),
        { key: "serial", label: TXT.number[l], value: card.serial },
        ...(p.terms ? [{ key: "terms", label: TXT.terms[l], value: p.terms.slice(0, 1000) }] : []),
      ],
    },
    ...rel,
  };
}

/**
 * Stamp grid for the strip (1125×369 = @3x of 375×123), matching the web card:
 * earned stamps are solid discs (accent colour) showing the program's icon; the rest are outlined discs with a faint icon.
 * With a background photo, every disc gets an opaque backing so stamps stay readable on any image.
 */
export function stampStripSvg(opts: { required: number; balance: number; background: string; filled: string; empty: string; icon?: string | null; backgroundImage?: string }) {
  const W = 1125, H = 369;
  const n = Math.max(1, Math.min(opts.required, 20));
  const rows = n <= 6 ? 1 : 2;
  const perRow = Math.ceil(n / rows);
  const gap = 28;
  const d = Math.min((W - 120 - gap * (perRow - 1)) / perRow, (H - 70 - gap * (rows - 1)) / rows, 170);
  const totalH = rows * d + (rows - 1) * gap;
  const photo = !!opts.backgroundImage;
  const iconInner = STAMP_ICON_SVG[opts.icon ?? ""] ?? null;
  const glyph = (cx: number, cy: number, r: number, color: string, opacity: number) => {
    const size = r * 0.95;
    if (!iconInner) {
      const s = r * 0.42;
      return `<path d="M ${cx - s} ${cy} L ${cx - s * 0.25} ${cy + s * 0.75} L ${cx + s} ${cy - s * 0.65}" fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="${Math.max(6, r * 0.16)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    return `<svg x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${iconInner}</svg>`;
  };
  let circles = "";
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow), col = i % perRow;
    const inRow = row === rows - 1 ? n - perRow * (rows - 1) : perRow;
    const rowW = inRow * d + (inRow - 1) * gap;
    const cx = (W - rowW) / 2 + col * (d + gap) + d / 2;
    const cy = (H - totalH) / 2 + row * (d + gap) + d / 2;
    const r = d / 2;
    if (i < opts.balance) {
      circles += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${opts.filled}"${photo ? ` stroke="${opts.background}" stroke-width="6"` : ""}/>` + glyph(cx, cy, r, opts.background, 1);
    } else {
      circles += (photo ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${opts.background}" fill-opacity="0.72"/>` : "")
        + `<circle cx="${cx}" cy="${cy}" r="${r - 4}" fill="none" stroke="${opts.empty}" stroke-opacity="${photo ? 0.9 : 0.45}" stroke-width="6"/>`
        + (iconInner ? glyph(cx, cy, r, opts.empty, photo ? 0.6 : 0.35) : "");
    }
  }
  const bg = photo
    ? `<image href="${opts.backgroundImage}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/><rect width="${W}" height="${H}" fill="${opts.background}" fill-opacity="0.25"/>`
    : `<rect width="${W}" height="${H}" fill="${opts.background}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bg}${circles}</svg>`;
}

export const sha1Hex = (b: Buffer) => createHash("sha1").update(b).digest("hex");

export function manifestFor(files: Record<string, Buffer>) {
  return Object.fromEntries(Object.entries(files).map(([name, data]) => [name, sha1Hex(data)]));
}

/** Detached PKCS#7 signature of manifest.json, signed by the Pass Type ID cert and chained to Apple WWDR. */
export function signManifest(manifest: Buffer, material: { certPem: string; keyPem: string }, wwdrPem: string, signingTime = new Date()) {
  const cert = forge.pki.certificateFromPem(material.certPem);
  const key = forge.pki.privateKeyFromPem(material.keyPem);
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifest.toString("binary"));
  p7.addCertificate(cert);
  p7.addCertificate(forge.pki.certificateFromPem(wwdrPem));
  p7.addSigner({
    key: key as forge.pki.rsa.PrivateKey,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256!,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType!, value: forge.pki.oids.data! },
      { type: forge.pki.oids.messageDigest! },
      { type: forge.pki.oids.signingTime!, value: signingTime as unknown as string },
    ],
  });
  p7.sign({ detached: true });
  return Buffer.from(forge.asn1.toDer(p7.toAsn1()).getBytes(), "binary");
}

export function packagePass(files: Record<string, Buffer>, material: { certPem: string; keyPem: string }, wwdrPem: string) {
  const manifest = Buffer.from(JSON.stringify(manifestFor(files)));
  const signature = signManifest(manifest, material, wwdrPem);
  return zipStore([...Object.entries(files).map(([name, data]) => ({ name, data })), { name: "manifest.json", data: manifest }, { name: "signature", data: signature }]);
}
