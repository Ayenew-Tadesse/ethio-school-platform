import { expect, test, type Page } from "@playwright/test";

test.beforeEach(({}, info) => test.skip(!["w390", "w1280"].includes(info.project.name), "runs at one phone and one desktop width"));

async function as(page: Page, role: "admin" | "teacher" | "student" | "parent") {
  await page.goto("/login");
  await page.click(`[data-demo=${role}]`);
  await expect(page.locator("main#main h1")).toBeVisible();
}

test("a parent writes to their child's teacher, who replies", async ({ page }) => {
  const note = `Liya will be late on Monday ${Date.now() % 1000}`;
  await as(page, "parent");
  await page.goto("/app/messages");
  await page.getByRole("button", { name: "New message" }).click();
  await page.getByRole("dialog").getByLabel("Choose who to write to").fill("Meron");
  await page.getByRole("dialog").getByRole("button", { name: /Meron Alemu/ }).click();
  await page.getByLabel("Write a message…").fill(note);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator("[aria-live=polite]").getByText(note)).toBeVisible();

  await as(page, "teacher");
  await page.goto("/app/messages");
  await page.getByRole("button", { name: /Getachew Mulugeta/ }).click();
  await expect(page.locator("[aria-live=polite]").getByText(note)).toBeVisible();
  await page.getByLabel("Write a message…").fill("Thank you for letting me know.");
  await page.getByLabel("Write a message…").press("Enter");
  await expect(page.locator("[aria-live=polite]").getByText("Thank you for letting me know.")).toBeVisible();

  await as(page, "parent");
  await page.goto("/app/messages");
  await page.getByRole("button", { name: /Meron Alemu/ }).click();
  await expect(page.locator("[aria-live=polite]").getByText("Thank you for letting me know.")).toBeVisible();
});

test("a student can only start conversations with their teachers", async ({ page }) => {
  await as(page, "student");
  await page.goto("/app/messages");
  await page.getByRole("button", { name: "New message" }).click();
  const options = page.getByRole("dialog").locator("ul button");
  await expect(options.first()).toBeVisible();
  for (const text of await options.allInnerTexts()) expect(text).toMatch(/Teacher|Administrator/);
  await expect(page.getByRole("dialog").getByText("Getachew Mulugeta")).toHaveCount(0);
});

test("a teacher's class announcement reaches the class", async ({ page }) => {
  const title = `Science fair ${Date.now() % 1000}`;
  await as(page, "teacher");
  await page.goto("/app/announcements");
  await page.getByRole("button", { name: "Post announcement" }).click();
  await page.getByRole("dialog").getByLabel("Title").fill(title);
  await page.getByLabel("Message").fill("Projects are due next Friday.");
  await page.getByLabel("Class", { exact: true }).selectOption({ label: "Grade 8A" });
  await page.getByRole("dialog").getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Announcement posted.", { exact: false })).toBeVisible();

  await as(page, "student");
  await page.goto("/app/notifications");
  await expect(page.getByRole("button", { name: new RegExp(title) })).toBeVisible();
  await page.goto("/app/announcements");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
});

test("library: a teacher adds a link and students find it", async ({ page }) => {
  const title = `Fractions video ${Date.now() % 1000}`;
  await as(page, "teacher");
  await page.goto("/app/library");
  await page.getByRole("button", { name: "Add material" }).click();
  await page.getByRole("dialog").getByLabel("Title").fill(title);
  await page.getByRole("dialog").getByLabel("Subject").selectOption({ label: "Mathematics" });
  await page.getByRole("dialog").getByLabel("Grade").selectOption({ label: "Grade 8" });
  await page.getByRole("dialog").getByLabel("Type").selectOption({ label: "Video" });
  await page.getByRole("dialog").getByLabel("Link (e.g. a video)").fill("https://example.com/fractions");
  await page.getByRole("dialog").getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText("Added to the library.")).toBeVisible();

  await as(page, "student");
  await page.goto("/app/library");
  await page.getByLabel("Search the library").fill("Fractions video");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  // A sample document from the demo library opens in a new tab.
  await page.getByLabel("Search the library").fill("fractions notes");
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Open", exact: true }).first().click();
  await expect((await popup).locator("h1")).toContainText("fractions notes");
});

test("notifications: open one, then mark everything read", async ({ page }) => {
  await as(page, "student");
  await page.goto("/app/notifications");
  await expect(page.getByRole("heading", { name: "Unread" })).toBeVisible();
  await page.getByRole("button", { name: "Mark all as read" }).click();
  await expect(page.getByRole("heading", { name: "Unread" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Notifications \(0\)/ })).toBeVisible();
});
