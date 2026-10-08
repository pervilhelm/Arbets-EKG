import { expect, test, type Page } from "@playwright/test";

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

test("ett fall spelas till genomgång med rätt bedömning", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await page.getByRole("link", { name: "Öva" }).click();
  await page.getByRole("link", { name: /Fallövningar/ }).click();
  await page.getByRole("link", { name: /Extraslag efter hjärtinfarkt/ }).click();
  await expect(page.getByRole("img", { name: "Utgångs-EKG med 12 avledningar" })).toBeVisible();
  await page.getByRole("button", { name: "Starta arbetsprovet" }).click();

  await expect(page.getByRole("heading", { name: "Belastning 75 W · 3:20" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Monitor, rytmremsa avledning II" })).toBeVisible();
  await page.getByRole("button", { name: "Fortsätt" }).click();
  await expect(page.getByRole("heading", { name: "Belastning 125 W · 7:00" })).toBeVisible();
  await page.getByRole("button", { name: "Markera fynd" }).click();
  await expect(page.getByText("Jag blir så konstig i huvudet.")).toBeVisible();
  await page.getByRole("button", { name: "Avbryt testet" }).click();

  await expect(page.getByRole("heading", { name: "Genomgång" })).toBeVisible();
  await expect(page.getByText("3 av 3 steg rätt. Du avbröt testet i steg 3.")).toBeVisible();
  await expect(page.getByText("Rätt", { exact: true })).toHaveCount(3);
  await expect(page.getByRole("link", { name: "Ihållande ventrikeltakykardi" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("ett missat avbrott avslutar fallet och visas i genomgången", async ({ page }) => {
  await page.goto("/ova/fall/yrsel");
  await page.getByRole("button", { name: "Starta arbetsprovet" }).click();
  for (let i = 0; i < 3; i++) {
    await expect(page.getByText(`Steg ${i + 1} av 3`)).toBeVisible();
    await page.getByRole("button", { name: "Fortsätt" }).click();
  }
  await expect(page.getByText("1 av 3 steg rätt. Testet borde ha avbrutits i steg 3.")).toBeVisible();
  await expect(page.getByText("Missat fynd", { exact: true })).toBeVisible();
  await expect(page.getByText("Missat avbrott", { exact: true })).toBeVisible();
});

test("ett quizpass på 10 frågor slutförs", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/ova");
  await page.getByRole("link", { name: /Quiz/ }).click();
  for (let i = 1; i <= 10; i++) {
    await expect(page.getByText(`Fråga ${i} av 10`)).toBeVisible();
    await page.getByRole("group", { name: "Svarsalternativ" }).getByRole("button").first().click();
    await expect(page.getByRole("status")).toContainText(/Rätt!|Fel\. Rätt svar/);
    await page.getByRole("button", { name: i < 10 ? "Nästa fråga" : "Visa resultat" }).click();
  }
  await expect(page.getByText(/Du fick \d+ av 10 rätt\./)).toBeVisible();
  await expect(page.getByRole("button", { name: "Nytt pass" })).toBeVisible();
  expect(errors).toEqual([]);
});
