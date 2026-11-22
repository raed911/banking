import { expect, test } from "@playwright/test";
import { admin } from "./helpers";

test("public website: home, pricing from database, legal, contact form", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await page.goto("/pricing");
  for (const price of ["99", "499", "999"]) await expect(page.locator("main").getByText(price, { exact: true }).first()).toBeVisible();
  await page.goto("/legal/privacy");
  await expect(page.locator("main h1")).toBeVisible();
  await page.goto("/features");
  await expect(page.locator("main h1")).toBeVisible();

  const email = `contact-${Date.now()}@test.vayro.app`;
  await page.context().setExtraHTTPHeaders({ "x-real-ip": `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` });
  await page.goto("/contact");
  await page.locator("#name").fill("Test Contact");
  await page.locator("#email").fill(email);
  await page.locator("#message").fill("Bonjour, je voudrais une démo pour mon café.");
  await page.locator("form button[type=submit]").click();
  await expect(page.getByRole("status")).toContainText(/merci|thank|شكرًا/i);
  const { data } = await admin().from("contact_messages").select("id").eq("email", email);
  expect(data?.length).toBe(1);
  await admin().from("contact_messages").delete().eq("email", email);
});

test("sitemap and robots are served", async ({ page }) => {
  await page.goto("/");
  const [sitemap, robots] = await page.evaluate(() => Promise.all([fetch("/sitemap.xml").then((r) => r.ok), fetch("/robots.txt").then((r) => r.text())]));
  expect(sitemap).toBeTruthy();
  expect(robots).toContain("Disallow: /dashboard");
});
