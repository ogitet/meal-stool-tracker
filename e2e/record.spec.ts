import { chip, collectPageErrors, dateKey, expectPath, saveButton, toast, expect, test } from "./helpers";

const today = dateKey();

test("便を記録すると、今日の紙片に印が増える", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto("/");
  const marks = page.locator(".slip.today .stl .mk");
  const before = await marks.count();

  await page.locator(".btn.rec", { hasText: "便" }).click();
  await expectPath(page, "/stool/new");
  await expect(saveButton(page)).toBeDisabled(); // 形状を選ぶまで保存できない

  await page.locator(".chip.shape", { hasText: "柔らかい" }).click();
  await page.locator(".seg button", { hasText: /^少$/ }).click();
  await saveButton(page).click();

  await expectPath(page, "/");
  await expect(toast(page)).toHaveText("記録しました");
  await expect(marks).toHaveCount(before + 1);
  expect(errors).toEqual([]);
});

test("食事：枠の切替、前回のコピー、保存", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto("/");
  await page.locator(".btn.rec", { hasText: "食事" }).click();
  await page.locator(".seg.slot button", { hasText: "夕食" }).click();
  await expectPath(page, `/meal/${today}/dinner`);

  await page.locator(".btn.out", { hasText: "前回をコピー" }).click();
  await expect(page.locator('.chip[aria-pressed="true"]')).toHaveText(["米", "豚肉", "野菜", "揚げ物"]);

  await chip(page, "お酒").click();
  await saveButton(page).click();

  await expectPath(page, "/");
  await expect(toast(page)).toHaveText("記録しました");
  const tiles = page.locator(".slip.today .fd .t");
  await expect(tiles.filter({ hasText: "揚" })).toHaveCount(1);
  await expect(tiles.filter({ hasText: "酒" })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("「食事」は時刻から枠を選ぶ。記録済みの枠は編集になる", async ({ page }) => {
  // 13:00 → 昼食（今日は未記録なので新規）
  await page.goto("/");
  await page.locator(".btn.rec", { hasText: "食事" }).click();
  await expectPath(page, `/meal/${today}/lunch`);
  await expect(page.locator('.seg.slot button[aria-pressed="true"]')).toHaveText("昼食");

  // 8:00 → 朝食（今日は記録済みなので、その記録の編集）
  await page.clock.setFixedTime(new Date("2026-11-11T08:00:00+09:00"));
  await page.goto("/");
  await page.locator(".btn.rec", { hasText: "食事" }).click();
  await expectPath(page, `/meal/${today}/breakfast`);
  await expect(page.locator(".slot.fixed")).toContainText("朝食");
  await expect(page.locator('.chip[aria-pressed="true"]')).toHaveText(["パン", "卵", "乳製品", "コーヒー"]);

  // 20:00 → 夕食
  await page.clock.setFixedTime(new Date("2026-11-11T20:00:00+09:00"));
  await page.goto("/");
  await page.locator(".btn.rec", { hasText: "食事" }).click();
  await expectPath(page, `/meal/${today}/dinner`);
});

test("カテゴリを選ぶまで食事は保存できない", async ({ page }) => {
  await page.goto(`/meal/${today}/lunch`);
  await expect(saveButton(page)).toBeDisabled();
  await chip(page, "米").click();
  await expect(saveButton(page)).toBeEnabled();
  await chip(page, "米").click();
  await expect(saveButton(page)).toBeDisabled();
});

test("日別詳細から食事を編集・削除して戻る", async ({ page }) => {
  const errors = collectPageErrors(page);
  const yesterday = dateKey(-1);
  // 昨日が前の週になる日（月曜）でも動くよう、昨日を含む週を開く
  await page.goto(`/?view=week&d=${yesterday}`);
  await page.locator(`.slip[aria-label*="月${Number(yesterday.slice(8))}日"]`).click();
  await expectPath(page, `/day/${yesterday}`);

  const dinner = page.locator(".dr", { has: page.locator(".lb", { hasText: "夕食" }) });
  await expect(dinner.locator(".vn")).toHaveText("米、豚肉、野菜、揚げ物");
  await dinner.click();
  await expect(page.locator(".slot.fixed")).toContainText("夕食"); // 編集では枠を変えられない

  await page.locator(".hd .lnk", { hasText: "削除" }).click();
  await page.locator(".sheet .btn.del").click();

  await expectPath(page, `/day/${yesterday}`);
  await expect(toast(page)).toHaveText("削除しました");
  await expect(dinner.locator(".vl")).toHaveText("未記録");

  await page.locator(".hd .lnk", { hasText: "戻る" }).click();
  await expectPath(page, "/");
  expect(errors).toEqual([]);
});

test("削除の確認で「やめる」を選ぶと、記録は残る", async ({ page }) => {
  const yesterday = dateKey(-1);
  await page.goto(`/meal/${yesterday}/dinner`);
  await page.locator(".hd .lnk", { hasText: "削除" }).click();
  await page.locator(".sheet .btn.plain", { hasText: "やめる" }).click();
  await expect(page.locator(".sheet")).toHaveCount(0);
  await expect(page.locator('.chip[aria-pressed="true"]')).toHaveCount(4);
});

test("便の編集では日時を修正できる", async ({ page }) => {
  await page.goto(`/day/${today}`);
  await page.locator(".dr", { has: page.locator(".tm") }).first().click();
  await expect(page.locator("#stool-date")).toHaveValue(today);
  await page.locator("#stool-time").fill("06:45");
  await saveButton(page).click();
  await expectPath(page, `/day/${today}`);
  await expect(page.locator(".dr .tm").first()).toHaveText("06:45");
});

test("未来の日は開けない", async ({ page }) => {
  await page.goto(`/day/${dateKey(1)}`);
  await expectPath(page, "/");
});
