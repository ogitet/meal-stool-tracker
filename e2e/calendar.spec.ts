import { anchorOf, collectPageErrors, expectPath, swipe, expect, test } from "./helpers";

// 例データに左右されないよう、期間は固定の日付で確かめる（2026-11-11 は水曜）
const WEEK = "/?view=week&d=2026-11-11";

test.describe("スワイプ", () => {
  test("週：左に払うと次の週、右に払うと前の週", async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto(WEEK);
    await expect(page.locator(".rng")).toHaveText("11/9–15");

    await swipe(page, [300, 250], [160, 255]);
    await expect.poll(() => anchorOf(page)).toBe("2026-11-18");
    await expect(page.locator(".pager.from-r")).toBeVisible(); // 右から入る
    await expect(page.locator(".rng")).toHaveText("11/16–22");

    await swipe(page, [100, 250], [260, 245]);
    await expect(page.locator(".rng")).toHaveText("11/9–15");
    await expect(page.locator(".pager.from-l")).toBeVisible(); // 左から入る
    expect(anchorOf(page)).toBe("2026-11-11");
    expect(errors).toEqual([]);
  });

  test("短い払いと縦の動きでは送らない", async ({ page }) => {
    await page.goto(WEEK);
    await swipe(page, [250, 250], [215, 250]); // 35px：しきい値（60px）未満
    await swipe(page, [200, 200], [205, 420]); // 縦
    expect(anchorOf(page)).toBe("2026-11-11");
    await expectPath(page, "/"); // 日付を開いていない
    await expect(page.locator(".track")).not.toHaveAttribute("style", /transform/);
  });

  test("月：左右に払って月を送る", async ({ page }) => {
    await page.goto("/?view=month&d=2026-11-11");
    await swipe(page, [300, 300], [120, 300]);
    await expect.poll(() => anchorOf(page)).toBe("2026-12-11");
    await expect(page.locator(".rng")).toHaveAccessibleName("2026年12月");

    await swipe(page, [80, 300], [280, 300]);
    await expect(page.locator(".rng")).toHaveAccessibleName("2026年11月");
    await swipe(page, [80, 300], [280, 300]);
    await expect(page.locator(".rng")).toHaveAccessibleName("2026年10月");
    expect(anchorOf(page)).toBe("2026-10-11");
  });

  test("続けて素早く払っても、払った回数だけ進む", async ({ page }) => {
    await page.goto("/?view=month&d=2026-11-11");
    await expect(page.locator(".rng")).toHaveAccessibleName("2026年11月");
    // 再描画を待たずに3回払う
    await Promise.all([1, 2, 3].map(() => swipe(page, [80, 300], [280, 300])));
    await expect(page.locator(".rng")).toHaveAccessibleName("2026年8月");
  });

  test("払った直後に日付を開かない。普通のタップでは開く", async ({ page }) => {
    await page.goto("/?view=week&d=2026-10-07"); // 過去の週（すべての日を開ける）
    const slip = page.locator(".slip").first();
    const box = (await slip.boundingBox())!;
    const y = box.y + box.height / 2;

    await swipe(page, [box.x + box.width - 30, y], [box.x + 40, y]);
    await expect.poll(() => anchorOf(page)).toBe("2026-10-14");
    await expectPath(page, "/");

    await page.locator(".slip").first().click();
    await expectPath(page, "/day/2026-10-12");
  });
});

test.describe("期間の移動と表示切替", () => {
  test("矢印で前後の週へ、「今日」で今日を含む週へ戻る", async ({ page }) => {
    await page.goto(WEEK);
    await page.getByRole("button", { name: "次の週" }).click();
    await expect.poll(() => anchorOf(page)).toBe("2026-11-18");
    await page.getByRole("button", { name: "前の週" }).click();
    await page.getByRole("button", { name: "前の週" }).click();
    await expect.poll(() => anchorOf(page)).toBe("2026-11-04");

    await page.getByRole("button", { name: "今日", exact: true }).click();
    await expect(page.locator(".slip.today")).toBeVisible();
  });

  test("週は月曜から始まり、7日分を表示する", async ({ page }) => {
    await page.goto(WEEK);
    await expect(page.locator(".slip")).toHaveCount(7);
    await expect(page.locator(".slip .wd")).toHaveText(["月", "火", "水", "木", "金", "土", "日"]);
  });

  test("月表示は6週分。カテゴリ管理から戻っても月表示のまま", async ({ page }) => {
    await page.goto("/");
    await page.locator(".seg.sm button", { hasText: "月" }).click();
    await expect(page.locator(".mc")).toHaveCount(42);
    expect(new URL(page.url()).searchParams.get("view")).toBe("month");

    await page.getByRole("button", { name: "カテゴリ管理" }).click();
    await expectPath(page, "/categories");
    await page.locator(".hd .lnk", { hasText: "戻る" }).click();
    await expectPath(page, "/");
    expect(new URL(page.url()).searchParams.get("view")).toBe("month");
  });

  test("未来の日は選択できない", async ({ page }) => {
    await page.goto("/");
    const future = page.locator(".slip.future");
    for (const el of await future.all()) await expect(el).toBeDisabled();
    await expect(page.locator(".slip.today")).toBeEnabled();
  });
});
