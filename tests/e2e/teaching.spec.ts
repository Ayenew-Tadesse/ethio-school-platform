import { expect, test, type Page } from "@playwright/test";

// The heart of the demo story, on a phone and on a desktop:
// teacher posts homework → student submits → teacher grades → student and parent see the grade.
test.beforeEach(({}, info) => test.skip(!["w390", "w1280"].includes(info.project.name), "story runs at one phone and one desktop width"));

async function as(page: Page, role: "teacher" | "student" | "parent") {
  await page.goto("/login");
  await page.click(`[data-demo=${role}]`);
  await expect(page.locator("main#main h1")).toBeVisible();
}

test("homework: post, submit, grade, see the grade", async ({ page }) => {
  const title = `Fractions story ${Date.now() % 10000}`;

  await as(page, "teacher");
  await page.goto("/app/assignments/new");
  await page.getByLabel("Class and subject").selectOption({ label: "Grade 8A · Mathematics" });
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill("Questions 1 to 10 on page 42.");
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.locator("main#main h1")).toHaveText(title);
  await expect(page.getByText("0 of 10 submitted")).toBeVisible();

  await as(page, "student");
  await expect(page.getByRole("button", { name: /Notifications \([1-9]/ })).toBeVisible();
  await page.goto("/app/assignments");
  await page.getByRole("link", { name: new RegExp(title) }).click();
  await page.getByLabel("Your work").fill("1) 3/4  2) 5/8 …");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.getByText("Submitted. Your teacher has been notified.")).toBeVisible();

  await as(page, "teacher");
  await page.goto("/app/assignments");
  await page.getByRole("link", { name: new RegExp(title) }).click();
  await expect(page.getByText("1 of 10 submitted")).toBeVisible();
  const row = page.locator('[data-student="Liya Getachew"]');
  await row.getByLabel("Score: Liya Getachew").fill("9");
  await row.getByLabel("Feedback: Liya Getachew").fill("Great working shown.");
  await page.getByRole("button", { name: /Save all grades/ }).click();
  await expect(page.getByText("Grades saved. Students and parents are notified.")).toBeVisible();

  await as(page, "student");
  await page.goto("/app/grades");
  await expect(page.getByRole("link", { name: new RegExp(`${title}.*9 / 10`) })).toBeVisible();

  await as(page, "parent");
  await page.goto("/app/assignments");
  await page.getByRole("tab", { name: /Graded/ }).click();
  await page.getByRole("link", { name: new RegExp(title) }).click();
  await expect(page.locator("main#main h1")).toHaveText(title);
  await expect(page.getByText("9 / 10")).toBeVisible();
  await expect(page.getByText("“Great working shown.”")).toBeVisible();
});

test("attendance: mark the class and save", async ({ page }) => {
  await as(page, "teacher");
  await page.goto("/app/attendance");
  await page.getByRole("button", { name: "Mark everyone present" }).click();
  await page.locator('[data-student="Liya Getachew"]').getByRole("radio", { name: "Late" }).click();
  await page.getByRole("button", { name: "Save attendance" }).click();
  await expect(page.getByText(/Attendance saved/)).toBeVisible();
  await page.goto("/app");
  await expect(page.getByText("Attendance taken today").first()).toBeVisible();
});

test("a score above the maximum is refused", async ({ page }) => {
  await as(page, "teacher");
  await page.goto("/app/assignments");
  await page.getByRole("tab", { name: /Past/ }).click();
  await page.locator("main#main ul a").first().click();
  const first = page.locator("[data-student]").first();
  await first.getByRole("spinbutton").fill("999");
  await page.getByRole("button", { name: /Save all grades/ }).click();
  await expect(page.getByText(/Scores must be between 0 and/)).toBeVisible();
});
