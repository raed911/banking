import { expect, test } from "@playwright/test";
import { deleteUserAndMerchants, signInWithBusiness } from "./helpers";

test("merchant configures a proximity zone and a location campaign", async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const owner = await signInWithBusiness(page, "Café Proximité");
  try {
    await page.goto("/dashboard/location-marketing");
    await expect(page.locator(".leaflet-container")).toBeVisible();
    await page.locator("input[id^=lat-]").fill("36.806500");
    await page.locator("input[id^=lng-]").fill("10.181500");
    await page.locator("input[id^=m-]").fill("☕ Votre café offert vous attend !");
    await page.getByRole("switch").click();
    await page.getByRole("button", { name: /enregistrer la zone|save zone/i }).click();
    await expect(page.getByRole("status")).toContainText(/zone/i);
    await page.reload();
    await expect(page.locator("input[id^=m-]")).toHaveValue("☕ Votre café offert vous attend !");
    await expect(page.getByRole("switch")).toHaveAttribute("data-state", "checked");

    await page.goto("/dashboard/location-marketing?tab=campaigns");
    await page.getByRole("button", { name: /nouvelle campagne|new campaign/i }).click();
    await page.locator("#lc-name").fill("Happy hour");
    await page.locator("#lc-msg").fill("-20% sur tout, maintenant !");
    await page.getByRole("button", { name: /programmer|schedule/i }).click();
    await expect(page.locator("main").getByText("Happy hour")).toBeVisible();
    await expect(page.locator("main").getByText(/en cours|running/i).first()).toBeVisible();

    await page.goto("/dashboard/location-marketing?tab=how");
    await expect(page.locator("main").getByText(/Apple Wallet/).first()).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await deleteUserAndMerchants(owner.id);
  }
});
