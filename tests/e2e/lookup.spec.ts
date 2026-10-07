import { expect, test } from "@playwright/test";

test("startsida till fyndkort med 12-avlednings-EKG på två tryck", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await page.getByRole("link", { name: /^Avbryt/ }).click();
  await page.getByRole("link", { name: /AV-block II eller III/ }).click();

  await expect(page.getByRole("heading", { name: /AV-block II eller III/, level: 1 })).toBeVisible();
  await expect(page.getByText("Ej granskad")).toBeVisible();
  await expect(page.getByRole("img", { name: /EKG med 12 avledningar: exempel på av-block/i })).toBeVisible();
  expect(errors).toEqual([]);
});

test("sökfältet hittar fynd via alias", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Sök fynd").fill("PSVT");
  await page.getByRole("link", { name: /Supraventrikulär takykardi/ }).click();
  await expect(page.getByRole("tab", { name: "Syntetiskt" })).toBeVisible();
});
