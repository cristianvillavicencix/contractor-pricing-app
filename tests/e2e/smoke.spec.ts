import { expect, test } from "@playwright/test";

test.describe("public / auth shell", () => {
  test("login page shows email and password fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("unauthenticated user is redirected from app to login", async ({ page }) => {
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/login/);
  });
});
