import "server-only";
import forge from "node-forge";

/**
 * Validates Apple Wallet signing material without contacting Apple: parses the Pass Type ID certificate
 * (PEM or .p12 + password), checks expiry, that it is a Pass Type ID cert, that Team ID / Pass Type ID match
 * what was entered, and that the private key belongs to the certificate.
 */
export type AppleCheck = { ok: true; expiresAt: string; passTypeId: string; teamId: string } | { ok: false; error: string };

export function inspectAppleCertificate(input: { certificate: string; privateKey?: string; password?: string; passTypeIdentifier: string; teamId: string }): AppleCheck {
  try {
    let cert: forge.pki.Certificate | undefined;
    let key: forge.pki.PrivateKey | undefined;
    const raw = input.certificate.trim();
    if (raw.includes("-----BEGIN CERTIFICATE-----")) {
      cert = forge.pki.certificateFromPem(raw);
    } else {
      const der = forge.util.decode64(raw.replace(/^data:[^,]+,/, ""));
      const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(der), input.password ?? "");
      const certBag = forge.pki.oids.certBag!, keyBag = forge.pki.oids.pkcs8ShroudedKeyBag!;
      cert = p12.getBags({ bagType: certBag })[certBag]?.[0]?.cert ?? undefined;
      key = p12.getBags({ bagType: keyBag })[keyBag]?.[0]?.key ?? undefined;
    }
    if (!cert) return { ok: false, error: "certificate_unreadable" };
    if (input.privateKey?.trim()) {
      key = input.privateKey.includes("ENCRYPTED") ? forge.pki.decryptRsaPrivateKey(input.privateKey, input.password ?? "") ?? undefined : forge.pki.privateKeyFromPem(input.privateKey);
    }
    if (!key) return { ok: false, error: "private_key_missing" };
    const pub = cert.publicKey as forge.pki.rsa.PublicKey;
    const k = key as forge.pki.rsa.PrivateKey;
    if (pub.n.compareTo(k.n) !== 0) return { ok: false, error: "key_does_not_match_certificate" };
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
