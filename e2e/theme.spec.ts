import { expect, test } from "./helpers";

// 配色は端末の設定に従う（Surface Q30）。地と紙の色、ブラウザーの枠の色（theme-color）で確かめる
const cases = [
  { colorScheme: "light", ground: "rgb(207, 221, 246)", paper: "rgb(255, 255, 255)", themeColor: "#CFDDF6" },
  { colorScheme: "dark", ground: "rgb(15, 19, 34)", paper: "rgb(32, 38, 63)", themeColor: "#0F1322" },
] as const;

for (const { colorScheme, ground, paper, themeColor } of cases) {
  test.describe(`配色（${colorScheme}）`, () => {
    test.use({ colorScheme });

    test("端末の設定に合わせた色で表示する", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator(".screen")).toHaveCSS("background-color", ground);
      await expect(page.locator(".mc.today")).toHaveCSS("background-color", paper);
      await expect(page.locator(`meta[name="theme-color"][media*="${colorScheme}"]`)).toHaveAttribute(
        "content",
        themeColor,
      );
    });
  });
}
