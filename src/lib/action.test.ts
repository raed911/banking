import { describe, expect, it } from "vitest";
import { safeNext } from "./action";

describe("safeNext", () => {
  it("keeps relative paths", () => expect(safeNext("/dashboard/customers?x=1")).toBe("/dashboard/customers?x=1"));
  it("blocks open redirects", () => {
    expect(safeNext("https://evil.com")).toBe("/dashboard");
    expect(safeNext("//evil.com")).toBe("/dashboard");
    expect(safeNext("/\\evil.com")).toBe("/dashboard");
    expect(safeNext(null)).toBe("/dashboard");
  });
});
