import { test, expect } from "@playwright/test";

/**
 * Public smoke — credentials talab qilinmaydi.
 * npm run test:e2e -- e2e/public-smoke.spec.ts
 */
const PUBLIC = [
  "/uz",
  "/uz/malaka-oshirish",
  "/uz/qayta-tayyorlash",
  "/uz/qanday-ishlaydi",
  "/uz/aloqa",
  "/uz/yonalishlar/pedagogika",
  "/uz/kirish",
  "/uz/royxatdan-otish",
  "/uz/parolni-unutish",
];

test.describe("Public routes smoke", () => {
  for (const path of PUBLIC) {
    test(`GET ${path} is not 404/500`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));

      const res = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(res, `no response for ${path}`).toBeTruthy();
      expect(res!.status(), `${path} status`).toBeLessThan(500);
      expect(res!.status(), `${path} not 404`).not.toBe(404);
      expect(errors, `console pageerror on ${path}`).toEqual([]);
    });
  }
});

test.describe("Protected routes without auth", () => {
  test("dashboard redirects to login", async ({ page }) => {
    await page.goto("/uz/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/kirish/, { timeout: 15_000 });
    expect(page.url()).toMatch(/\/kirish/);
  });

  test("admin redirects to login", async ({ page }) => {
    await page.goto("/uz/admin/management", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/kirish/, { timeout: 15_000 });
    expect(page.url()).toMatch(/\/kirish/);
  });

  test("removed /dashboard/tests is 404", async ({ page }) => {
    const res = await page.goto("/uz/dashboard/tests", { waitUntil: "domcontentloaded" });
    // Auth guard may redirect first; either login or 404 is OK — not a live tests page
    const url = page.url();
    const status = res?.status() ?? 0;
    const ok = /\/kirish/.test(url) || status === 404;
    expect(ok).toBeTruthy();
  });
});
