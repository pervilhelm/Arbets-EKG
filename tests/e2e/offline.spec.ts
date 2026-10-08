import { expect, test } from "@playwright/test";

test("fyndkort, guide och fall fungerar offline efter första besöket", async ({ page, context }) => {
  await page.goto("/");
  // Wait until the service worker has precached everything and controls the page.
  // Evaluated as strings: the e2e tsconfig has no DOM types.
  await page.evaluate("navigator.serviceWorker.ready.then(() => true)");
  await page.reload();
  await expect.poll(() => page.evaluate("!!navigator.serviceWorker.controller")).toBe(true);

  await context.setOffline(true);

  await page.goto("/fynd/svt");
  await expect(page.getByRole("heading", { name: /Supraventrikulär takykardi/, level: 1 })).toBeVisible();
  await expect(page.getByRole("img", { name: /EKG med 12 avledningar/ }).first()).toBeVisible();

  await page.goto("/tolka");
  await expect(page.getByRole("img", { name: /EKG med 12 avledningar/ })).toBeVisible();

  await page.goto("/ova/fall");
  await page.locator('a[href*="/ova/fall/"]').first().click();
  await expect(page.getByRole("img", { name: "Utgångs-EKG med 12 avledningar" })).toBeVisible();
  await page.getByRole("button", { name: "Starta arbetsprovet" }).click();
  await expect(page.getByRole("img", { name: "EKG med 12 avledningar för steget" })).toBeVisible();
});
