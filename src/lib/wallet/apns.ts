import "server-only";
import http2 from "node:http2";

/**
 * Apple Push Notification service for Wallet passes: an empty push tells the device "this pass changed";
 * the device then calls our PassKit web service to fetch the new version. Authenticated with the
 * Pass Type ID certificate (TLS client cert); topic = passTypeIdentifier.
 */
export type PushResult = { token: string; status: number; reason?: string };

export async function pushPassUpdates(tokens: string[], opts: { certPem: string; keyPem: string; topic: string; host?: string }): Promise<PushResult[]> {
  if (!tokens.length) return [];
  const client = http2.connect(`https://${opts.host ?? "api.push.apple.com"}`, { cert: opts.certPem, key: opts.keyPem });
  client.on("error", () => undefined); // never let a late socket error crash the process; per-request errors are reported below
  const results: PushResult[] = [];
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("apns_connect_timeout")), 10_000);
      client.once("connect", () => { clearTimeout(timer); resolve(); });
      client.once("error", (e) => { clearTimeout(timer); reject(e); });
    });
    for (let i = 0; i < tokens.length; i += 50) {
      const batch = tokens.slice(i, i + 50);
      results.push(...(await Promise.all(batch.map((token) => new Promise<PushResult>((resolve) => {
        const req = client.request({ ":method": "POST", ":path": `/3/device/${token}`, "apns-topic": opts.topic, "content-type": "application/json" });
        let status = 0, body = "";
        req.setTimeout(10_000, () => { req.close(); resolve({ token, status: 0, reason: "timeout" }); });
        req.on("response", (h) => { status = Number(h[":status"] ?? 0); });
        req.on("data", (c) => { body += c; });
        req.on("end", () => { let reason: string | undefined; try { reason = body ? JSON.parse(body).reason : undefined; } catch {} resolve({ token, status, reason }); });
        req.on("error", (e) => resolve({ token, status: 0, reason: e.message }));
        req.end("{}");
      })))));
    }
  } finally {
    client.close();
  }
  return results;
}
