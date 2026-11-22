import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { decryptSecret, encryptSecret, hint } from "./vault";

const k = randomBytes(32).toString("base64");

describe("secret vault", () => {
  it("round-trips with the same associated data", () => {
    const env = encryptSecret("-----BEGIN PRIVATE KEY-----abc", "google_wallet:platform", k);
    expect(env.startsWith("v1.")).toBe(true);
    expect(env).not.toContain("PRIVATE KEY");
    expect(decryptSecret(env, "google_wallet:platform", k)).toBe("-----BEGIN PRIVATE KEY-----abc");
  });
  it("uses a fresh IV every time", () => {
    expect(encryptSecret("x", "a", k)).not.toBe(encryptSecret("x", "a", k));
  });
  it("refuses a ciphertext moved to another owner, a tampered one, or a wrong key", () => {
    const env = encryptSecret("secret", "google_wallet:merchant-1", k);
    expect(() => decryptSecret(env, "google_wallet:merchant-2", k)).toThrow();
    const parts = env.split("."); parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => decryptSecret(parts.join("."), "google_wallet:merchant-1", k)).toThrow();
    expect(() => decryptSecret(env, "google_wallet:merchant-1", randomBytes(32).toString("base64"))).toThrow();
  });
  it("only reveals a short hint", () => expect(hint("abcdefghijkl")).toBe("…ijkl"));
});
