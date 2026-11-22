import { describe, expect, it } from "vitest";
import { formatTND, initials, slugify } from "./utils";

describe("utils", () => {
  it("slugifies accented business names", () => {
    expect(slugify("Café Lumière — Tunis!")).toBe("cafe-lumiere-tunis");
  });
  it("builds initials", () => {
    expect(initials("raed ben ali")).toBe("RB");
    expect(initials("")).toBe("");
  });
  it("formats TND from millimes", () => {
    expect(formatTND(99000)).toMatch(/99/);
    expect(formatTND(99000)).toMatch(/TND|DT/);
  });
});
