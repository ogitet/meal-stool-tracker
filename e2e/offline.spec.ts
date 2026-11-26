import { collectPageErrors, expect, expectPath, saveButton, test, toast } from "./helpers";

/**
 * オフラインでの記録（Scope Q14）。デモのデータ層は Firestore と同じく、オフラインでも記録をすぐ画面に反映し、
 * 通信が戻るまで未同期として示す。Firestore 自体の同期はここでは確かめない。
 */
const sync = (page: import("@playwright/test").Page) => page.locator(".sync");

test("オフラインでも食べたものを記録でき、通信が戻ると未同期の表示が消える", async ({ page, context }) => {
  const errors = collectPageErrors(page);
  await page.goto("/");
  await expect(sync(page)).toHaveCount(0);

  await context.setOffline(true);
  await expect(sync(page)).toHaveText("オフライン");

  await page.locator(".btn.rec", { hasText: "食べちゃった" }).click();
  await page.locator(".sheet .chip", { hasText: "パン" }).click();
  await expect(page.locator(".mc.today .mfood .t")).toHaveText(["パ"]);
  await expect(sync(page)).toHaveText("オフライン・未同期の記録あり");
  await page.locator(".mc.today").click();
  await expect(page.locator(".sheet .uns")).toHaveText("未同期の記録があります");

  await context.setOffline(false);
  await expect(sync(page)).toHaveCount(0);
  await expect(page.locator(".sheet .uns")).toHaveCount(0);
  await expect(page.locator(".mc.today .mfood .t")).toHaveText(["パ"]);
  expect(errors).toEqual([]);
});

test("オフラインでも便を記録できる", async ({ page, context }) => {
  await page.goto("/");
  await context.setOffline(true);

  await page.locator(".btn.rec", { hasText: "便" }).click();
  await page.locator(".chip.shape", { hasText: "下痢" }).click();
  await saveButton(page).click();
  await expect(toast(page)).toHaveText("記録しました");
  await expectPath(page, "/");

  await page.locator(".mc.today").click();
  const row = page.locator(".dstools button", { hasText: "下痢" });
  await expect(row.locator(".uns")).toHaveText("未同期");

  await context.setOffline(false);
  await expect(row.locator(".uns")).toHaveCount(0);
  await expect(row).toBeVisible();
});
