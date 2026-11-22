import { expect, test } from "@playwright/test";
import { admin, createConfirmedUser, deleteUserAndMerchants, signInWithBusiness } from "./helpers";

test("non-admins cannot open the super admin area", async ({ page }) => {
  const user = await signInWithBusiness(page, "Boutique Normale");
  try {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/dashboard/);
  } finally {
    await deleteUserAndMerchants(user.id);
  }
});

test("super admin records a cash payment and activates a subscription", async ({ page, browser }) => {
  test.setTimeout(90_000);
  // a merchant on trial
  const merchantCtx = await browser.newContext();
  const merchantPage = await merchantCtx.newPage();
  const owner = await signInWithBusiness(merchantPage, `Salon Admin ${Date.now()}`);
  await merchantCtx.close();
  // the platform admin
  const boss = await createConfirmedUser("admin");
  await admin().from("platform_admins").insert({ user_id: boss.id, role: "admin" });
  try {
    await page.goto("/login");
    await page.locator("#email").fill(boss.email);
    await page.locator("#password").fill(boss.password);
    await page.locator("button[type=submit]").click();
    await page.waitForURL(/\/(onboarding|dashboard)/);
    await page.goto("/admin");
    await expect(page.getByText(/MRR/)).toBeVisible();
    await page.goto("/admin/merchants?q=Salon%20Admin");
    await page.locator("main a[href*='/admin/merchants/']").first().click();
    await page.waitForURL(/admin\/merchants\/[0-9a-f-]{36}/);
    await page.locator("#price_id").selectOption({ index: 1 });
    await page.locator("#reference").fill("REC-0001");
    await page.locator("form button[type=submit]").click();
    await expect(page.getByRole("status")).toBeVisible();
    await page.reload();
    await expect(page.getByText("REC-0001")).toBeVisible();
    await expect(page.locator("main").getByText(/^(Actif|Active)$/).first()).toBeVisible();
  } finally {
    await admin().from("platform_admins").delete().eq("user_id", boss.id);
    await deleteUserAndMerchants(owner.id);
    await deleteUserAndMerchants(boss.id);
  }
});
