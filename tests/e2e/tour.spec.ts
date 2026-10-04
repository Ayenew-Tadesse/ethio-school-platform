import { expect, test, type Page } from "@playwright/test";

// The guided demo tour: ten stops across the four roles, at every width.
const card = (page: Page) => page.getByRole("dialog", { name: /./ }).filter({ has: page.locator("[data-tour-next]") });
const stepLine = (page: Page) => card(page).locator("p").first();

test("the tour walks through all four roles and ends", async ({ page }) => {
  await page.goto("/login");
  await page.click("[data-tour-start]");
  // Stop 1: the administrator's dashboard, with the school's numbers highlighted.
  await expect(stepLine(page)).toHaveText(/Step 1 of 10 · Administrator/);
  await expect(page.locator("#tour-title")).toHaveText("The whole school at a glance");
  await expect(page.locator("[data-tour-highlight]")).toBeVisible();
  await expect(page.locator("[data-tour-back]")).toBeDisabled();
  await expect(page.locator("[data-tour-next]")).toBeFocused();

  const expected = [
    ["2", "Administrator", "/app/teachers"], ["3", "Administrator", "/app/reports"],
    ["4", "Teacher", "/app/attendance"], ["5", "Teacher", "/app/assignments/new"], ["6", "Teacher", "/app"],
    ["7", "Student", "/app/assignments"], ["8", "Student", "/app/grades"],
    ["9", "Parent", "/app"], ["10", "Parent", "/app/messages"],
  ];
  for (const [n, role, path] of expected) {
    await page.click("[data-tour-next]");
    await expect(stepLine(page)).toHaveText(new RegExp(`Step ${n} of 10 · ${role}`));
    await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, "\\/")}$`));
    await expect(page.locator("[data-tour-highlight]")).toBeVisible();
    // The card is always fully on screen.
    const box = await card(page).boundingBox(), vp = page.viewportSize()!;
    expect(box!.y >= 0 && box!.y + box!.height <= vp.height && box!.x >= 0 && box!.x + box!.width <= vp.width, `stop ${n}`).toBe(true);
  }
  await expect(page.locator("[data-tour-next]")).toHaveText("Finish");
  // Back goes one stop back.
  await page.click("[data-tour-back]");
  await expect(stepLine(page)).toHaveText(/Step 9 of 10 · Parent/);
  await page.click("[data-tour-next]");
  await page.click("[data-tour-next]");
  await expect(page.locator("[data-tour-overlay]")).toHaveCount(0);
  await expect(page.getByText("That's the tour.")).toBeVisible();
});

test("the tour can be ended early, and the highlight never covers the card on a phone", async ({ page }, info) => {
  await page.goto("/login");
  await page.click("[data-tour-start]");
  await expect(stepLine(page)).toHaveText(/Step 1 of 10/);
  await page.click("[data-tour-next]");
  await expect(stepLine(page)).toHaveText(/Step 2 of 10/);
  // Once the page has settled, nothing scrolls sideways and the card fits on screen.
  await expect(page.locator("[data-tour-highlight]")).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const c = document.querySelector("[data-tour-overlay] [role=dialog]")!.getBoundingClientRect();
    return document.documentElement.scrollWidth <= innerWidth && c.left >= 0 && c.right <= innerWidth && c.bottom <= innerHeight;
  }), { message: info.project.name }).toBe(true);
  await page.click("[data-tour-end]");
  await expect(page.locator("[data-tour-overlay]")).toHaveCount(0);
  // Escape also ends it.
  await page.goto("/login");
  await page.click("[data-tour-start]");
  await expect(stepLine(page)).toHaveText(/Step 1 of 10/);
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-tour-overlay]")).toHaveCount(0);
});

test("the tour speaks Amharic", async ({ page }, info) => {
  test.skip(info.project.name !== "w390", "one width is enough");
  await page.goto("/login");
  await page.getByRole("button", { name: "አማርኛ" }).click();
  await page.click("[data-tour-start]");
  await expect(page.locator("#tour-title")).toHaveText("ትምህርት ቤቱ በአንድ እይታ");
  await expect(stepLine(page)).toHaveText(/ደረጃ 1 ከ10 · አስተዳዳሪ/);
});
