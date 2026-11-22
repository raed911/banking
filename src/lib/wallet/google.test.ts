import { describe, expect, it } from "vitest";
import { createVerify, generateKeyPairSync } from "node:crypto";
import { googleIds, normalizePrivateKey, saveToWalletUrl, signJwtRS256 } from "./google";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });

describe("google wallet helpers", () => {
  it("signs verifiable RS256 JWTs", () => {
    const jwt = signJwtRS256({ hello: "world" }, privateKey);
    const [h, p, s] = jwt.split(".");
    expect(JSON.parse(Buffer.from(h!, "base64url").toString())).toEqual({ alg: "RS256", typ: "JWT" });
    expect(createVerify("RSA-SHA256").update(`${h}.${p}`).verify(publicKey, Buffer.from(s!, "base64url"))).toBe(true);
  });
  it("accepts keys pasted with escaped newlines (as in the JSON key file)", () => {
    expect(normalizePrivateKey(privateKey.replace(/\n/g, "\\n"))).toBe(privateKey.trim());
    expect(() => normalizePrivateKey("not a key")).toThrow();
  });
  it("builds a Save to Google Wallet link for one loyalty object", () => {
    const url = saveToWalletUrl({ issuerId: "3388000000012345678", serviceAccountEmail: "sa@p.iam.gserviceaccount.com", privateKey }, "3388000000012345678.vayro_card_ABCDEF2345", ["https://vayro-app.vercel.app"]);
    const payload = JSON.parse(Buffer.from(url.split("/save/")[1]!.split(".")[1]!, "base64url").toString());
    expect(payload).toMatchObject({ aud: "google", typ: "savetowallet", payload: { loyaltyObjects: [{ id: "3388000000012345678.vayro_card_ABCDEF2345" }] } });
  });
  it("derives stable, valid class and object ids", () => {
    const ids = googleIds("3388", "cafe-lumiere", "0b6f1f4e-8a3c-4c47-9d5e-1a2b3c4d5e6f", "ABCDEF2345");
    expect(ids.classId).toBe("3388.vayro_cafe_lumiere_0b6f1f4e8a3c4c479d5e1a2b3c4d5e6f");
    expect(ids.objectId).toBe("3388.vayro_card_ABCDEF2345");
  });
});
