import "server-only";
import forge from "node-forge";

/**
 * Apple Worldwide Developer Relations intermediate certificate (G4), required in every .pkpass signature.
 * It is a public certificate: read from APPLE_WWDR_PEM if set, otherwise downloaded once from apple.com
 * and cached in memory for the lifetime of the server instance.
 */
const WWDR_URL = "https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer";
let cached: string | null = null;

export function validateWwdr(pem: string) {
  const cert = forge.pki.certificateFromPem(pem);
  const cn = String(cert.subject.getField("CN")?.value ?? "");
  if (!cn.startsWith("Apple Worldwide Developer Relations")) throw new Error("wwdr_unexpected_subject");
  if (cert.validity.notAfter < new Date()) throw new Error("wwdr_expired");
  return pem;
}

export async function appleWwdrPem(): Promise<string> {
  if (cached) return cached;
  if (process.env.APPLE_WWDR_PEM?.includes("BEGIN CERTIFICATE")) return (cached = validateWwdr(process.env.APPLE_WWDR_PEM));
  const res = await fetch(WWDR_URL, { cache: "force-cache" });
  if (!res.ok) throw new Error(`wwdr_download_failed_${res.status}`);
  const der = Buffer.from(await res.arrayBuffer());
  const pem = forge.pki.certificateToPem(forge.pki.certificateFromAsn1(forge.asn1.fromDer(der.toString("binary"))));
  return (cached = validateWwdr(pem));
}
