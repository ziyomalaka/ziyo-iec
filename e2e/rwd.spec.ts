import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

/**
 * Public RWD smoke — credentials talab qilinmaydi.
 * npm run test:e2e -- e2e/rwd.spec.ts
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
];

async function pageOverflowX(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return Math.max(doc.scrollWidth, body.scrollWidth) - Math.max(doc.clientWidth, body.clientWidth);
  });
}

async function assertNoOverflow(page: Page, route: string, width: number) {
  const res = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(res, `no response for ${route}`).toBeTruthy();
  expect(res!.status()).toBeLessThan(500);
  await page.waitForTimeout(200);
  const extra = await pageOverflowX(page);
  expect(extra, `${route} @ ${width}px overflow ${extra}px`).toBeLessThanOrEqual(1);
}

test.describe("RWD overflow — 320px all public pages", () => {
  test.use({ viewport: { width: 320, height: 568 } });
  for (const route of PUBLIC) {
    test(`${route}`, async ({ page }) => {
      await assertNoOverflow(page, route, 320);
    });
  }
});

test.describe("RWD overflow — core viewports on home + login", () => {
  const routes = ["/uz", "/uz/kirish"];
  const viewports = [
    { width: 375, height: 667 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ];

  for (const viewport of viewports) {
    test.describe(`${viewport.width}x${viewport.height}`, () => {
      test.use({ viewport });
      for (const route of routes) {
        test(`${route}`, async ({ page }) => {
          await assertNoOverflow(page, route, viewport.width);
        });
      }
    });
  }
});

test.describe("RWD screenshots — core public pages", () => {
  const pages = [
    { path: "/uz", slug: "home" },
    { path: "/uz/kirish", slug: "login" },
    { path: "/uz/yonalishlar/pedagogika", slug: "directions" },
  ];
  const shots = [
    { name: "mobile", width: 375, height: 667 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1440, height: 900 },
  ];

  for (const viewport of shots) {
    test.describe(viewport.name, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });
      for (const pageInfo of pages) {
        test(`${pageInfo.slug}`, async ({ page }) => {
          await page.goto(pageInfo.path, { waitUntil: "domcontentloaded" });
          await page.waitForTimeout(300);
          await page.screenshot({
            path: path.join("test-results", "rwd", `${pageInfo.slug}-${viewport.name}.png`),
            fullPage: true,
          });
        });
      }
    });
  }
});

test.describe("RWD public header drawer", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("hamburger opens overlay drawer and closes with Escape", async ({ page }) => {
    await page.goto("/uz", { waitUntil: "domcontentloaded" });
    const menu = page.getByRole("button", { name: /Menyuni ochish|Открыть меню/i });
    await expect(menu).toBeVisible();
    await expect(page.getByRole("link", { name: /Kirish|Войти/i }).first()).toBeVisible();
    await menu.click();
    await expect(page.getByRole("dialog", { name: /Menyu|Меню/i })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: /Menyu|Меню/i })).toHaveCount(0);
  });
});
