import { describe, expect, it } from "vitest";
import { buildLoyaltyClass, buildLoyaltyObject, type PassContext } from "./google-pass";

const ctx: PassContext = {
  appUrl: "https://vayro-app.vercel.app",
  merchant: { id: "11111111-1111-1111-1111-111111111111", name: "Café Lumière", locale: "fr" },
  program: { id: "p", name: "Carte café", type: "stamps", stamps_required: 10, reward_title: "Café offert", terms: null },
  design: { background_color: "#101828", strip_path: null, logo_text: null },
  locations: [{ id: "l", name: "Tunis", latitude: 36.8, longitude: 10.18, geo_enabled: true, geo_radius_m: 100, geo_message: null, is_active: true }],
  campaign: null,
};

describe("google loyalty resources", () => {
  it("class has the required fields and merchant locations", () => {
    const c = buildLoyaltyClass("338.vayro_x", ctx);
    expect(c).toMatchObject({ id: "338.vayro_x", issuerName: "Café Lumière", programName: "Carte café", reviewStatus: "UNDER_REVIEW", hexBackgroundColor: "#101828", countryCode: "TN" });
    expect(c.programLogo.sourceUri.uri).toBe("https://vayro-app.vercel.app/api/brand/logo/11111111-1111-1111-1111-111111111111");
    expect(c.merchantLocations).toEqual([{ latitude: 36.8, longitude: 10.18 }]);
  });
  it("object shows progress, a static staff-only barcode and the card link", () => {
    const o = buildLoyaltyObject("338.vayro_card_ABCDEFGH23", "338.vayro_x", ctx, { serial: "ABCDEFGH23", balance: 7, public_token: "tok", status: "active", customerName: "Leila" });
    expect(o.loyaltyPoints).toEqual({ label: "Tampons", balance: { string: "7 / 10" } });
    expect(o.barcode).toEqual({ type: "QR_CODE", value: "VYS.ABCDEFGH23", alternateText: "ABCDEFGH23" });
    expect(o.state).toBe("ACTIVE");
    expect(o.linksModuleData.uris[0]!.uri).toBe("https://vayro-app.vercel.app/c/tok");
  });
});
