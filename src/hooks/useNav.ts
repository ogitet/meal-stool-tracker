import { useCallback } from "react";
import { useNavigate, type NavigateOptions } from "react-router-dom";

/**
 * 画面遷移の動き（Surface 6章）。
 * push/pop：階層を進む・戻る（横にスライド）。open/close：記録シートを開く・閉じる（下からせり上がる）。
 */
export type Motion = "push" | "pop" | "open" | "close" | "none";

const REVERSE: Record<Motion, Motion> = { push: "pop", pop: "push", open: "close", close: "open", none: "none" };

/** 進んだときの動きを履歴の位置ごとに覚え、戻るときに逆の動きを使う。 */
const motionAt = new Map<number, Motion>();
let pending: Motion | null = null;

function historyIdx(): number {
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  return typeof idx === "number" ? idx : 0;
}

function setMotion(m: Motion): void {
  document.documentElement.dataset.vt = m;
}

// 端末のスワイプなど、アプリ外の操作で戻った場合は動きを付けない（OS の動きと重なるため）。
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    setMotion(pending ?? "none");
    pending = null;
  });
}

export function useNav() {
  const navigate = useNavigate();

  const go = useCallback(
    (to: string, motion: Motion = "push", options?: NavigateOptions) => {
      setMotion(motion);
      if (!options?.replace) motionAt.set(historyIdx() + 1, motion);
      void navigate(to, { ...options, viewTransition: motion !== "none" });
    },
    [navigate],
  );

  /** 開始した画面に戻る（Structure 5章）。履歴がなければ fallback に置き換える。 */
  const back = useCallback(
    (fallback: string, motion?: Motion) => {
      const idx = historyIdx();
      const m = motion ?? REVERSE[motionAt.get(idx) ?? "push"];
      if (idx > 0) {
        pending = m;
        void navigate(-1);
      } else {
        setMotion(m);
        void navigate(fallback, { replace: true, viewTransition: true });
      }
    },
    [navigate],
  );

  return { go, back };
}
