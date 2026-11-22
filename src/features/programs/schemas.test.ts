import { describe, expect, it } from "vitest";
import { contrastRatio, programSchema } from "./schemas";

describe("program schema", () => {
  it("requires stamps for stamp cards", () => {
    expect(programSchema.safeParse({ name: "Carte", type: "stamps" }).success).toBe(false);
    expect(programSchema.safeParse({ name: "Carte", type: "stamps", stamps_required: "10" }).success).toBe(true);
  });
  it("requires an earn rate for points cards", () => {
    expect(programSchema.safeParse({ name: "Carte", type: "points" }).success).toBe(false);
    expect(programSchema.safeParse({ name: "Carte", type: "points", points_per_unit: "1.5" }).success).toBe(true);
  });
  it("computes contrast", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrastRatio("#101828", "#C6F36B")).toBeGreaterThan(10);
  });
});
