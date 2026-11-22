import { expect, test } from "@playwright/test";
import { createConfirmedUser, deleteUserAndMerchants, signInWithBusiness } from "./helpers";

test("owner invites a cashier who accepts and only sees the cashier tools", async ({ page, browser }) => {
  test.setTimeout(90_000);
  const owner = await signInWithBusiness(page, "Café Équipe");
  const cashier = await createConfirmedUser("cashier");
  try {
    await page.goto("/dashboard/employees");
    await page.getByRole("button", { name: /inviter un employé|invite an employee/i }).click();
    await page.locator("#inv-email").fill(cashier.email);
    await page.locator("[role=dialog] button[type=submit]").click();
    const link = (await page.locator("[role=dialog] .font-mono").textContent())!.trim();
    expect(link).toMatch(/\/invite\/[A-Za-z0-9_-]{20,}$/);

    const ctx = await browser.newContext();
    const p2 = await ctx.newPage();
    await p2.goto(new URL(link).pathname);
    await p2.getByRole("link", { name: /se connecter|sign in/i }).click();
    await p2.locator("#email").fill(cashier.email);
    await p2.locator("#password").fill(cashier.password);
    await p2.locator("button[type=submit]").click();
    await p2.waitForURL(/\/invite\//);
    await p2.getByRole("button", { name: /accepter|accept/i }).click();
    // cashiers land on the scanner (no dashboard.view permission)
    await p2.waitForURL(/\/(scan|dashboard)/);
    await p2.goto("/dashboard/billing");
    await p2.waitForURL(/\/scan/); // billing denied → dashboard → cashiers land on the scanner
    await p2.waitForLoadState("load");
    await p2.goto("/dashboard/customers");
    await expect(p2.locator("main h1")).toBeVisible();
    await ctx.close();

    await page.reload();
    await expect(page.getByText(cashier.email)).toBeVisible();
  } finally {
    await deleteUserAndMerchants(owner.id);
    await deleteUserAndMerchants(cashier.id);
  }
});
