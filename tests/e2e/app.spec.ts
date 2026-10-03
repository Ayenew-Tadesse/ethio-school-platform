import { expect, test, type Page } from "@playwright/test";

const noOverflow = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

async function demo(page: Page, role: "admin" | "teacher" | "student" | "parent") {
  await page.goto("/login");
  await page.click(`[data-demo=${role}]`);
  await expect(page.locator("main#main h1")).toBeVisible();
}

test("landing page: headline, both calls to action, no sideways scroll", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("One Platform for the Entire School");
  await expect(page.getByRole("link", { name: "Request a School Demo" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Explore Platform/ })).toBeVisible();
  await noOverflow(page);
  await page.goto("/why");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Why Schools Choose the Platform");
  await noOverflow(page);
});

test("signed out: the app sends you to sign in", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login$/);
});

test("demo password sign-in works and a wrong one is refused", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", "student@example.com");
  await page.fill("#password", "wrong");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Email or password is not correct.")).toBeVisible();
  await page.fill("#password", "Demo@2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("main#main h1")).toHaveText("Hello, Liya");
});

for (const [role, heading, sees] of [
  ["admin", "Hello, Tigist", "Students requiring academic attention"],
  ["teacher", "Hello, Meron", "Today's classes"],
  ["student", "Hello, Liya", "Subject performance"],
  ["parent", "Hello, Getachew", "Teacher feedback"],
] as const) {
  test(`${role} dashboard`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await demo(page, role);
    await expect(page.locator("main#main h1")).toHaveText(heading);
    await expect(page.getByRole("heading", { name: sees })).toBeVisible();
    await noOverflow(page);
    expect(errors).toEqual([]);
  });
}

test("each role gets its own menu", async ({ page }) => {
  await demo(page, "student");
  const w = page.viewportSize()!.width;
  if (w < 1024) await page.getByRole("button", { name: "More" }).click();
  await expect(page.getByRole("link", { name: "Settings" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Library" }).first()).toBeVisible();
});

test("a parent sees only their own children", async ({ page }) => {
  await demo(page, "parent");
  const tabs = page.getByRole("tablist", { name: "My Children" }).getByRole("tab");
  await expect(tabs).toHaveCount(2);
  await tabs.nth(1).click();
  await expect(page.locator("main#main p").first()).toContainText("Natnael");
});

test("switching to Amharic translates the interface", async ({ page }) => {
  await demo(page, "student");
  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitemradio", { name: "አማርኛ" }).click();
  await expect(page.locator("main#main h1")).toHaveText("ሰላም፣ Liya");
  await expect(page.locator("html")).toHaveAttribute("lang", "am");
});
