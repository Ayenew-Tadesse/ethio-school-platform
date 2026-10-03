// The portfolio photographer: signs in to the demo as each role and takes the
// case-study screenshots at landscape-tablet size (1180 × 820). Run by
// .github/workflows/screenshots.yml after every change to main; the pictures
// are published on the "screenshots" branch at fixed addresses, so a portfolio
// that links to them always shows the current app.
//
//   node scripts/screenshots.mjs <out-dir>     (the app must be running at BASE_URL)
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const OUT = process.argv[2] || "screenshots";
const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const DIR = `${OUT}/tablet`;
mkdirSync(DIR, { recursive: true });

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1.25 });
const page = await ctx.newPage();
const shots = [];
const shot = async (name, label) => {
  await page.screenshot({ path: `${DIR}/${name}.jpg`, type: "jpeg", quality: 74 });
  shots.push({ file: `tablet/${name}.jpg`, label });
};
const as = async (role) => {
  await page.goto(`${BASE}/login`);
  await page.click(`[data-demo=${role}]`);
  await page.waitForSelector("main#main h1");
  await page.waitForTimeout(400);
};

// The top of the case study.
await page.goto(`${BASE}/`);
await page.waitForTimeout(500);
await shot("landing", "Landing page");
await as("admin");
await shot("admin-dashboard", "Administrator dashboard");
await page.goto(`${BASE}/app/reports`);
await page.waitForSelector("main#main h1");
await page.waitForTimeout(400);
await shot("reports", "Reports");

// The homework story: teacher posts, student submits, teacher grades, parent sees.
const title = "Fractions practice set";
await as("teacher");
await page.goto(`${BASE}/app/assignments/new`);
await page.waitForSelector("main#main h1");
await page.getByLabel("Class and subject").selectOption({ label: "Grade 8A · Mathematics" });
await page.getByLabel("Title").fill(title);
await page.getByLabel("Description").fill("Questions 1 to 10 on page 42. Show your working.");
await shot("flow-1-post", "Teacher posts homework");
await page.getByRole("button", { name: "Publish" }).click();
await page.waitForSelector("text=0 of 10 submitted");

await as("student");
await page.goto(`${BASE}/app/assignments`);
await page.getByRole("link", { name: new RegExp(title) }).click();
await page.waitForSelector("#answer");
await page.fill("#answer", "1) 3/4   2) 5/8   3) 7/10 … I showed my working on paper and attached a photo.");
await shot("flow-2-submit", "Student submits");
await page.getByRole("button", { name: "Submit", exact: true }).click();
await page.waitForSelector("text=Submitted. Your teacher has been notified.");

await as("teacher");
await page.goto(`${BASE}/app/assignments`);
await page.getByRole("link", { name: new RegExp(title) }).click();
await page.waitForSelector("[data-student]");
const row = page.locator('[data-student="Liya Getachew"]');
await row.getByRole("button", { name: "View answer" }).click();
await row.getByLabel("Score: Liya Getachew").fill("9");
await row.getByLabel("Feedback: Liya Getachew").fill("Great working shown.");
await row.evaluate((el) => el.scrollIntoView({ block: "center" }));
await page.waitForTimeout(250);
await shot("flow-3-grade", "Teacher grades with feedback");
await page.getByRole("button", { name: /Save all grades/ }).click();
await page.waitForSelector("text=Grades saved");

await as("parent");
await page.goto(`${BASE}/app/assignments`);
await page.getByRole("tab", { name: /Graded/ }).click();
await page.getByRole("link", { name: new RegExp(title) }).click();
await page.waitForSelector("text=9 / 10");
await page.waitForTimeout(300);
await shot("flow-4-parent", "Parent sees the grade");

await browser.close();
writeFileSync(`${OUT}/manifest.json`, JSON.stringify({
  app: "Ethio School Platform", device: "tablet", size: "1180x820",
  taken_at: new Date().toISOString(), commit: process.env.GITHUB_SHA || null, shots,
}, null, 2));
console.log(`Saved ${shots.length} screenshots to ${OUT}/`);
