import { expect, test } from "@playwright/test";
import { createConfirmedUser, deleteUserAndMerchants } from "./helpers";

test.describe("authentication & onboarding", () => {
  test("protected routes redirect to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  });

  test("wrong password shows an error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("nobody@test.vayro.app");
    await page.locator("#password").fill("wrong-password-1");
    await page.getByRole("button", { name: /se connecter|sign in/i }).click();
    await expect(page.getByRole("alert")).toBeVisible();
  });

  test("sign in → create business → dashboard", async ({ page }) => {
    const user = await createConfirmedUser();
    try {
      await page.goto("/login");
      await page.getByLabel(/email/i).fill(user.email);
      await page.locator("#password").fill(user.password);
      await page.getByRole("button", { name: /se connecter|sign in/i }).click();
      await expect(page).toHaveURL(/\/onboarding/);

      await page.locator("#name").fill("Café E2E");
      await page.getByText(/boulangerie|bakery/i).click();
      await page.locator("#phone").fill("20 123 456");
      await page.getByRole("button", { name: /créer mon espace|create my workspace/i }).click();
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.getByTestId("dashboard-title")).toHaveText("Café E2E");

      // signed-in users are sent away from the login page
      await page.goto("/login");
      await expect(page).toHaveURL(/\/dashboard/);
    } finally {
      await deleteUserAndMerchants(user.id);
    }
  });
});
