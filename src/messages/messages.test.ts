import { describe, expect, it } from "vitest";
import fr from "./fr.json";
import en from "./en.json";
import ar from "./ar.json";

function keys(obj: unknown, prefix = ""): string[] {
  if (Array.isArray(obj) || typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe("translations", () => {
  it("French, English and Arabic have exactly the same keys", () => {
    const f = new Set(keys(fr));
    expect(keys(en).filter((k) => !f.has(k))).toEqual([]);
    expect(keys(ar).filter((k) => !f.has(k))).toEqual([]);
    expect([...f].filter((k) => !keys(en).includes(k))).toEqual([]);
    expect([...f].filter((k) => !keys(ar).includes(k))).toEqual([]);
  });
  it("no key contains a dot (next-intl treats dots as nesting)", () => {
    const bad: string[] = [];
    const walk = (o: unknown, p: string) => { if (o && typeof o === "object" && !Array.isArray(o)) for (const [k, v] of Object.entries(o)) { if (k.includes(".")) bad.push(`${p}.${k}`); walk(v, `${p}.${k}`); } };
    walk(fr, "fr");
    expect(bad).toEqual([]);
  });
});
