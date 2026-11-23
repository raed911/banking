import "server-only";
import forge from "node-forge";

/**
 * Apple Wallet signing material, handled entirely on the server:
 *  - accepts a Pass Type ID certificate as PEM, DER (.cer downloaded from Apple, base64) or .p12/.pfx (base64 + password);
 *  - the private key comes from the .p12, a pasted PEM, or the key VAYRO generated for the CSR;
 *  - `inspectAppleCertificate` validates everything without contacting Apple.
 */
export type AppleCheck = { ok: true; expiresAt: string; passTypeId: string; teamId: string } | { ok: false; error: string };
export type AppleMaterialInput = { certificate: string; privateKey?: string; password?: string };

function readMaterial(input: AppleMaterialInput) {
  let cert: forge.pki.Certificate | undefined;
  let key: forge.pki.PrivateKey | undefined;
  const raw = input.certificate.trim();
  if (raw.includes("-----BEGIN CERTIFICATE-----")) {
    cert = forge.pki.certificateFromPem(raw);
  } else {
    const der = forge.util.decode64(raw.replace(/^data:[^,]+,/, ""));
    const asn1 = forge.asn1.fromDer(der);
    try {
      cert = forge.pki.certificateFromAsn1(asn1); // .cer straight from developer.apple.com
    } catch {
      const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, input.password ?? "");
      const certBag = forge.pki.oids.certBag!, keyBag = forge.pki.oids.pkcs8ShroudedKeyBag!;
      cert = p12.getBags({ bagType: certBag })[certBag]?.[0]?.cert ?? undefined;
      key = p12.getBags({ bagType: keyBag })[keyBag]?.[0]?.key ?? undefined;
    }
  }
  if (input.privateKey?.trim() && !key) {
    key = input.privateKey.includes("ENCRYPTED") ? forge.pki.decryptRsaPrivateKey(input.privateKey, input.password ?? "") ?? undefined : forge.pki.privateKeyFromPem(input.privateKey);
  }
  return { cert, key };
}

export function inspectAppleCertificate(input: AppleMaterialInput & { passTypeIdentifier: string; teamId: string }): AppleCheck {
  try {
    const { cert, key } = readMaterial(input);
    if (!cert) return { ok: false, error: "certificate_unreadable" };
    if (!key) return { ok: false, error: "private_key_missing" };
    const pub = cert.publicKey as forge.pki.rsa.PublicKey;
    if (pub.n.compareTo((key as forge.pki.rsa.PrivateKey).n) !== 0) return { ok: false, error: "key_does_not_match_certificate" };
    if (cert.validity.notAfter < new Date()) return { ok: false, error: "certificate_expired" };
    const uid = cert.subject.getField({ type: "0.9.2342.19200300.100.1.1" })?.value as string | undefined;
    const ou = cert.subject.getField("OU")?.value as string | undefined;
    if (!uid?.startsWith("pass.")) return { ok: false, error: "not_a_pass_type_certificate" };
    if (uid !== input.passTypeIdentifier.trim()) return { ok: false, error: "pass_type_id_mismatch" };
    if (ou && ou !== input.teamId.trim()) return { ok: false, error: "team_id_mismatch" };
    return { ok: true, expiresAt: cert.validity.notAfter.toISOString(), passTypeId: uid, teamId: ou ?? input.teamId };
  } catch (e) {
    return { ok: false, error: /password|mac/i.test(String(e)) ? "wrong_password" : "certificate_unreadable" };
  }
}

/** Certificate + key as PEM, ready for signing and APNs. Throws if unusable. */
export function signingMaterial(input: AppleMaterialInput) {
  const { cert, key } = readMaterial(input);
  if (!cert || !key) throw new Error("apple_material_incomplete");
  return { certPem: forge.pki.certificateToPem(cert), keyPem: forge.pki.privateKeyToPem(key) };
}

/** Pass Type ID and Team ID read from the certificate itself (so the merchant/admin does not need to type them). */
export function certificateIdentity(certificate: string, password?: string) {
  const { cert } = readMaterial({ certificate, password });
  if (!cert) return null;
  return {
    passTypeIdentifier: (cert.subject.getField({ type: "0.9.2342.19200300.100.1.1" })?.value as string | undefined) ?? null,
    teamId: (cert.subject.getField("OU")?.value as string | undefined) ?? null,
  };
}

/** New RSA-2048 key + Certificate Signing Request to upload on developer.apple.com (no Mac/Keychain needed). */
export function createCsr(commonName: string, email?: string) {
  const keys = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
  const csr = forge.pki.createCertificationRequest();
  csr.publicKey = keys.publicKey;
  csr.setSubject([{ name: "commonName", value: commonName.slice(0, 64) }, ...(email ? [{ name: "emailAddress", value: email }] : []), { name: "countryName", value: "TN" }]);
  csr.sign(keys.privateKey, forge.md.sha256.create());
  return { csrPem: forge.pki.certificationRequestToPem(csr), keyPem: forge.pki.privateKeyToPem(keys.privateKey) };
}
