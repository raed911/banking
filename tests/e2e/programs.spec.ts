import { expect, test } from "@playwright/test";
import { deleteUserAndMerchants, signInWithBusiness } from "./helpers";

test("create a stamp program, design the card, manage rewards and sign-up link", async ({ page }) => {
  const user = await signInWithBusiness(page);
  try {
    await page.goto("/dashboard/programs");
    await page.getByRole("link", { name: /nouveau programme|new program/i }).first().click();
    await page.waitForURL(/programs\/new/);
    await page.waitForLoadState("load");
    await page.locator("#name").fill("Carte café");
    await page.locator("#stamps_required").fill("8");
    await page.locator("#reward_title").fill("Café offert");
    await page.locator("form button[type=submit]").last().click();
    await page.waitForURL(/programs\/[0-9a-f-]{36}/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Carte café");

    // designer: apply a preset and save
    await page.getByRole("button", { name: "Espresso" }).click();
    await page.getByRole("button", { name: /enregistrer|save/i }).click();
    await expect(page.getByRole("status")).toBeVisible();

    // default reward exists with cost 8
    await page.goto(page.url().split("?")[0] + "?tab=rewards");
    await expect(page.getByText("Café offert")).toBeVisible();
    await expect(page.getByText(/^8/).first()).toBeVisible();

    // enrolment link with QR
    await page.goto(page.url().split("?")[0] + "?tab=enroll");
    await expect(page.locator("text=/\\/join\\/[a-z0-9]{8}/")).toBeVisible();
    await expect(page.locator("main [class*=aspect-square] svg").first()).toBeVisible();

    // list shows the program
    await page.goto("/dashboard/programs");
    await expect(page.locator("main").getByText("Carte café")).toBeVisible();
  } finally {
    await deleteUserAndMerchants(user.id);
  }
});
