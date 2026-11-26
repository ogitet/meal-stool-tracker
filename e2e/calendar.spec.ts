import { anchorOf, card, cell, collectPageErrors, expectPath, swipe, expect, test } from "./helpers";

// 例データに左右されないよう、月は固定の日付で確かめる（2026-11-11 は水曜）
const NOV = "/?d=2026-11-11";

test.describe("スワイプ", () => {
  test("左に払うと次の月、右に払うと前の月", async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto(NOV);
    await swipe(page, [300, 400], [120, 400]);
    await expect.poll(() => anchorOf(page)).toBe("2026-12-11");
    await expect(page.locator(".pager.from-r")).toBeVisible(); // 右から入る
    await expect(page.locator(".rng")).toHaveAccessibleName("2026年12月");

    await swipe(page, [80, 400], [280, 400]);
    await expect(page.locator(".rng")).toHaveAccessibleName("2026年11月");
    await expect(page.locator(".pager.from-l")).toBeVisible(); // 左から入る
    expect(errors).toEqual([]);
  });

  test("短い払いと縦の動きでは送らない", async ({ page }) => {
    await page.goto(NOV);
    await swipe(page, [250, 400], [215, 400]); // 35px：しきい値（60px）未満
    await swipe(page, [200, 300], [205, 520]); // 縦
    expect(anchorOf(page)).toBe("2026-11-11");
    await expect(page.locator(".sheet")).toHaveCount(0); // 日付を開いていない
    await expect(page.locator(".track")).not.toHaveAttribute("style", /transform/);
  });

  test("続けて素早く払っても、払った回数だけ進む", async ({ page }) => {
    await page.goto(NOV);
    await expect(page.locator(".rng")).toHaveAccessibleName("2026年11月");
    // 再描画を待たずに3回払う
    await Promise.all([1, 2, 3].map(() => swipe(page, [80, 400], [280, 400])));
    await expect(page.locator(".rng")).toHaveAccessibleName("2026年8月");
  });

  test("払った直後に日付を開かない。普通のタップでは開く", async ({ page }) => {
    await page.goto("/?d=2026-10-07"); // 過去の月（すべての日を開ける）
    const first = cell(page, "10月6日");
    const box = (await first.boundingBox())!;
    const y = box.y + box.height / 2;

    await swipe(page, [box.x + 300, y], [box.x + 40, y]);
    await expect.poll(() => anchorOf(page)).toBe("2026-11-07");
    await expect(page.locator(".sheet")).toHaveCount(0);

    await cell(page, "11月4日").click();
    await expect(page.getByRole("dialog")).toHaveAccessibleName("11月4日（水）");
  });
});

test.describe("月の表示", () => {
  test("矢印で前後の月へ、「今日」で今日を含む月へ戻る", async ({ page }) => {
    await page.goto(NOV);
    await page.getByRole("button", { name: "次の月" }).click();
    await expect.poll(() => anchorOf(page)).toBe("2026-12-11");
    await page.getByRole("button", { name: "前の月" }).click();
    await page.getByRole("button", { name: "前の月" }).click();
    await expect.poll(() => anchorOf(page)).toBe("2026-10-11");

    await page.getByRole("button", { name: "今日", exact: true }).click();
    await expect(page.locator(".mc.today")).toBeVisible();
  });

  test("月曜から始まる6週分。項目管理から戻っても同じ月", async ({ page }) => {
    await page.goto("/?d=2026-10-05");
    await expect(page.locator(".mc")).toHaveCount(42);
    await expect(page.locator(".mwd span")).toHaveText(["月", "火", "水", "木", "金", "土", "日"]);

    await page.getByRole("button", { name: "項目管理" }).click();
    await expectPath(page, "/items");
    await page.locator(".hd .lnk", { hasText: "戻る" }).click();
    await expectPath(page, "/");
    expect(anchorOf(page)).toBe("2026-10-05");
  });

  test("未来の日は選択できない", async ({ page }) => {
    await page.goto(NOV);
    for (const el of await page.locator(".mc.future").all()) await expect(el).toBeDisabled();
    await expect(page.locator(".mc.today")).toBeEnabled();
  });

  test("マスに食べたもの・運動・便を示し、食べなかった日を塗る", async ({ page }) => {
    await page.goto(NOV);
    await expect(cell(page, "11月9日")).toHaveAccessibleName("11月9日 パン お菓子 運動 便3回");
    await expect(cell(page, "11月9日").locator(".mfood .t")).toHaveText(["パ", "菓"]);
    await expect(cell(page, "11月9日")).not.toHaveClass(/clean/);
    await expect(cell(page, "11月10日")).toHaveClass(/clean/);
    await expect(cell(page, "11月10日").locator(".mex")).toHaveText("運");
    // 今日は途中として塗らない（Structure Q66）
    await expect(page.locator(".mc.today")).not.toHaveClass(/clean/);
  });

  test("起点日より前の日は塗らない", async ({ page }) => {
    await page.goto("/?d=2026-09-16");
    await expect(cell(page, "9月15日")).not.toHaveClass(/clean/);
    await expect(cell(page, "9月16日")).toHaveClass(/clean/);
  });

  test("上部の数字は、別の月を見ていても今日の時点のまま", async ({ page }) => {
    await page.goto(NOV);
    await expect(card(page, 0)).toContainText("パン・お菓子2日今月食べた");
    await expect(card(page, 0)).toContainText("先月11日まで 6日");
    await expect(card(page, 0)).toContainText("食べずに 2日・ベスト 10日");
    await expect(card(page, 1)).toContainText("運動6日連続");
    await expect(card(page, 1)).toContainText("ベスト 12日");
    await expect(card(page, 1)).toContainText("今月 9日");

    await page.getByRole("button", { name: "前の月" }).click();
    await expect(card(page, 0)).toContainText("2日今月食べた");
  });
});

test.describe("開いたまま日付が変わったとき", () => {
  test("画面に戻ると、今日の強調が新しい日付に移る", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-11-11T23:50:00+09:00"));
    await page.goto("/");
    await expect(page.locator(".mc.today .md")).toHaveText("11");
    await page.clock.setFixedTime(new Date("2026-11-12T08:00:00+09:00"));
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await expect(page.locator(".mc.today .md")).toHaveText("12");
  });
});
