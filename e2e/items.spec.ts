import { collectPageErrors, expectPath, saveButton, toast, expect, test } from "./helpers";

test("減らしたいものを追加すると、略称は名称の先頭1文字になり、選択肢に出る", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto("/");
  await page.getByRole("button", { name: "項目管理" }).click();
  await page.locator(".add", { hasText: "減らしたいものを追加" }).click();
  await expectPath(page, "/items/new");
  await page.locator("#item-name").fill("ポテチ");
  await expect(page.locator("#item-abbr")).toHaveValue("ポ");
  await saveButton(page).click();

  await expectPath(page, "/items");
  await expect(toast(page)).toHaveText("追加しました");
  await expect(page.locator("section").first().locator(".cr")).toHaveText([/パン/, /お菓子/, /ポテチ/]);

  await page.locator(".hd .lnk", { hasText: "戻る" }).click();
  await page.locator(".btn.rec", { hasText: "食べちゃった" }).click();
  await expect(page.locator(".sheet .chip")).toHaveText(["パン", "お菓子", "ポテチ"]);
  await expect(page.locator(".ncard h2").first()).toHaveText("パン・お菓子・ポテチ");
  expect(errors).toEqual([]);
});

test("同じ種類に同じ名称は保存できない。別の種類なら保存できる", async ({ page }) => {
  await page.goto("/items/new?kind=reduce");
  await page.locator("#item-name").fill("パン");
  await expect(page.locator(".msg")).toHaveText("同じ種類に同じ名称があります");
  await expect(saveButton(page)).toBeDisabled();

  await page.goto("/items/new?kind=keep");
  await page.locator("#item-name").fill("パン");
  await expect(page.locator(".msg")).toHaveCount(0);
  await expect(saveButton(page)).toBeEnabled();
});

test("「使う」項目は種類ごとに4つまで", async ({ page }) => {
  await page.goto("/items");
  for (const name of ["ポテチ", "アイス"]) {
    await page.locator(".add", { hasText: "減らしたいものを追加" }).click();
    await page.locator("#item-name").fill(name);
    await saveButton(page).click();
    await expectPath(page, "/items");
  }
  await expect(page.locator(".add", { hasText: "減らしたいものを追加" })).toHaveCount(0);
  await expect(page.locator(".add", { hasText: "続けたいことを追加" })).toBeVisible();

  // 「使わない」項目を「使う」に戻すときも数える
  await page.locator(".cr", { hasText: "ラーメン" }).click();
  await page.getByRole("switch", { name: "使う" }).click();
  await expect(page.locator(".msg")).toHaveText("減らしたいもので使う項目は4つまでです");
  await expect(saveButton(page)).toBeDisabled();
});

test("続けたいことが2つになると、記録のボタンは項目を選ぶシートを開く", async ({ page }) => {
  await page.goto("/items");
  await page.locator(".add", { hasText: "続けたいことを追加" }).click();
  await page.locator("#item-name").fill("散歩");
  await saveButton(page).click();
  await page.locator(".hd .lnk", { hasText: "戻る" }).click();

  await page.locator(".btn.rec", { hasText: "できた" }).click();
  await expect(page.getByRole("dialog")).toHaveAccessibleName("何をやった？");
  await page.locator(".sheet .chip", { hasText: "散歩" }).click();
  await expect(page.locator(".mc.today .mex")).toHaveText("散");
  await expect(page.locator(".btn.rec", { hasText: "できた" })).toHaveAttribute("aria-pressed", "true");
});

test("「使わない」にすると選択肢から消え、一覧の末尾にまとまる", async ({ page }) => {
  await page.goto("/items");
  await page.locator(".cr", { hasText: "お菓子" }).click();
  await expect(page.locator(".note")).toHaveText("名称の変更は過去の記録にも反映されます");
  await page.getByRole("switch", { name: "使う" }).click();
  await saveButton(page).click();
  await expectPath(page, "/items");
  await expect(page.locator("section").last().locator(".cr")).toHaveText([/お菓子/, /ラーメン/]);

  await page.locator(".hd .lnk", { hasText: "戻る" }).click();
  await page.locator(".btn.rec", { hasText: "食べちゃった" }).click();
  await expect(page.locator(".sheet .chip")).toHaveText(["パン"]);
});

test.describe("ログイン", () => {
  test("ログイン画面を経ると、カレンダーから始まる", async ({ page }) => {
    await page.goto("/items?login");
    await expect(page.locator("form.login")).toBeVisible();
    await page.locator("#email").fill("me@example.com");
    await page.locator("#password").fill("x");
    await page.locator('form.login button[type="submit"]').click();

    await expectPath(page, "/");
    await expect(page.locator(".mc.today")).toBeVisible();
  });

  test("ログイン済みなら、開いた画面をそのまま表示する", async ({ page }) => {
    await page.goto("/items");
    await expectPath(page, "/items");
    await expect(page.locator(".sh").first()).toHaveText("減らしたいもの");
  });
});
