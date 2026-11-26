import { card, cell, collectPageErrors, dateKey, expectPath, saveButton, toast, expect, test } from "./helpers";

const today = dateKey();

test.describe("食べたもの（Scope F-12）", () => {
  test("「食べちゃった」→ 項目の2タップで記録し、知らせから取り消せる", async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto("/");
    await page.locator(".btn.rec", { hasText: "食べちゃった" }).click();
    await expect(page.getByRole("dialog")).toHaveAccessibleName("何を食べた？");
    await page.locator(".sheet .chip", { hasText: "パン" }).click();

    await expect(page.locator(".sheet")).toHaveCount(0);
    await expect(page.locator(".mc.today .mfood .t")).toHaveText(["パ"]);
    await expect(card(page, 0)).toContainText("3日今月食べた");
    await expect(card(page, 0)).toContainText("食べずに 0日・ベスト 10日");
    await expect(toast(page)).toContainText("パンを記録しました");

    await toast(page).getByRole("button", { name: "取り消す" }).click();
    await expect(page.locator(".mc.today .mfood .t")).toHaveCount(0);
    await expect(card(page, 0)).toContainText("2日今月食べた");
    expect(errors).toEqual([]);
  });

  test("今日すでに記録した項目は選択状態で示し、押すと取り消す", async ({ page }) => {
    await page.goto("/");
    await page.locator(".btn.rec", { hasText: "食べちゃった" }).click();
    await page.locator(".sheet .chip", { hasText: "お菓子" }).click();
    await page.locator(".btn.rec", { hasText: "食べちゃった" }).click();
    const sweets = page.locator(".sheet .chip", { hasText: "お菓子" });
    await expect(sweets).toHaveAttribute("aria-pressed", "true");
    await sweets.click();
    await expect(toast(page)).toContainText("お菓子を取り消しました");
    await expect(page.locator(".mc.today .mfood .t")).toHaveCount(0);

    await toast(page).getByRole("button", { name: "元に戻す" }).click();
    await expect(page.locator(".mc.today .mfood .t")).toHaveText(["菓"]);
  });

  test("「閉じる」では何も記録しない", async ({ page }) => {
    await page.goto("/");
    await page.locator(".btn.rec", { hasText: "食べちゃった" }).click();
    await page.locator(".sheet .btn.plain", { hasText: "閉じる" }).click();
    await expect(page.locator(".sheet")).toHaveCount(0);
    await expect(page.locator(".mc.today .mfood .t")).toHaveCount(0);
  });
});

test.describe("運動（Scope F-13）", () => {
  test("1タップで記録し、ボタンが「運動した」に変わる。もう一度押すと取り消す", async ({ page }) => {
    await page.goto("/");
    const btn = page.locator(".btn.rec", { hasText: /^運動/ });
    await expect(btn).toHaveText("運動する");
    await btn.click();
    await expect(btn).toHaveText("運動した");
    await expect(btn).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".mc.today .mex")).toHaveText("運");
    await expect(card(page, 1)).toContainText("7日連続");

    await btn.click();
    await expect(btn).toHaveText("運動する");
    await expect(card(page, 1)).toContainText("6日連続");
  });

  test("開いたまま日付が変わっても、押した時点の日付で記録する", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-11-11T23:50:00+09:00"));
    await page.goto("/");
    await page.clock.setFixedTime(new Date("2026-11-12T00:10:00+09:00"));
    await page.locator(".btn.rec", { hasText: /^運動/ }).click();
    await expect(cell(page, "11月12日").locator(".mex")).toHaveText("運");
    await expect(cell(page, "11月11日").locator(".mex")).toHaveCount(0);
  });
});

test.describe("日別シート（Scope F-05）", () => {
  test("過去の日に記録・取り消しでき、食べなかった日の塗りが変わる", async ({ page }) => {
    await page.goto("/");
    const day = cell(page, "11月10日");
    await expect(day).toHaveClass(/clean/);
    await day.click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toHaveAccessibleName("11月10日（火）");
    await expect(sheet.locator(".chip", { hasText: "運動" })).toHaveAttribute("aria-pressed", "true");

    await sheet.locator(".chip", { hasText: "お菓子" }).click();
    await expect(sheet).toBeVisible(); // 開いたまま
    await expect(day).not.toHaveClass(/clean/);
    await expect(day.locator(".mfood .t")).toHaveText(["菓"]);
    await expect(card(page, 0)).toContainText("食べずに 1日");

    await sheet.locator(".chip", { hasText: "お菓子" }).click();
    await expect(day).toHaveClass(/clean/);
    await page.keyboard.press("Escape");
    await expect(page.locator(".sheet")).toHaveCount(0);
  });

  test("「使わない」項目も、その日に記録があれば示す", async ({ page }) => {
    // ページを開き直すと例データが戻るため、画面の中だけで操作する
    const toggleRamen = async () => {
      await page.getByRole("button", { name: "項目管理" }).click();
      await page.locator(".cr", { hasText: "ラーメン" }).click();
      await page.getByRole("switch", { name: "使う" }).click();
      await saveButton(page).click();
      await expectPath(page, "/items");
      await page.locator(".hd .lnk", { hasText: "戻る" }).click();
      await expectPath(page, "/");
    };
    await page.goto("/");
    await toggleRamen(); // 使う
    await cell(page, "11月10日").click();
    await page.getByRole("dialog").locator(".chip", { hasText: "ラーメン" }).click();
    await page.keyboard.press("Escape");
    await toggleRamen(); // 使わない

    await page.locator(".btn.rec", { hasText: "食べちゃった" }).click();
    await expect(page.locator(".sheet .chip", { hasText: "ラーメン" })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await cell(page, "11月10日").click();
    await expect(page.getByRole("dialog").locator(".chip", { hasText: "ラーメン" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(cell(page, "11月10日").locator(".mfood .t")).toHaveText(["ラ"]);
  });
});

test.describe("便（Scope F-03）", () => {
  test("便を記録すると、今日のマスにマークが増える", async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto("/");
    const marks = page.locator(".mc.today .mm .mk");
    await expect(marks).toHaveCount(1);

    await page.locator(".btn.rec", { hasText: "便" }).click();
    await expectPath(page, "/stool/new");
    await expect(saveButton(page)).toBeDisabled(); // 形状を選ぶまで保存できない
    await page.locator(".chip.shape", { hasText: "柔らかい" }).click();
    await page.locator(".seg button", { hasText: /^少$/ }).click();
    await saveButton(page).click();

    await expectPath(page, "/");
    await expect(toast(page)).toHaveText("記録しました");
    await expect(marks).toHaveCount(2);
    expect(errors).toEqual([]);
  });

  test("日別シートから便を編集すると、シートを閉じた状態のカレンダーに戻る", async ({ page }) => {
    await page.goto("/");
    await page.locator(".mc.today").click();
    await page.locator(".dstools button").first().click();
    await expect(page.locator("#stool-date")).toHaveValue(today);
    await page.locator("#stool-time").fill("06:45");
    await saveButton(page).click();
    await expectPath(page, "/");
    await expect(page.locator(".sheet")).toHaveCount(0);
    await page.locator(".mc.today").click();
    await expect(page.locator(".dstools .tm").first()).toHaveText("06:45");
  });

  test("便の編集で日付を空にしても、ヘッダーの日付は崩れず、保存はできない", async ({ page }) => {
    await page.goto("/");
    await page.locator(".mc.today").click();
    await page.locator(".dstools button").first().click();
    await page.locator("#stool-date").fill("");
    await expect(page.locator(".hd .dtt .sr")).toHaveText("11月11日 水曜日");
    await saveButton(page).click();
    await expect(page.locator(".msg")).toHaveText("日時の形式が正しくありません");
  });

  test("削除の確認はキーボードで操作でき、Esc でやめられる", async ({ page }) => {
    await page.goto("/");
    await page.locator(".mc.today").click();
    await page.locator(".dstools button").first().click();
    await page.locator(".hd .lnk", { hasText: "削除" }).click();
    const cancel = page.locator(".sheet .btn.plain");
    const confirm = page.locator(".sheet .btn.del");
    await expect(cancel).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(confirm).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(cancel).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.locator(".sheet")).toHaveCount(0);
    await expect(page.locator(".chip.shape[aria-pressed='true']")).toHaveCount(1);
  });

  test("便を削除すると、マスのマークが減る", async ({ page }) => {
    await page.goto("/");
    await page.locator(".mc.today").click();
    await page.locator(".dstools button").first().click();
    await page.locator(".hd .lnk", { hasText: "削除" }).click();
    await page.locator(".sheet .btn.del").click();
    await expectPath(page, "/");
    await expect(page.locator(".mc.today .mm .mk")).toHaveCount(0);
  });

  test("未来の日の便は開けない", async ({ page }) => {
    await page.goto(`/stool/new?date=${dateKey(1)}`);
    await expectPath(page, "/");
  });

  test("開いたまま日付が変わっても、便は保存した時点の日付と時刻で記録する", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-11-11T23:59:00+09:00"));
    await page.goto("/");
    await page.locator(".btn.rec", { hasText: "便" }).click();
    await page.locator(".chip.shape", { hasText: "普通" }).click();
    await page.clock.setFixedTime(new Date("2026-11-12T00:01:00+09:00"));
    await saveButton(page).click();

    await expectPath(page, "/");
    await cell(page, "11月12日").click();
    await expect(page.locator(".dstools .tm")).toHaveText(["00:01"]);
  });
});
