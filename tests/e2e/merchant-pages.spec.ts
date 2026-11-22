import { expect, test } from "@playwright/test";
import { deleteUserAndMerchants, signInWithBusiness } from "./helpers";

test("merchant modules: coupons, billing, locations, settings, transactions, rewards", async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const owner = await signInWithBusiness(page, "Épicerie Test");
  try {
    // coupon
    await page.goto("/dashboard/coupons");
    await page.getByRole("button", { name: /nouveau coupon|new coupon/i }).click();
    await page.locator("#c-name").fill("Bienvenue");
    await page.locator("#c-code").fill("WELCOME10");
    await page.locator("#c-value").fill("10");
    await page.locator("[role=dialog] button[type=submit]").click();
    await expect(page.getByText("WELCOME10")).toBeVisible();

    // billing: request an invoice
    await page.goto("/dashboard/billing");
    await page.getByRole("button", { name: /demander la facture|request invoice/i }).click();
    await expect(page.getByText(/VAY-\d{4}-\d{6}/).first()).toBeVisible();

    // locations: second location blocked by the 1-location plan
    await page.goto("/dashboard/locations");
    await page.getByRole("button", { name: /ajouter un point de vente|add location/i }).click();
    await page.locator("#l-name").fill("Deuxième boutique");
    await page.locator("[role=dialog] button[type=submit]").click();
    await expect(page.locator("[role=dialog]").getByRole("alert")).toBeVisible();
    await page.keyboard.press("Escape");

    // settings
    await page.goto("/dashboard/settings");
    await page.locator("#city").fill("Sfax");
    await page.locator("form button[type=submit]").last().click();
    await expect(page.getByRole("status")).toBeVisible();

    for (const path of ["/dashboard/transactions", "/dashboard/transactions?tab=fraud", "/dashboard/rewards", "/dashboard"]) {
      await page.goto(path);
      await expect(page.locator("main h1").first()).toBeVisible();
    }
    expect(errors).toEqual([]);
  } finally {
    await deleteUserAndMerchants(owner.id);
  }
});
