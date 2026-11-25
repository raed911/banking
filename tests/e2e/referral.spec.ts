import { expect, test } from "@playwright/test";
import { admin, deleteUserAndMerchants, signInWithBusiness } from "./helpers";

const ip = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;

test("referral: personal link → friend signs up → first visit rewards both, once", async ({ page, browser }, info) => {
  test.skip(info.project.name !== "desktop", "phones are emulated inside the test");
  test.setTimeout(120_000);
  const owner = await signInWithBusiness(page, "Café Parrain");
  try {
    await page.goto("/dashboard/programs/new");
    await page.locator("#name").fill("Carte amis");
    await page.locator("#stamps_required").fill("6");
    await page.locator("#reward_title").fill("Café offert");
    await page.locator("#cooldown_minutes").fill("0");
    await expect(page.locator("#referral_enabled")).toBeChecked();
    await page.locator("form button[type=submit]").last().click();
    await page.waitForURL(/programs\/[0-9a-f-]{36}/);
    await page.goto(page.url().split("?")[0] + "?tab=enroll");
    const joinPath = (await page.locator("text=/\\/join\\/[a-z0-9]{8}/").first().textContent())!.match(/\/join\/[a-z0-9]{8}/)![0];

    // Sami signs up and gets a personal invitation link
    const samiCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, extraHTTPHeaders: { "x-real-ip": ip() } });
    const sami = await samiCtx.newPage();
    await sami.goto(joinPath);
    await sami.locator("#first_name").fill("Sami");
    const samiPhone = `2${String(Date.now()).slice(-7)}`;
    await sami.locator("#phone").fill(samiPhone);
    await sami.locator("form button[type=submit]").click();
    await sami.waitForURL(/\/c\//);
    await expect(sami.getByRole("heading", { name: /invitez un ami|invite a friend/i })).toBeVisible();
    const inviteUrl = (await sami.locator("section span.font-mono").first().textContent())!.trim();
    expect(inviteUrl).toMatch(/\/join\/[a-z0-9]{8}\?ref=[A-Z2-9]{8}$/);

    // Lina opens Sami's link, sees who invited her, signs up
    const linaCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, extraHTTPHeaders: { "x-real-ip": ip() } });
    const lina = await linaCtx.newPage();
    await lina.goto(new URL(inviteUrl).pathname + new URL(inviteUrl).search);
    await expect(lina.getByText(/Sami vous invite|Sami invited you/)).toBeVisible();
    await lina.locator("#first_name").fill("Lina");
    const linaPhone = `5${String(Date.now()).slice(-7)}`;
    await lina.locator("#phone").fill(linaPhone);
    await lina.locator("form button[type=submit]").click();
    await lina.waitForURL(/\/c\//);

    const { data: linaCust } = await admin().from("customers").select("id").eq("phone", `+216${linaPhone}`).single();
    const { data: samiCust } = await admin().from("customers").select("id").eq("phone", `+216${samiPhone}`).single();
    await page.goto(`/dashboard/customers/${linaCust!.id}`);
    await expect(page.getByTestId("referrals")).toContainText(/Sami/);
    await expect(page.getByTestId("referrals")).toContainText(/attente|waiting/i);

    // Lina's first visit: staff adds one stamp → +1 bonus for Lina and for Sami
    await page.goto("/scan");
    await page.getByRole("button", { name: /saisie manuelle|manual entry/i }).click();
    await page.locator("input[placeholder='AB23CD45EF']").fill(linaPhone);
    await page.getByRole("button", { name: /rechercher|search/i }).click();
    await page.getByRole("button", { name: /\+1 (tampon|stamp)/i }).click();
    await expect(page.getByText(/\+1 ajouté|\+1 added/)).toBeVisible();
    const balance = async (customerId: string) => (await admin().from("loyalty_cards").select("balance").eq("customer_id", customerId).single()).data?.balance;
    await expect.poll(() => balance(linaCust!.id)).toBe(2);
    await expect.poll(() => balance(samiCust!.id)).toBe(1);

    // second visit: only the visit counts, Sami is not rewarded again
    await page.getByRole("button", { name: /\+1 (tampon|stamp)/i }).click();
    await expect.poll(() => balance(linaCust!.id)).toBe(3);
    expect(await balance(samiCust!.id)).toBe(1);

    await page.goto(`/dashboard/customers/${samiCust!.id}`);
    await expect(page.getByTestId("referrals")).toContainText(/Lina/);
    await expect(page.getByTestId("referrals")).toContainText(/validé|completed/i);
    await sami.reload();
    await expect(sami.getByText(/1 ami invité · 1 venu|1 friend invited · 1 came/)).toBeVisible();
    await samiCtx.close(); await linaCtx.close();
  } finally {
    await deleteUserAndMerchants(owner.id);
  }
});
