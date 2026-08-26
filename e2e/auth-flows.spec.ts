import { test, expect } from "@playwright/test";

/**
 * Authenticated flows — env kerak:
 *   E2E_STUDENT_EMAIL
 *   E2E_STUDENT_PASSWORD
 *   E2E_STAFF_NICKNAME (optional, role=it|boshqaruv|nazoratchi)
 *   E2E_STAFF_PASSWORD
 *
 * Credentials bo'lmasa testlar skip qilinadi (production data buzilmaydi).
 */

const email = process.env.E2E_STUDENT_EMAIL;
const password = process.env.E2E_STUDENT_PASSWORD;
const staffNick = process.env.E2E_STAFF_NICKNAME;
const staffPass = process.env.E2E_STAFF_PASSWORD;

test.describe("Student learning regression", () => {
  test.skip(!email || !password, "Set E2E_STUDENT_EMAIL / E2E_STUDENT_PASSWORD");

  test("login → dashboard → learning menu reachable", async ({ page }) => {
    await page.goto("/uz/kirish");
    await page.getByLabel(/email|pochta/i).fill(email!);
    // Fallback selectors for Uzbek UI
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passInput = page.locator('input[type="password"]').first();
    await emailInput.fill(email!);
    await passInput.fill(password!);
    await page.getByRole("button", { name: /kirish|login/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });

    await page.goto("/uz/dashboard/learning");
    await expect(page.locator("body")).not.toContainText(/Application error/i);

    await page.goto("/uz/dashboard/results");
    await expect(page.locator("body")).toContainText(/Natijalarim|natija/i);
  });
});

test.describe("Staff admin regression", () => {
  test.skip(!staffNick || !staffPass, "Set E2E_STAFF_NICKNAME / E2E_STAFF_PASSWORD");

  test("staff login lands on admin area", async ({ page }) => {
    await page.goto("/uz/kirish");
    const nick = page.locator('input[name="nickname"], input[placeholder*="nickname" i], input').first();
    // Staff UI often uses nickname field — try both
    const inputs = page.locator("input");
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
    await page.locator('input[type="password"]').fill(staffPass!);
    // Nickname: first non-password text input
    const textInputs = page.locator('input:not([type="password"])');
    await textInputs.first().fill(staffNick!);
    await page.getByRole("button", { name: /kirish|login/i }).click();
    await page.waitForURL(/\/admin/, { timeout: 30_000 });
    expect(page.url()).toMatch(/\/admin/);
  });
});
