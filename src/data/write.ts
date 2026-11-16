import { useSyncExternalStore } from "react";

/**
 * 書き込みの受け付け（Scope Q14、06-tech 6章）。
 * Firestore は書き込みをまず端末に保存し、画面にすぐ反映する。サーバーに届くのは通信できるときで、
 * 書き込みの Promise はそのときまで完了しない。そのため完了を待たずに戻り、
 * 届いていない件数（未同期）と、後から分かった失敗をここで数えて画面に伝える。
 */
let pending = 0;
const pendingListeners = new Set<() => void>();
const failureListeners = new Set<() => void>();

function setPending(n: number): void {
  pending = n;
  pendingListeners.forEach((l) => l());
}

/**
 * 書き込みを始め、サーバーに届くのを待たずに戻る。
 * 値の誤りなど、その場で分かる失敗は例外として投げる（画面は writeErrorMessage で示す）。
 * サーバーに拒否されたときは端末の内容も元に戻るので、onWriteFailure で知らせる。
 */
export function queuedWrite(op: () => Promise<unknown>): void {
  const p = op();
  setPending(pending + 1);
  p.then(
    () => setPending(pending - 1),
    () => {
      setPending(pending - 1);
      failureListeners.forEach((l) => l());
    },
  );
}

function subscribePending(l: () => void): () => void {
  pendingListeners.add(l);
  return () => {
    pendingListeners.delete(l);
  };
}

/** この起動中に受け付けて、まだサーバーに届いていない書き込みがあるか。 */
export function hasPendingWrites(): boolean {
  return pending > 0;
}

export function usePendingWrites(): boolean {
  return useSyncExternalStore(subscribePending, hasPendingWrites);
}

/** 受け付けた書き込みが、後からサーバーに拒否されたときに呼ぶ。 */
export function onWriteFailure(l: () => void): () => void {
  failureListeners.add(l);
  return () => {
    failureListeners.delete(l);
  };
}

function subscribeOnline(l: () => void): () => void {
  window.addEventListener("online", l);
  window.addEventListener("offline", l);
  return () => {
    window.removeEventListener("online", l);
    window.removeEventListener("offline", l);
  };
}

/** 端末が通信できる状態か（ブラウザーの申告。圏外に近い場所では true のままのことがある）。 */
export function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, isOnline);
}

export function writeErrorMessage(_e: unknown): string {
  return "保存できませんでした。もう一度お試しください";
}

export const SYNC_FAILURE_MESSAGE = "同期できなかった記録があります";

/** 画面に示す同期の状態。 */
export interface SyncState {
  online: boolean;
  /** サーバーに届いていない記録がある */
  pending: boolean;
}
