import { expect, test } from "@playwright/test";
import forge from "node-forge";
import { admin, deleteUserAndMerchants, signInWithBusiness } from "./helpers";

/** Mini zip reader for STORE entries (what VAYRO produces). */
function unzip(buf: Buffer) {
  const out = new Map<string, Buffer>();
  let p = 0;
  while (buf.readUInt32LE(p) === 0x04034b50) {
    const size = buf.readUInt32LE(p + 18), nameLen = buf.readUInt16LE(p + 26), extra = buf.readUInt16LE(p + 28);
    const name = buf.subarray(p + 30, p + 30 + nameLen).toString();
    const start = p + 30 + nameLen + extra;
    out.set(name, buf.subarray(start, start + size));
    p = start + size;
  }
  return out;
}

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

test("Apple Wallet: certificate assistant → pass download → device registration → updates", async ({ page, browser, request }, info) => {
  test.skip(info.project.name !== "desktop", "one run is enough (shared merchant-level credentials)");
  test.setTimeout(150_000);
  const owner = await signInWithBusiness(page, "Café Apple");
  try {
    // 1) a stamp program
    await page.goto("/dashboard/programs/new");
    await page.locator("#name").fill("Carte Apple");
    await page.locator("#stamps_required").fill("5");
    await page.locator("#reward_title").fill("Café offert");
    await page.locator("#cooldown_minutes").fill("0");
    await page.locator("form button[type=submit]").last().click();
    await page.waitForURL(/programs\/[0-9a-f-]{36}/);
    await page.goto(page.url().split("?")[0] + "?tab=enroll");
    const joinPath = (await page.locator("text=/\\/join\\/[a-z0-9]{8}/").first().textContent())!.match(/\/join\/[a-z0-9]{8}/)![0];

    // 2) certificate assistant: VAYRO generates the CSR, "Apple" signs it, the .cer is imported
    await page.goto("/dashboard/integrations");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /fichier pour apple|file for apple/i }).click()]);
    expect(download.suggestedFilename()).toBe("VAYRO.certSigningRequest");
    const csr = forge.pki.certificationRequestFromPem((await (await download.createReadStream()).toArray()).join(""));
    expect(csr.verify()).toBe(true);
    const ca = forge.pki.rsa.generateKeyPair(1024);
    const cert = forge.pki.createCertificate();
    cert.publicKey = csr.publicKey!; cert.serialNumber = "0b";
    cert.validity.notBefore = new Date(Date.now() - 1000); cert.validity.notAfter = new Date(Date.now() + 365 * 86400000);
    cert.setSubject([{ type: "0.9.2342.19200300.100.1.1", value: "pass.app.vayro.e2e" }, { name: "commonName", value: "Pass Type ID: pass.app.vayro.e2e" }, { shortName: "OU", value: "E2ETEAM123" }]);
    cert.setIssuer([{ name: "commonName", value: "Apple Worldwide Developer Relations Certification Authority" }]);
    cert.sign(ca.privateKey, forge.md.sha256.create());
    const der = Buffer.from(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes(), "binary");
    await page.locator("#a-cert").setInputFiles({ name: "pass.cer", mimeType: "application/pkix-cert", buffer: der });
    await expect(page.locator("#a-team")).toHaveValue("E2ETEAM123");
    await expect(page.locator("#a-pass")).toHaveValue("pass.app.vayro.e2e");
    const appleForm = page.locator("form").nth(1);
    await appleForm.locator("button[type=submit]").click();
    await expect(page.getByText(/valide jusqu|valid until/i)).toBeVisible();
    await page.getByRole("button", { name: /tester la connexion|test connection/i }).last().click();
    await expect(page.getByText(/^Connecté$|^Connected$/).first()).toBeVisible({ timeout: 20_000 });

    // 3) customer on an iPhone sees "Add to Apple Wallet" and gets a signed .pkpass
    const phoneCtx = await browser.newContext({ userAgent: IPHONE, viewport: { width: 390, height: 844 }, isMobile: true, extraHTTPHeaders: { "x-real-ip": `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
    const customer = await phoneCtx.newPage();
    await customer.goto(joinPath);
    await customer.locator("#first_name").fill("Lina");
    const phone = `5${String(Date.now()).slice(-7)}`;
    await customer.locator("#phone").fill(phone);
    await customer.locator("form button[type=submit]").click();
    await customer.waitForURL(/\/c\/[A-Za-z0-9_-]{24,}/);
    const addApple = customer.getByRole("link", { name: /apple wallet/i });
    await expect(addApple).toBeVisible();
    await expect(customer.getByRole("link", { name: /google wallet/i })).toHaveCount(0);
    const res = await customer.request.get((await addApple.getAttribute("href"))!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/vnd.apple.pkpass");
    const files = unzip(Buffer.from(await res.body()));
    for (const f of ["pass.json", "manifest.json", "signature", "icon.png", "icon@2x.png", "strip.png", "strip@2x.png"]) expect(files.has(f), f).toBe(true);
    const pass = JSON.parse(files.get("pass.json")!.toString());
    expect(pass).toMatchObject({ passTypeIdentifier: "pass.app.vayro.e2e", teamIdentifier: "E2ETEAM123", organizationName: "Café Apple" });
    expect(pass.storeCard.headerFields[0].value).toBe("0 / 5");
    const serial: string = pass.serialNumber;
    const auth = { authorization: `ApplePass ${pass.authenticationToken}` };
    const ws = `/api/wallet/apple/ws/v1`;
    const device = `e2edevice${Date.now()}`;

    // 4) PassKit web service: auth, registration, update list, pass fetch, unregister
    expect((await request.post(`${ws}/devices/${device}/registrations/pass.app.vayro.e2e/${serial}`, { headers: { authorization: "ApplePass wrong-token-000000" }, data: { pushToken: "a".repeat(64) } })).status()).toBe(401);
    expect((await request.post(`${ws}/devices/${device}/registrations/pass.app.vayro.e2e/${serial}`, { headers: auth, data: { pushToken: "a".repeat(64) } })).status()).toBe(201);
    expect((await request.post(`${ws}/devices/${device}/registrations/pass.app.vayro.e2e/${serial}`, { headers: auth, data: { pushToken: "b".repeat(64) } })).status()).toBe(200);
    const list1 = await request.get(`${ws}/devices/${device}/registrations/pass.app.vayro.e2e`);
    expect(list1.status()).toBe(200);
    const body1 = await list1.json();
    expect(body1.serialNumbers).toEqual([serial]);
    expect((await request.get(`${ws}/devices/${device}/registrations/pass.app.vayro.e2e?passesUpdatedSince=${body1.lastUpdated}`)).status()).toBe(204);

    // staff adds a stamp → the pass is marked updated (the APNs push itself only reaches real devices)
    await page.goto("/scan");
    await page.getByRole("button", { name: /saisie manuelle|manual entry/i }).click();
    await page.locator("input[placeholder='AB23CD45EF']").fill(phone);
    await page.getByRole("button", { name: /rechercher|search/i }).click();
    await page.getByRole("button", { name: /\+1 (tampon|stamp)/i }).click();
    await expect(page.getByText(/\+1 ajouté|\+1 added/)).toBeVisible();
    await expect.poll(async () => (await request.get(`${ws}/devices/${device}/registrations/pass.app.vayro.e2e?passesUpdatedSince=${body1.lastUpdated}`)).status(), { timeout: 30_000 }).toBe(200);

    const fresh = await request.get(`${ws}/passes/pass.app.vayro.e2e/${serial}`, { headers: auth });
    expect(fresh.status()).toBe(200);
    const freshPass = JSON.parse(unzip(Buffer.from(await fresh.body())).get("pass.json")!.toString());
    expect(freshPass.storeCard.headerFields[0].value).toBe("1 / 5");
    expect((await request.get(`${ws}/passes/pass.app.vayro.e2e/${serial}`, { headers: { ...auth, "if-modified-since": fresh.headers()["last-modified"]! } })).status()).toBe(304);
    expect((await request.get(`${ws}/passes/pass.app.vayro.e2e/${serial}`)).status()).toBe(401);

    expect((await request.delete(`${ws}/devices/${device}/registrations/pass.app.vayro.e2e/${serial}`, { headers: auth })).status()).toBe(200);
    const { data: row } = await admin().from("wallet_passes").select("removed_at, installed_at").eq("serial_number", serial).eq("platform", "apple").single();
    expect(row?.installed_at).toBeTruthy();
    expect(row?.removed_at).toBeTruthy();
    expect((await request.post(`${ws}/log`, { data: { logs: ["e2e log line"] } })).status()).toBe(200);
    await phoneCtx.close();
  } finally {
    await deleteUserAndMerchants(owner.id);
  }
});
