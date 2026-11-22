import { expect, test } from "@playwright/test";
import { deleteUserAndMerchants, signInWithBusiness } from "./helpers";

test("full loop: program → customer sign-up → scan → stamps → reward", async ({ page, browser }) => {
  test.setTimeout(90_000);
  const owner = await signInWithBusiness(page, "Café Boucle");
  try {
    // program: 2 stamps for a reward, no cooldown
    await page.goto("/dashboard/programs/new");
    await page.locator("#name").fill("Carte test");
    await page.locator("#stamps_required").fill("2");
    await page.locator("#reward_title").fill("Café offert");
    await page.locator("#cooldown_minutes").fill("0");
    await page.locator("form button[type=submit]").last().click();
    await page.waitForURL(/programs\/[0-9a-f-]{36}/);
    await page.goto(page.url().split("?")[0] + "?tab=enroll");
    const joinPath = (await page.locator("text=/\\/join\\/[a-z0-9]{8}/").first().textContent())!.match(/\/join\/[a-z0-9]{8}/)![0];

    // customer signs up on their phone
    const customerCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const customer = await customerCtx.newPage();
    await customer.goto(joinPath);
    await customer.locator("#first_name").fill("Sami");
    const phone = `2${String(Date.now()).slice(-7)}`;
    await customer.locator("#phone").fill(phone);
    await customer.locator("form button[type=submit]").click();
    await customer.waitForURL(/\/c\/[A-Za-z0-9_-]{24,}/);
    await expect(customer.locator("main svg").first()).toBeVisible();
    const qrResponse = await customer.request.get(customer.url().replace(/\/c\/([^?]+).*/, "/api/card/$1/qr"));
    expect(qrResponse.ok()).toBeTruthy();
    expect((await qrResponse.json()).token).toMatch(/^VY1\./);

    // same phone cannot enrol twice (and never gets the card link back)
    const again = await customerCtx.newPage();
    await again.goto(joinPath);
    await again.locator("#first_name").fill("Intrus");
    await again.locator("#phone").fill(phone);
    await again.locator("form button[type=submit]").click();
    await expect(again.getByRole("alert")).toBeVisible();
    await expect(again).toHaveURL(/\/join\//);

    // staff scans (manual entry by phone), stamps twice, redeems the reward
    await page.goto("/scan");
    await page.getByRole("button", { name: /saisie manuelle|manual entry/i }).click();
    await page.locator("input[placeholder='AB23CD45EF']").fill(phone);
    await page.getByRole("button", { name: /rechercher|search/i }).click();
    await expect(page.getByRole("heading", { name: "Sami" })).toBeVisible();
    const stamp = page.getByRole("button", { name: /\+1 (tampon|stamp)/i });
    await stamp.click();
    await expect(page.getByText(/\+1 ajouté|\+1 added/)).toBeVisible();
    await stamp.click();
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: /^(utiliser|redeem)$/i }).click();
    await expect(page.getByText(/récompense validée|reward redeemed/i)).toBeVisible();

    // customer card shows history; dashboard shows the customer
    await customer.reload();
    await expect(customer.getByText(/récompense|reward/i).first()).toBeVisible();
    await page.goto("/dashboard/customers");
    await page.locator("main").getByText("Sami").click();
    await expect(page.getByText(/Carte test/).first()).toBeVisible();
    await customerCtx.close();
  } finally {
    await deleteUserAndMerchants(owner.id);
  }
});
