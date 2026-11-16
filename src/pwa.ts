import { registerSW } from "virtual:pwa-register";
import { hasPendingWrites } from "./data/write";
import { isEditingPath } from "./lib/paths";

/** 新しい版に切り替えられるかを確かめる間隔。 */
const CHECK_MS = 1000;

/**
 * Service Worker を登録する。新しい版が有効になったら、ページを読み直して切り替える。
 * 読み直すと入力中の内容が消えるため、記録やカテゴリの入力画面にいる間は待つ。
 * 保存した直後の書き込みを取りこぼさないよう、未同期の書き込みがある間も待つ。
 */
export function registerUpdates(): void {
  registerSW({
    immediate: true,
    onNeedReload() {
      const reloadWhenSafe = () => {
        if (isEditingPath(window.location.pathname) || hasPendingWrites()) return;
        clearInterval(timer);
        window.location.reload();
      };
      const timer = setInterval(reloadWhenSafe, CHECK_MS);
      reloadWhenSafe();
    },
  });
}
