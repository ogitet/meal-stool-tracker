import { chip, collectPageErrors, dateKey, expectPath, saveButton, toast, expect, test } from "./helpers";

// 例データでは、12日前の昼食に「使わない」カテゴリ（そば）が含まれる
const dayWithUnused = dateKey(-12);

test("カテゴリを追加すると、略称は名称の先頭1文字になる", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto("/categories");
  await page.locator(".bar .btn.pri", { hasText: "カテゴリを追加" }).click();
  await expectPath(page, "/categories/new");
  await expect(saveButton(page)).toBeDisabled();

  await page.locator("#cat-name").fill("納豆");
  await expect(page.locator("#cat-abbr")).toHaveValue("納");
  await saveButton(page).click();

  await expectPath(page, "/categories");
  await expect(toast(page)).toHaveText("追加しました");
  await expect(page.locator(".cr", { hasText: "納豆" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("同じグループに同じ名称は保存できない", async ({ page }) => {
  await page.goto("/categories/new");
  await page.locator("#cat-name").fill("米");
  await page.locator("#cat-group").selectOption({ label: "主食" });
  await expect(page.locator(".msg")).toHaveText("同じグループに同じ名称があります");
  await expect(saveButton(page)).toBeDisabled();

  await page.locator("#cat-group").selectOption({ label: "お菓子" });
  await expect(saveButton(page)).toBeEnabled();
});

test("グループを移すと、移った先の末尾に並ぶ", async ({ page }) => {
  await page.goto("/categories");
  await page.locator(".cr", { hasText: "米" }).click();
  await page.locator("#cat-group").selectOption("other");
  await saveButton(page).click();
  await expectPath(page, "/categories");
  const other = page.locator("section", { has: page.locator("h2", { hasText: /^その他$/ }) });
  await expect(other.locator(".cr").last()).toContainText("米");
});

test("「使わない」にすると、新規の選択肢から消える", async ({ page }) => {
  await page.goto("/categories");
  await page.locator(".cr", { hasText: "コーヒー" }).click();
  await page.getByRole("switch").click();
  await saveButton(page).click();
  await expectPath(page, "/categories");
  await expect(page.locator(".cr.off", { hasText: "コーヒー" })).toBeVisible();

  // ページを読み直さずに記録画面へ進む（例データは読み直すと初期状態に戻るため）
  await page.locator(".hd .lnk", { hasText: "戻る" }).click();
  await page.locator(".btn.rec", { hasText: "食事" }).click();
  await expect(chip(page, "米")).toBeVisible();
  await expect(chip(page, "コーヒー")).toHaveCount(0);
});

test("「使わない」カテゴリは外せるが、選び直せない", async ({ page }) => {
  await page.goto(`/meal/${dayWithUnused}/lunch`);
  const soba = chip(page, "そば");
  await expect(soba).toHaveAttribute("aria-pressed", "true");
  await expect(soba).toBeEnabled();

  await soba.click();
  await expect(soba).toHaveAttribute("aria-pressed", "false");
  await expect(soba).toBeDisabled();

  // 使用中のカテゴリは今までどおり切り替えられる
  await chip(page, "パン").click();
  await expect(chip(page, "パン")).toHaveAttribute("aria-pressed", "true");
});

test("「使わない」カテゴリは新規の記録に出ない", async ({ page }) => {
  await page.goto(`/meal/${dayWithUnused}/dinner`);
  await expect(chip(page, "米")).toBeVisible();
  await expect(chip(page, "そば")).toHaveCount(0);
});

test.describe("ログイン", () => {
  test("ログイン画面を経ると、カレンダーから始まる", async ({ page }) => {
    await page.goto(`/day/${dayWithUnused}?login`);
    await expect(page.locator("form.login")).toBeVisible();
    await page.locator("#email").fill("me@example.com");
    await page.locator("#password").fill("x");
    await page.locator('form.login button[type="submit"]').click();

    await expectPath(page, "/");
    await expect(page.locator(".slip.today")).toBeVisible();
  });

  test("ログイン済みなら、開いた画面をそのまま表示する", async ({ page }) => {
    await page.goto(`/day/${dayWithUnused}`);
    await expectPath(page, `/day/${dayWithUnused}`);
    await expect(page.locator(".sh").first()).toHaveText("食事");
  });
});
