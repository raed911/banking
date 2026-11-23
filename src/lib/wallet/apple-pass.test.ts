import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import forge from "node-forge";
import { buildPassJson, packagePass, progressText, sha1Hex, stampStripSvg, type ApplePassContext } from "./apple-pass";
import { crc32, unzipStore } from "./zip";

function selfSigned(subject: { name?: string; shortName?: string; type?: string; value: string }[]) {
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "0" + Math.floor(Math.random() * 1e8).toString(16);
  cert.validity.notBefore = new Date(Date.now() - 86400000);
  cert.validity.notAfter = new Date(Date.now() + 365 * 86400000);
  cert.setSubject(subject); cert.setIssuer(subject);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  return { certPem: forge.pki.certificateToPem(cert), keyPem: forge.pki.privateKeyToPem(keys.privateKey) };
}

const ctx: ApplePassContext = {
  appUrl: "https://vayro.example", passTypeIdentifier: "pass.app.vayro.test", teamIdentifier: "ABCDE12345",
  merchant: { id: "m1", name: "Café Lune", locale: "fr" },
  program: { id: "p1", name: "Carte café", type: "stamps", stamps_required: 8, reward_title: "Café offert", terms: "Un tampon par visite." },
  design: { background_color: "#101828", foreground_color: "#FFFFFF", label_color: "#C6F36B", logo_text: null },
  locations: [{ id: "l1", name: "Centre", latitude: 35.6781, longitude: 10.0963, geo_enabled: true, geo_radius_m: 100, geo_message: "Votre café vous attend", is_active: true }],
  campaign: null,
};
const card = { serial: "AB23CD45EF", balance: 3, public_token: "tok_123", status: "active", customerName: "Sami", authenticationToken: "a".repeat(43), news: "Café -20% ce week-end" };

describe("apple pass.json", () => {
  const pass = buildPassJson(ctx, card);
  it("has the required PassKit keys", () => {
    expect(pass).toMatchObject({ formatVersion: 1, passTypeIdentifier: "pass.app.vayro.test", teamIdentifier: "ABCDE12345", serialNumber: "AB23CD45EF", organizationName: "Café Lune", webServiceURL: "https://vayro.example/api/wallet/apple/ws", backgroundColor: "rgb(16,24,40)", labelColor: "rgb(198,243,107)" });
    expect(pass.authenticationToken.length).toBeGreaterThanOrEqual(16);
    expect(pass.barcodes[0]).toEqual({ format: "PKBarcodeFormatQR", message: "VYS.AB23CD45EF", messageEncoding: "iso-8859-1", altText: "AB23CD45EF" });
  });
  it("shows progress with a change message and the campaign news on the back", () => {
    expect(pass.storeCard.headerFields[0]).toMatchObject({ key: "balance", value: "3 / 8", changeMessage: "Votre carte : %@" });
    expect(pass.storeCard.backFields[0]).toMatchObject({ key: "news", value: "Café -20% ce week-end", changeMessage: "%@" });
    expect(pass.storeCard.primaryFields).toEqual([]);
  });
  it("carries location relevance and voids inactive cards", () => {
    expect(pass).toMatchObject({ locations: [{ latitude: 35.6781, longitude: 10.0963, relevantText: "Votre café vous attend" }], maxDistance: 100 });
    expect(buildPassJson(ctx, { ...card, status: "blocked" })).toMatchObject({ voided: true });
  });
  it("points programs show the balance as the primary field", () => {
    expect(progressText("points", 120, null)).toBe("120");
    const p = buildPassJson({ ...ctx, program: { ...ctx.program, type: "points", stamps_required: null } }, { ...card, balance: 120 });
    expect(p.storeCard.primaryFields[0]).toMatchObject({ key: "points", value: 120 });
  });
  it("draws the right number of stamps", () => {
    const svg = stampStripSvg({ required: 8, balance: 3, background: "#101828", filled: "#C6F36B", empty: "#FFFFFF" });
    expect(svg.match(/<circle/g)).toHaveLength(8);
    expect(svg.match(/<path/g)).toHaveLength(3);
  });
});

describe("pkpass packaging", () => {
  it("zips files with a SHA-1 manifest and a valid detached PKCS#7 signature", () => {
    const signer = selfSigned([{ type: "0.9.2342.19200300.100.1.1", value: "pass.app.vayro.test" }, { name: "commonName", value: "Pass Type ID: pass.app.vayro.test" }, { shortName: "OU", value: "ABCDE12345" }]);
    const wwdr = selfSigned([{ name: "commonName", value: "Apple Worldwide Developer Relations Certification Authority" }, { shortName: "OU", value: "G4" }]);
    const files = { "pass.json": Buffer.from(JSON.stringify(buildPassJson(ctx, card))), "icon.png": Buffer.from([0x89, 0x50, 0x4e, 0x47]) };
    const zip = packagePass(files, signer, wwdr.certPem);
    const entries = unzipStore(zip);
    expect([...entries.keys()].sort()).toEqual(["icon.png", "manifest.json", "pass.json", "signature"]);
    const manifest = JSON.parse(entries.get("manifest.json")!.toString());
    expect(manifest["pass.json"]).toBe(sha1Hex(files["pass.json"]));
    expect(manifest["icon.png"]).toBe(sha1Hex(files["icon.png"]));

    // Verify with OpenSSL exactly as a PKCS#7 consumer would (signature over manifest.json, detached).
    const dir = mkdtempSync(join(tmpdir(), "pkpass-"));
    writeFileSync(join(dir, "manifest.json"), entries.get("manifest.json")!);
    writeFileSync(join(dir, "signature"), entries.get("signature")!);
    writeFileSync(join(dir, "pkpass.zip"), zip);
    const out = execFileSync("openssl", ["cms", "-verify", "-noverify", "-binary", "-inform", "DER", "-in", join(dir, "signature"), "-content", join(dir, "manifest.json"), "-out", "/dev/null"], { stdio: ["ignore", "pipe", "pipe"] });
    expect(out).toBeDefined(); // throws on a bad signature
    const certs = execFileSync("openssl", ["pkcs7", "-inform", "DER", "-in", join(dir, "signature"), "-print_certs", "-noout"]).toString();
    expect(certs).toContain("Pass Type ID: pass.app.vayro.test");
    expect(certs).toContain("Apple Worldwide Developer Relations");
    // A standard unzip tool accepts the archive.
    expect(execFileSync("unzip", ["-t", join(dir, "pkpass.zip")]).toString()).toMatch(/No errors detected/);
  });
  it("crc32 matches the reference value", () => {
    expect(crc32(Buffer.from("123456789"))).toBe(0xcbf43926);
  });
});
