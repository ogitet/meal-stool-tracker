import { useRef, useState, type MouseEvent, type PointerEvent } from "react";

/** 左へ払う＝次（+1）、右へ払う＝前（-1）。 */
export type SwipeDir = 1 | -1;

const LOCK = 10; // この距離を動いた時点で、横か縦かを決める
const THRESHOLD = 60; // 送るのに必要な横の移動量

/**
 * 横スワイプの検出。縦のスクロールはブラウザに任せる（対象要素に touch-action: pan-y を付ける）。
 * 払っている間の横の移動量 dx を返し、指に少しついてくる表現に使う。
 */
export function useSwipe(onSwipe: (dir: SwipeDir) => void) {
  const start = useRef<{ x: number; y: number; id: number; axis: "x" | "y" | null } | null>(null);
  const swiped = useRef(false);
  const [dx, setDx] = useState(0);

  function end(e: PointerEvent<HTMLElement>, commit: boolean) {
    const s = start.current;
    start.current = null;
    if (!s || e.pointerId !== s.id || s.axis !== "x") return;
    const mx = e.clientX - s.x;
    setDx(0);
    // 払った直後の click（日付を開く）を止める
    swiped.current = true;
    setTimeout(() => {
      swiped.current = false;
    }, 0);
    if (commit && Math.abs(mx) >= THRESHOLD) onSwipe(mx < 0 ? 1 : -1);
  }

  const handlers = {
    onPointerDown(e: PointerEvent<HTMLElement>) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      start.current = { x: e.clientX, y: e.clientY, id: e.pointerId, axis: null };
    },
    onPointerMove(e: PointerEvent<HTMLElement>) {
      const s = start.current;
      if (!s || e.pointerId !== s.id || s.axis === "y") return;
      const mx = e.clientX - s.x,
        my = e.clientY - s.y;
      if (!s.axis) {
        if (Math.abs(mx) < LOCK && Math.abs(my) < LOCK) return;
        s.axis = Math.abs(mx) > Math.abs(my) ? "x" : "y";
        if (s.axis === "y") return;
        // 指が要素の外へ出ても追えるようにする。捕捉できない環境でも払う操作は続ける
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* 捕捉なしで続行 */
        }
      }
      setDx(mx);
    },
    onPointerUp(e: PointerEvent<HTMLElement>) {
      end(e, true);
    },
    onPointerCancel(e: PointerEvent<HTMLElement>) {
      end(e, false);
    },
    onClickCapture(e: MouseEvent<HTMLElement>) {
      if (!swiped.current) return;
      e.preventDefault();
      e.stopPropagation();
    },
  };

  return { dx, handlers };
}
