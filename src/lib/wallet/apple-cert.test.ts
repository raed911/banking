import { describe, expect, it } from "vitest";
import forge from "node-forge";
import { inspectAppleCertificate } from "./apple-cert";

function makeCert(uid: string, ou: string, days = 365) {
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date(Date.now() - 86400000);
  cert.validity.notAfter = new Date(Date.now() + days * 86400000);
  const attrs = [{ type: "0.9.2342.19200300.100.1.1", value: uid }, { name: "commonName", value: `Pass Type ID: ${uid}` }, { shortName: "OU", value: ou }];
  cert.setSubject(attrs); cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  return { certPem: forge.pki.certificateToPem(cert), keyPem: forge.pki.privateKeyToPem(keys.privateKey), keys, cert };
}

describe("apple certificate inspection", () => {
  const c = makeCert("pass.app.vayro.loyalty", "ABCDE12345");
  it("accepts a matching PEM certificate + key", () => {
    expect(inspectAppleCertificate({ certificate: c.certPem, privateKey: c.keyPem, passTypeIdentifier: "pass.app.vayro.loyalty", teamId: "ABCDE12345" })).toMatchObject({ ok: true, teamId: "ABCDE12345" });
  });
  it("accepts a .p12 (base64) with its password", () => {
    const p12 = forge.pkcs12.toPkcs12Asn1(c.keys.privateKey, [c.cert], "s3cret", { algorithm: "3des" });
    const b64 = forge.util.encode64(forge.asn1.toDer(p12).getBytes());
    expect(inspectAppleCertificate({ certificate: b64, password: "s3cret", passTypeIdentifier: "pass.app.vayro.loyalty", teamId: "ABCDE12345" }).ok).toBe(true);
    expect(inspectAppleCertificate({ certificate: b64, password: "wrong", passTypeIdentifier: "pass.app.vayro.loyalty", teamId: "ABCDE12345" })).toMatchObject({ ok: false });
  });
  it("rejects mismatches and foreign keys", () => {
    expect(inspectAppleCertificate({ certificate: c.certPem, privateKey: c.keyPem, passTypeIdentifier: "pass.other", teamId: "ABCDE12345" })).toEqual({ ok: false, error: "pass_type_id_mismatch" });
    expect(inspectAppleCertificate({ certificate: c.certPem, privateKey: c.keyPem, passTypeIdentifier: "pass.app.vayro.loyalty", teamId: "ZZZ" })).toEqual({ ok: false, error: "team_id_mismatch" });
    expect(inspectAppleCertificate({ certificate: c.certPem, privateKey: makeCert("pass.x", "Y").keyPem, passTypeIdentifier: "pass.app.vayro.loyalty", teamId: "ABCDE12345" })).toEqual({ ok: false, error: "key_does_not_match_certificate" });
  });
});
