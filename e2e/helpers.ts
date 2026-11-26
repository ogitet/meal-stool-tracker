import { expect, test as base, type Locator, type Page } from "@playwright/test";

/**
 * テスト内の「現在」。実行する時刻や曜日で結果が変わらないよう、ブラウザの時計を固定する。
 * 例データ（src/demo/store.ts）は今日を基準に作られる。2026-11-11 は水曜。
 * このとき例データは：今月食べた日 11/5・11/9（先月11日までは6日）、食べずに2日・ベスト10日、
 * 運動は今日まだで連続6日（11/5〜11/10）・ベスト12日・今月9日、起点日は 9/16。
 */
export const NOW = new Date("2026-11-11T13:00:00+09:00");

export const test = base.extend<{ fixedClock: void }>({
  fixedClock: [
    async ({ page }, use) => {
      await page.clock.setFixedTime(NOW);
      await use();
    },
    { auto: true },
  ],
});
export { expect };

/** テスト内の今日（NOW）から n 日ずらした日付（YYYY-MM-DD）。 */
export function dateKey(offsetDays = 0): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() + offsetDays);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** ページ内のエラー（例外）を集める。テストの最後に空であることを確かめる。 */
export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

/** URL の d（表示中の月の基準日）を返す。 */
export function anchorOf(page: Page): string | null {
  return new URL(page.url()).searchParams.get("d");
}

/**
 * カレンダーを横に払う。ページの中でポインターイベントを順に起こし、指のドラッグを再現する。
 * OS のマウス操作（page.mouse）は使わない。macOS の WebKit では、並列で動かすと
 * マウスの座標が画面外にずれることがあり、テストが不安定になるため。
 * 押した位置と離した位置の共通の親に click も送る（ブラウザと同じ順序）。
 */
export async function swipe(page: Page, from: [number, number], to: [number, number]): Promise<void> {
  await page.evaluate(
    ([[x0, y0], [x1, y1]]) => {
      const steps = 8;
      const fire = (type: string, x: number, y: number, buttons: number): Element => {
        const el = document.elementFromPoint(x, y) ?? document.body;
        el.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            composed: true,
            clientX: x,
            clientY: y,
            pointerId: 1,
            pointerType: "mouse",
            isPrimary: true,
            button: type === "pointermove" ? -1 : 0,
            buttons,
          }),
        );
        return el;
      };
      const down = fire("pointerdown", x0, y0, 1);
      for (let i = 1; i <= steps; i++)
        fire("pointermove", x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps, 1);
      const up = fire("pointerup", x1, y1, 0);
      let common: Element | null = down;
      while (common && !common.contains(up)) common = common.parentElement;
      (common ?? document.body).dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, clientX: x1, clientY: y1, detail: 1 }),
      );
    },
    [from, to] as const,
  );
}

export const chip = (page: Page, name: string): Locator => page.locator(".chip", { hasText: new RegExp(`^${name}$`) });
export const toast = (page: Page): Locator => page.locator(".toast");
export const saveButton = (page: Page): Locator => page.locator(".bar .btn.pri");

export async function expectPath(page: Page, path: string): Promise<void> {
  await expect.poll(() => new URL(page.url()).pathname).toBe(path);
}

/** 月カレンダーのマス。読み上げ名の先頭の日付（例：11月10日）で探す。 */
export const cell = (page: Page, monthDay: string): Locator =>
  page.getByRole("button", { name: new RegExp(`^${monthDay}( |$)`) });

/** 上部の数字のカード。0 が減らしたいもの、1 が続けたいこと。 */
export const card = (page: Page, n: 0 | 1): Locator => page.locator(".ncard").nth(n);
