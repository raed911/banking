import { expect, test } from "@playwright/test";
import { admin, createConfirmedUser, deleteUserAndMerchants, enrollTotp, signInWithBusiness, totp } from "./helpers";

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
    // an admin without 2FA is sent to set it up
    await page.goto("/login");
    await page.locator("#email").fill(boss.email);
    await page.locator("#password").fill(boss.password);
    await page.locator("button[type=submit]").click();
    await page.waitForURL(/\/(onboarding|dashboard)/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/account\?require=mfa/);
    await page.context().clearCookies();

    // with 2FA enrolled, login asks for the code, then the admin area opens
    const secret = await enrollTotp(boss.email, boss.password);
    await page.goto("/login?next=%2Fadmin");
    await page.locator("#email").fill(boss.email);
    await page.locator("#password").fill(boss.password);
    await page.locator("button[type=submit]").click();
    await page.waitForURL(/\/account\/mfa/);
    await page.getByLabel(/code|الرمز/i).fill(totp(secret));
    await page.getByRole("button", { name: /continuer|continue|متابعة/i }).click();
    await page.waitForURL(/\/admin$/);
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
