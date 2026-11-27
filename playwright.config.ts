import { defineConfig, devices } from "@playwright/test";
import forge from "node-forge";

/** Local runs only: apple.com is not reachable from the test sandbox, so the local server gets a self-signed stand-in
 *  for Apple's public WWDR intermediate (production downloads the real one). */
function testWwdrPem() {
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey; cert.serialNumber = "01";
  cert.validity.notBefore = new Date(Date.now() - 86400000); cert.validity.notAfter = new Date(Date.now() + 365 * 86400000);
  const attrs = [{ name: "commonName", value: "Apple Worldwide Developer Relations Certification Authority" }, { shortName: "OU", value: "G4" }];
  cert.setSubject(attrs); cert.setIssuer(attrs); cert.sign(keys.privateKey, forge.md.sha256.create());
  return forge.pki.certificateToPem(cert);
}

const executablePath = process.env.PW_CHROMIUM_PATH ?? (process.env.CI ? undefined : "/opt/pw-browsers/chromium");

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100", trace: "off" },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "NODE_USE_ENV_PROXY=1 npm run start -- -p 3100", port: 3100, reuseExistingServer: true, timeout: 120_000, env: { APPLE_WWDR_PEM: process.env.APPLE_WWDR_PEM ?? testWwdrPem() } },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions: { executablePath } } },
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions: { executablePath } } },
  ],
});
