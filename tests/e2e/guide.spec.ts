import { expect, test } from "@playwright/test";

test("tolkningsguiden går igenom sju steg med 12-avlednings-EKG", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await page.getByRole("link", { name: "Tolka" }).click();
  await expect(page.getByRole("heading", { name: "1. Frekvens" })).toBeVisible();
  await expect(page.getByRole("img", { name: /EKG med 12 avledningar/ })).toBeVisible();
  for (let i = 0; i < 6; i++) await page.getByRole("button", { name: "Nästa" }).click();
  await expect(page.getByRole("heading", { name: "7. T-våg" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Nästa" })).toBeDisabled();
  expect(errors).toEqual([]);
});
