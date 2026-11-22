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
