import { describe, expect, it } from "vitest";
import { createCardQrToken, parseCardQr } from "./qr-token";

const secret = "test-secret-test-secret-test-secret-1234";
const card = "0b6f1f4e-8a3c-4c47-9d5e-1a2b3c4d5e6f";

describe("card QR tokens", () => {
  it("round-trips a valid token", () => {
    const { token } = createCardQrToken(card, Date.now(), secret);
    expect(parseCardQr(token, Date.now(), secret)).toEqual({ kind: "dynamic", cardId: card });
  });
  it("rejects tampered tokens", () => {
    const { token } = createCardQrToken(card, Date.now(), secret);
    const other = token.replace(card, "11111111-2222-3333-4444-555555555555");
    expect(parseCardQr(other, Date.now(), secret)).toEqual({ kind: "invalid", reason: "signature" });
    expect(parseCardQr(token, Date.now(), "another-secret-another-secret-12345")).toEqual({ kind: "invalid", reason: "signature" });
  });
  it("rejects expired tokens (screenshots cannot be reused)", () => {
    const { token } = createCardQrToken(card, Date.now() - 10 * 60_000, secret);
    expect(parseCardQr(token, Date.now(), secret)).toEqual({ kind: "invalid", reason: "expired" });
  });
  it("parses static wallet serials and rejects junk", () => {
    expect(parseCardQr("VYS.AB23CD45EF", Date.now(), secret)).toEqual({ kind: "static", serial: "AB23CD45EF" });
    expect(parseCardQr("https://evil.example", Date.now(), secret).kind).toBe("invalid");
  });
});
