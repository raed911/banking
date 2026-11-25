import "server-only";
import { googleRelevance, type ActiveLocationCampaign, type GeoLocation } from "./relevance";

/** Pure builders for Google Wallet LoyaltyClass / LoyaltyObject resources (no network). */
export type PassContext = {
  appUrl: string;
  merchant: { id: string; name: string; locale: string };
  program: { id: string; name: string; type: "stamps" | "points" | "visits"; stamps_required: number | null; reward_title: string | null; terms: string | null; referral_enabled?: boolean };
  design: { background_color: string; strip_path: string | null; logo_text: string | null } | null;
  locations: GeoLocation[];
  campaign: ActiveLocationCampaign | null;
};

const UNITS = { stamps: { fr: "Tampons", ar: "أختام", en: "Stamps" }, points: { fr: "Points", ar: "نقاط", en: "Points" }, visits: { fr: "Passages", ar: "زيارات", en: "Visits" } } as const;
const lang = (l: string) => (l === "ar" || l === "en" ? l : "fr") as "fr" | "ar" | "en";

export function buildLoyaltyClass(classId: string, ctx: PassContext) {
  const L = lang(ctx.merchant.locale);
  const strip = ctx.design?.strip_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/brand-assets/${ctx.design.strip_path}` : null;
  return {
    id: classId,
    issuerName: (ctx.design?.logo_text || ctx.merchant.name).slice(0, 40),
    programName: ctx.program.name.slice(0, 40),
    programLogo: { sourceUri: { uri: `${ctx.appUrl}/api/brand/logo/${ctx.merchant.id}` }, contentDescription: { defaultValue: { language: L, value: ctx.merchant.name } } },
    hexBackgroundColor: ctx.design?.background_color ?? "#101828",
    ...(strip ? { heroImage: { sourceUri: { uri: strip } } } : {}),
    countryCode: "TN",
    reviewStatus: "UNDER_REVIEW",
    multipleDevicesAndHoldersAllowedStatus: "ONE_USER_ALL_DEVICES",
    ...(ctx.program.terms ? { textModulesData: [{ id: "terms", header: L === "ar" ? "الشروط" : L === "en" ? "Terms" : "Conditions", body: ctx.program.terms.slice(0, 500) }] } : {}),
    ...googleRelevance(ctx.locations, { campaign: ctx.campaign, campaignHeader: ctx.merchant.name }),
  };
}

export function buildLoyaltyObject(objectId: string, classId: string, ctx: PassContext, card: { serial: string; balance: number; public_token: string; status: string; customerName: string; referralUrl?: string | null }) {
  const L = lang(ctx.merchant.locale);
  const p = ctx.program;
  const progress = p.type !== "points" && p.stamps_required ? `${Math.min(card.balance, p.stamps_required)} / ${p.stamps_required}` : String(card.balance);
  const rel = googleRelevance(ctx.locations, { campaign: ctx.campaign, campaignHeader: ctx.merchant.name });
  return {
    id: objectId,
    classId,
    state: card.status === "active" ? "ACTIVE" : "INACTIVE",
    accountId: card.serial,
    accountName: card.customerName.slice(0, 40),
    loyaltyPoints: { label: UNITS[p.type][L], balance: { string: progress } },
    barcode: { type: "QR_CODE", value: `VYS.${card.serial}`, alternateText: card.serial },
    ...(p.reward_title ? { secondaryLoyaltyPoints: { label: L === "ar" ? "المكافأة" : L === "en" ? "Reward" : "Récompense", balance: { string: p.reward_title.slice(0, 30) } } } : {}),
    linksModuleData: { uris: [
      { id: "card", uri: `${ctx.appUrl}/c/${card.public_token}`, description: L === "ar" ? "بطاقتي" : L === "en" ? "My card" : "Ma carte" },
      ...(card.referralUrl ? [{ id: "invite", uri: card.referralUrl, description: L === "ar" ? "ادعُ صديقًا" : L === "en" ? "Invite a friend" : "Invitez un ami" }] : []),
    ] },
    ...(rel.merchantLocations ? { merchantLocations: rel.merchantLocations } : {}),
    ...(rel.messages ? { messages: rel.messages } : {}),
  };
}
