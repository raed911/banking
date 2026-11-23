import { expect, test } from "@playwright/test";
import { generateKeyPairSync } from "node:crypto";
import forge from "node-forge";
import { admin, deleteUserAndMerchants, signInWithBusiness } from "./helpers";

test("merchant saves Wallet credentials: validated, encrypted at rest, never shown back", async ({ page }) => {
  test.setTimeout(90_000);
  const owner = await signInWithBusiness(page, "Café Intégrations");
  try {
    await page.goto("/dashboard/integrations");
    // Google: invalid key is rejected, valid key is stored encrypted
    await page.locator("#g-issuer").fill("3388000000022334455");
    await page.locator("#g-email").fill("vayro@vayro-test.iam.gserviceaccount.com");
    await page.locator("#g-key").fill("not a key");
    await page.locator("form").first().locator("button[type=submit]").click();
    await expect(page.getByRole("alert").first()).toBeVisible();
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
    await page.locator("#g-key").fill(privateKey);
    await page.locator("form").first().locator("button[type=submit]").click();
    await expect(page.getByRole("status").first()).toBeVisible();
    await page.reload();
    await expect(page.locator("#g-key")).toHaveValue("");
    await expect(page.getByText(/configuré|configured/i).first()).toBeVisible();

    // Apple: self-signed Pass Type ID cert as .p12
    const keys = forge.pki.rsa.generateKeyPair(1024);
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey; cert.serialNumber = "01";
    cert.validity.notBefore = new Date(Date.now() - 86400000); cert.validity.notAfter = new Date(Date.now() + 300 * 86400000);
    const attrs = [{ type: "0.9.2342.19200300.100.1.1", value: "pass.app.vayro.test" }, { shortName: "OU", value: "ABCDE12345" }];
    cert.setSubject(attrs); cert.setIssuer(attrs); cert.sign(keys.privateKey, forge.md.sha256.create());
    const p12 = Buffer.from(forge.asn1.toDer(forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], "pw123", { algorithm: "3des" })).getBytes(), "binary");
    await page.locator("#a-team").fill("ABCDE12345");
    await page.locator("#a-pass").fill("pass.app.vayro.test");
    await page.locator("#a-cert").setInputFiles({ name: "pass.p12", mimeType: "application/x-pkcs12", buffer: p12 });
    await page.getByText(/avancé|advanced/i).click();
    await page.locator("#a-pass-word").fill("pw123");
    await page.locator("form").nth(1).locator("button[type=submit]").click();
    await expect(page.getByText(/valide jusqu|valid until/i)).toBeVisible();

    const { data } = await admin().from("integrations").select("provider, secret_ciphertext, config").not("merchant_id", "is", null).eq("updated_by", owner.id);
    expect(data).toHaveLength(2);
    for (const row of data!) {
      expect(row.secret_ciphertext).toMatch(/^v1\./);
      expect(row.secret_ciphertext).not.toContain("PRIVATE KEY");
      expect(JSON.stringify(row.config)).not.toContain("PRIVATE");
    }
  } finally {
    await deleteUserAndMerchants(owner.id);
  }
});
