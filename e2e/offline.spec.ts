import { chip, collectPageErrors, dateKey, expect, expectPath, saveButton, test, toast } from "./helpers";

/**
 * オフラインでの記録（Scope Q14）。デモのデータ層は Firestore と同じく、オフラインでも記録をすぐ画面に反映し、
 * 通信が戻るまで未同期として示す。Firestore 自体の同期はここでは確かめない。
 */
const sync = (page: import("@playwright/test").Page) => page.locator(".sync");

test("オフラインでも便を記録でき、通信が戻ると未同期の表示が消える", async ({ page, context }) => {
  const errors = collectPageErrors(page);
  const today = dateKey();
  await page.goto(`/day/${today}`);
  await expect(sync(page)).toHaveCount(0);

  await context.setOffline(true);
  await expect(sync(page)).toHaveText("オフライン");

  await page.getByRole("button", { name: "便を追加" }).click();
  await chip(page, "下痢").click();
  await saveButton(page).click();
  await expect(toast(page)).toHaveText("記録しました");
  await expectPath(page, `/day/${today}`);

  await expect(sync(page)).toHaveText("オフライン・未同期の記録あり");
  const row = page.locator(".dr", { hasText: "下痢" });
  await expect(row.locator(".uns")).toHaveText("未同期");

  await context.setOffline(false);
  await expect(sync(page)).toHaveCount(0);
  await expect(row).toBeVisible();
  await expect(row.locator(".uns")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("オフラインでも食事を記録できる", async ({ page, context }) => {
  const today = dateKey();
  await page.goto(`/day/${today}`);
  await context.setOffline(true);

  await page.locator(".dr", { hasText: "昼食" }).click();
  await chip(page, "米").click();
  await saveButton(page).click();
  await expect(toast(page)).toHaveText("記録しました");

  const row = page.locator(".dr", { hasText: "昼食" });
  await expect(row).toContainText("米");
  await expect(row.locator(".uns")).toHaveText("未同期");

  await context.setOffline(false);
  await expect(row.locator(".uns")).toHaveCount(0);
  await expect(row).toContainText("米");
});
