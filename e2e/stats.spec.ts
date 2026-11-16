import { anchorOf, collectPageErrors, expectPath, swipe, expect, test } from "./helpers";

// 例データはテスト内の今日（2026-11-11）から過去13日分（10/29〜11/11）。11/8 は食事の記録なし
const row = (page: import("@playwright/test").Page, name: string) =>
  page.locator(".st-row", { has: page.locator(".nm", { hasText: new RegExp(`^${name}$`) }) });

test.describe("集計", () => {
  test("月表示から開き、カテゴリを食べた日の数を示す", async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto("/?view=month");
    await page.getByRole("button", { name: "この月の集計" }).click();
    await expectPath(page, "/stats");
    expect(anchorOf(page)).toBe("2026-11-11");

    await expect(page.locator(".st-nav .rng")).toHaveAccessibleName("2026年11月");
    await expect(page.locator(".st-sum")).toHaveText("食事の記録がある日10日");
    await expect(row(page, "米").locator(".st-n")).toHaveText("7日");
    await expect(row(page, "その他").locator(".st-n")).toHaveText("0日");
    // 「使わない」カテゴリは、その月に記録がなければ示さない
    await expect(row(page, "そば")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "次の月" })).toBeDisabled();

    await page.getByRole("button", { name: "‹ 戻る" }).click();
    await expectPath(page, "/");
    expect(new URL(page.url()).searchParams.get("view")).toBe("month");
    expect(errors).toEqual([]);
  });

  test("月を送る。「使わない」カテゴリも記録があれば示す", async ({ page }) => {
    await page.goto("/stats?d=2026-11-11");
    await page.getByRole("button", { name: "前の月" }).click();
    await expect(page.locator(".st-nav .rng")).toHaveAccessibleName("2026年10月");
    await expect(page.locator(".st-sum")).toHaveText("食事の記録がある日3日");
    await expect(row(page, "そば").locator(".st-n")).toHaveText("1日");
    await expect(page.getByRole("button", { name: "次の月" })).toBeEnabled();

    await page.getByRole("button", { name: "前の月" }).click();
    await expect(page.locator(".st-nav .rng")).toHaveAccessibleName("2026年9月");
    await expect(page.getByText("この月の食事の記録はありません")).toBeVisible();

    await page.getByRole("button", { name: "次の月" }).click();
    await page.getByRole("button", { name: "次の月" }).click();
    await expect(page.locator(".st-nav .rng")).toHaveAccessibleName("2026年11月");
  });

  test("月表示でリンクの上を払っても、集計を開かずに月を送る", async ({ page }) => {
    await page.goto("/?view=month&d=2026-11-11");
    const box = (await page.getByRole("button", { name: "この月の集計" }).boundingBox())!;
    const y = box.y + box.height / 2;
    await swipe(page, [box.x + box.width - 10, y], [box.x - 90, y]);
    await expect.poll(() => anchorOf(page)).toBe("2026-12-11");
    await expectPath(page, "/");
  });
});
