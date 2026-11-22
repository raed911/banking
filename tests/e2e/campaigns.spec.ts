import { expect, test } from "@playwright/test";
import { deleteUserAndMerchants, signInWithBusiness } from "./helpers";

test("merchant builds an audience and schedules a campaign (queued until the channel is connected)", async ({ page }) => {
  test.setTimeout(90_000);
  const owner = await signInWithBusiness(page, "Café Campagne");
  try {
    // two customers: one with marketing consent and email, one without consent
    for (const [name, email, consent] of [["Amel", `amel-${Date.now()}@test.vayro.app`, true], ["Karim", `karim-${Date.now()}@test.vayro.app`, false]] as const) {
      await page.goto("/dashboard/customers?new=1");
      await page.locator("#first_name").fill(name);
      await page.locator("#c-email").fill(email);
      if (consent) await page.locator("input[name=marketing_consent]").check();
      await page.locator("[role=dialog] button[type=submit]").click();
      await page.waitForURL(/customers\/[0-9a-f-]{36}/);
    }
    await page.goto("/dashboard/campaigns");
    await page.getByRole("button", { name: /nouvelle campagne|new campaign/i }).first().click();
    await page.locator("#cp-name").fill("Bienvenue");
    await page.getByRole("button", { name: /^email$/i }).click();
    await page.locator("#cp-seg").selectOption("all");
    await expect(page.getByText(/^1 (destinataires|recipients)/)).toBeVisible();
    await page.locator("#cp-subj").fill("Un cadeau pour vous");
    await page.locator("#cp-body").fill("Bonjour {prenom}, un café vous attend.");
    await page.getByRole("button", { name: /programmer l'envoi|schedule sending/i }).click();
    await expect(page.locator("main").getByText("Bienvenue")).toBeVisible();
    await expect(page.locator("main").getByText(/programmée|scheduled/i).first()).toBeVisible();
    await expect(page.locator("main").getByText(/en attente de connexion|waiting for the channel/i)).toBeVisible();
  } finally {
    await deleteUserAndMerchants(owner.id);
  }
});

test("card announcement reaches every customer on their card page", async ({ page, browser }) => {
  test.setTimeout(120_000);
  const owner = await signInWithBusiness(page, "Café Annonce");
  try {
    await page.goto("/dashboard/programs/new");
    await page.locator("#name").fill("Carte café");
    await page.locator("form button[type=submit]").last().click();
    await page.waitForURL(/programs\/[0-9a-f-]{36}/);
    await page.goto(page.url().split("?")[0] + "?tab=enroll");
    const joinPath = (await page.locator("text=/\\/join\\/[a-z0-9]{8}/").first().textContent())!.match(/\/join\/[a-z0-9]{8}/)![0];
    const ctx = await browser.newContext({ extraHTTPHeaders: { "x-real-ip": `10.7.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
    const customer = await ctx.newPage();
    await customer.goto(joinPath);
    await customer.locator("#first_name").fill("Nour");
    await customer.locator("#phone").fill(`2${String(Date.now()).slice(-7)}`);
    await customer.locator("input[name=consent]").check();
    await customer.locator("form button[type=submit]").click();
    await customer.waitForURL(/\/c\//);

    await page.goto("/dashboard/campaigns");
    await page.getByRole("button", { name: /nouvelle campagne|new campaign/i }).first().click();
    await page.locator("#cp-name").fill("Promo café");
    await page.locator("#cp-seg").selectOption("all");
    await page.locator("#cp-body").fill("-20% sur le cappuccino, {prenom} ☕");
    await page.getByRole("button", { name: /programmer l'envoi|schedule sending/i }).click();
    await expect(page.locator("main").getByText("Promo café")).toBeVisible({ timeout: 15_000 });
    await expect(async () => { await page.reload(); await expect(page.locator("main").getByText(/^(Envoyée|Sent)$/).first()).toBeVisible({ timeout: 1000 }); }).toPass({ timeout: 30_000 });

    await customer.reload();
    await expect(customer.getByText("-20% sur le cappuccino, Nour ☕")).toBeVisible();
    await ctx.close();
  } finally {
    await deleteUserAndMerchants(owner.id);
  }
});

test("merchant enables the automatic win-back message", async ({ page }) => {
  const owner = await signInWithBusiness(page, "Café Relance");
  try {
    await page.goto("/dashboard/campaigns");
    const card = page.locator("form").filter({ has: page.locator("#winback-days") });
    await card.locator("#winback-days").fill("21");
    await card.locator("#winback-msg").fill("Vous nous manquez {prenom} 💚 -50% pour votre retour !");
    await card.getByRole("switch").click();
    await card.locator("button[type=submit]").click();
    await expect(card.getByRole("status")).toBeVisible();
    await page.reload();
    await expect(page.locator("#winback-days")).toHaveValue("21");
    await expect(page.locator("form").filter({ has: page.locator("#winback-days") }).getByRole("switch")).toHaveAttribute("data-state", "checked");
  } finally {
    await deleteUserAndMerchants(owner.id);
  }
});
