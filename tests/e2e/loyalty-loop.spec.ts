import { expect, test } from "@playwright/test";
import { admin, deleteUserAndMerchants, signInWithBusiness } from "./helpers";

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
    const customerCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, extraHTTPHeaders: { "x-real-ip": `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
    const customer = await customerCtx.newPage();
    await customer.goto(joinPath);
    await customer.locator("#first_name").fill("Sami");
    const phone = `2${String(Date.now()).slice(-7)}`;
    await customer.locator("#phone").fill(phone);
    await customer.locator("#birthday").selectOption("15");
    await customer.getByLabel("Mois").selectOption("3");
    await customer.locator("form button[type=submit]").click();
    await customer.waitForURL(/\/c\/[A-Za-z0-9_-]{24,}/);
    const { data: saved } = await admin().from("customers").select("birthday").eq("phone", `+216${phone}`).single();
    expect(saved?.birthday).toBe("2000-03-15");
    await expect(customer.locator("main svg").first()).toBeVisible();
    const qr = await customer.evaluate((u) => fetch(u).then((r) => r.json()), new URL(customer.url()).pathname.replace(/^\/c\/([^/]+).*/, "/api/card/$1/qr"));
    expect(qr.token).toMatch(/^VY1\./);

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
    await page.locator("#scan-amount").fill("45,5");
    await stamp.click();
    await expect(page.getByText(/\+1 ajouté|\+1 added/)).toBeVisible();
    await expect(page.getByText(/45\.500 TND/)).toBeVisible();
    await expect(page.locator("#scan-amount")).toHaveValue("");
    await stamp.click();
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: /^(utiliser|redeem)$/i }).click();
    await expect(page.getByText(/récompense validée|reward redeemed/i)).toBeVisible();

    // merchant adds Google Maps + review links → the customer sees both buttons on the card
    await page.goto("/dashboard/settings");
    await page.locator("#review_url").fill("http://not-secure.example");
    await page.locator("form button[type=submit]").last().click();
    await expect(page.getByRole("alert")).toBeVisible();
    await page.locator("#maps_url").fill("https://maps.app.goo.gl/abcDEF123");
    await page.locator("#review_url").fill("https://g.page/r/CabcDEF123/review");
    await page.locator("form button[type=submit]").last().click();
    await expect(page.getByRole("status")).toBeVisible();
    await customer.reload();
    await expect(customer.getByTestId("place-links").getByRole("link", { name: /avis|review/i })).toHaveAttribute("href", "https://g.page/r/CabcDEF123/review");
    await expect(customer.getByTestId("place-links").getByRole("link", { name: /itinéraire|directions/i })).toHaveAttribute("href", "https://maps.app.goo.gl/abcDEF123");

    // customer card shows history; dashboard shows the customer
    await customer.reload();
    await expect(customer.getByText(/récompense|reward/i).first()).toBeVisible();
    await page.goto("/dashboard/customers?sort=spent");
    await expect(page.locator("main li").first()).toContainText(/45,5|45\.5/);
    await page.locator("main").getByText("Sami").click();
    await expect(page.getByText(/Carte test/).first()).toBeVisible();
    await expect(page.getByText(/Total dépensé|Total spent/)).toBeVisible();
    const profileUrl = page.url();

    // coupon: create it, apply it from the customer profile, then once without a card in the scanner
    await page.goto("/dashboard/coupons");
    await page.getByRole("button", { name: /nouveau coupon|new coupon/i }).click();
    await page.locator("#c-name").fill("Boissons -20%");
    await page.locator("#c-code").fill("CAFE20");
    await page.locator("#c-value").fill("20");
    await page.locator("[role=dialog] button[type=submit]").click();
    await expect(page.getByText("CAFE20")).toBeVisible();
    await page.goto(profileUrl);
    await page.getByRole("button", { name: /appliquer un coupon|apply a coupon/i }).click();
    await page.locator("#cp-code").fill("cafe20");
    await page.locator("[role=dialog] button[type=submit]").click();
    await expect(page.getByText(/coupon appliqué|coupon applied/i)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/coupons utilisés|coupons used/i)).toBeVisible();
    await page.goto("/scan");
    await page.getByRole("button", { name: /coupon sans carte|coupon without card/i }).click();
    await page.locator("input[placeholder='CAFE20']").fill("CAFE20");
    await page.getByRole("button", { name: /appliquer|apply/i }).last().click();
    await expect(page.getByRole("status").filter({ hasText: /CAFE20|Boissons/ })).toBeVisible();
    await customerCtx.close();
  } finally {
    await deleteUserAndMerchants(owner.id);
  }
});
