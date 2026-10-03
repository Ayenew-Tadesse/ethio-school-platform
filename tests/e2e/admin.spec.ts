import { expect, test } from "@playwright/test";

// Step 1 and step 10 of the demo story: the administrator sets the school up
// and reads the analytics.
test.beforeEach(async ({ page }, info) => {
  test.skip(!["w390", "w1280"].includes(info.project.name), "runs at one phone and one desktop width");
  await page.goto("/login");
  await page.click("[data-demo=admin]");
  await expect(page.locator("main#main h1")).toBeVisible();
});

test("create a class, assign a teacher, add a student with a login", async ({ page }) => {
  await page.goto("/app/classes");
  await page.getByRole("button", { name: "Add class" }).click();
  await page.getByLabel("Grade level").selectOption({ label: "Grade 8" });
  await page.getByLabel("Section").fill("c");
  await page.getByRole("dialog").getByRole("button", { name: "Add" }).click();
  await expect(page.locator("main#main h1")).toHaveText("Grade 8C");

  await page.getByLabel("Add subject").selectOption({ label: "Mathematics" });
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByLabel("Teacher for Mathematics").selectOption({ label: "Meron Alemu" });
  await expect(page.getByLabel("Teacher for Mathematics")).toHaveValue(/.+/);

  await page.getByRole("button", { name: "Add student" }).click();
  await page.getByLabel("Full name").fill("Test Newstudent");
  await page.getByLabel("Email (creates a login)").fill("new.student@example.com");
  await page.getByRole("dialog").getByRole("button", { name: "Add" }).click();
  await expect(page.getByRole("dialog", { name: "Login created" })).toBeVisible();
  await expect(page.locator("[data-temp-password]")).not.toBeEmpty();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("link", { name: /Test Newstudent/ })).toBeVisible();

  // The new class shows in the list, and the teacher now teaches it.
  await page.goto("/app/classes");
  await expect(page.locator('[data-class="Grade 8C"]')).toBeVisible();
});

test("a duplicate class is refused", async ({ page }) => {
  await page.goto("/app/classes");
  await page.getByRole("button", { name: "Add class" }).click();
  await page.getByLabel("Grade level").selectOption({ label: "Grade 8" });
  await page.getByLabel("Section").fill("A");
  await page.getByRole("dialog").getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("That class already exists.")).toBeVisible();
});

test("grading weights must add up to 100", async ({ page }) => {
  await page.goto("/app/settings");
  await page.getByLabel("Homework").fill("15");
  await expect(page.getByText("Total: 105%")).toBeVisible();
  await page.getByRole("button", { name: "Save" }).nth(1).click();
  await expect(page.getByText(/must add up to 100%/)).toBeVisible();
  await page.getByLabel("Final exam").fill("25");
  await page.getByRole("button", { name: "Save" }).nth(1).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();
});

test("messaging rules can be switched off", async ({ page }) => {
  await page.goto("/app/settings");
  const sw = page.getByRole("switch", { name: "Students → their teachers" });
  await sw.uncheck({ force: true });
  await page.getByRole("button", { name: "Save" }).nth(3).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("switch", { name: "Students → their teachers" })).not.toBeChecked();
});

test("reports: classes, subjects, attention list and CSV", async ({ page }) => {
  await page.goto("/app/reports");
  await expect(page.getByRole("heading", { name: "By class" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Grade 8A", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Students requiring academic attention" })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download CSV" }).first().click();
  expect((await download).suggestedFilename()).toBe("classes.csv");
});

test("people pages: students search, parents, teachers, subjects", async ({ page }) => {
  await page.goto("/app/students");
  await page.getByLabel("Search by name or number").fill("Liya Getachew");
  await expect(page.getByText("1 student", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: /Liya Getachew/ }).click();
  await expect(page.locator("main#main h1")).toHaveText("Liya Getachew");
  await expect(page.getByText("Getachew Mulugeta")).toBeVisible();
  await page.goto("/app/teachers");
  await expect(page.getByText("Meron Alemu")).toBeVisible();
  await page.goto("/app/subjects");
  await expect(page.getByText("ሒሳብ").or(page.getByText("Mathematics")).first()).toBeVisible();
});
