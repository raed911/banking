import { describe, expect, it } from "vitest";
import { appleRelevance, currentCampaign, eligibleLocations, googleRelevance, type GeoLocation } from "./relevance";

const loc = (id: string, over: Partial<GeoLocation> = {}): GeoLocation => ({ id, name: `Shop ${id}`, latitude: 36.8065, longitude: 10.1815, geo_enabled: true, geo_radius_m: 100, geo_message: null, is_active: true, ...over });

describe("wallet location relevance", () => {
  it("only uses active, enabled locations with coordinates, max 10", () => {
    const list = [loc("a"), loc("b", { geo_enabled: false }), loc("c", { latitude: null }), loc("d", { is_active: false }), ...Array.from({ length: 12 }, (_, i) => loc(`x${i}`))];
    const out = eligibleLocations(list);
    expect(out.map((l) => l.id)).not.toContain("b");
    expect(out.map((l) => l.id)).not.toContain("c");
    expect(out.map((l) => l.id)).not.toContain("d");
    expect(out).toHaveLength(10);
  });
  it("puts campaign locations first so they survive the 10-location cap", () => {
    const list = Array.from({ length: 12 }, (_, i) => loc(`x${i}`));
    const out = eligibleLocations(list, { id: "c", message: "m", location_ids: ["x11"], program_ids: null, starts_at: "", ends_at: "" });
    expect(out[0]!.id).toBe("x11");
  });
  it("builds Apple locations with campaign text and maxDistance", () => {
    const r = appleRelevance([loc("a", { geo_radius_m: 150 }), loc("b", { geo_message: "Votre café vous attend ☕" })], { merchantName: "Café", campaign: { id: "c", message: "-20% aujourd'hui", location_ids: ["a"], program_ids: null, starts_at: "", ends_at: "" } });
    expect(r.locations?.[0]).toEqual({ latitude: 36.8065, longitude: 10.1815, relevantText: "-20% aujourd'hui" });
    expect(r.locations?.[1]?.relevantText).toBe("Votre café vous attend ☕");
    expect(r.maxDistance).toBe(150);
  });
  it("omits relevance entirely when nothing is configured", () => {
    expect(appleRelevance([loc("a", { geo_enabled: false })], { merchantName: "Café" })).toEqual({});
    expect(googleRelevance([], {})).toEqual({});
  });
  it("builds Google merchantLocations and a campaign message", () => {
    const g = googleRelevance([loc("a")], { campaign: { id: "c1", message: "Happy hour", location_ids: ["a"], program_ids: null, starts_at: "2026-12-01T10:00:00Z", ends_at: "2026-12-01T12:00:00Z" } });
    expect(g.merchantLocations).toEqual([{ latitude: 36.8065, longitude: 10.1815 }]);
    expect(g.messages?.[0]?.id).toBe("loc-campaign-c1");
  });
  it("selects the running campaign for a program", () => {
    const now = new Date("2026-12-01T11:00:00Z");
    const base = { message: "m", location_ids: ["a"], status: "active" };
    const list = [
      { ...base, id: "old", program_ids: null, starts_at: "2026-11-30T00:00:00Z", ends_at: "2026-12-02T00:00:00Z" },
      { ...base, id: "new", program_ids: ["p1"], starts_at: "2026-12-01T10:00:00Z", ends_at: "2026-12-01T12:00:00Z" },
      { ...base, id: "ended", program_ids: null, starts_at: "2026-11-01T00:00:00Z", ends_at: "2026-11-02T00:00:00Z" },
    ];
    expect(currentCampaign(list, "p1", now)?.id).toBe("new");
    expect(currentCampaign(list, "p2", now)?.id).toBe("old");
  });
});
