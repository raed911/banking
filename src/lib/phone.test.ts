import { describe, expect, it } from "vitest";
import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("accepts local Tunisian numbers", () => expect(normalizePhone("20 123 456")).toBe("+21620123456"));
  it("accepts international formats", () => {
    expect(normalizePhone("+216 98-765-432")).toBe("+21698765432");
    expect(normalizePhone("0033612345678")).toBe("+33612345678");
  });
  it("rejects invalid numbers", () => {
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("+216 1234")).toBeNull();
    expect(normalizePhone("abc")).toBeNull();
  });
});
