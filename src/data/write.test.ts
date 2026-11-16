import { describe, expect, test, vi } from "vite-plus/test";
import { hasPendingWrites, onWriteFailure, queuedWrite } from "./write";

/** 書き込みの Promise を、外から完了・失敗させられるようにする。 */
function deferred() {
  let resolve!: () => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("queuedWrite", () => {
  test("サーバーに届くのを待たずに戻り、届くまで未同期として数える", async () => {
    const a = deferred();
    const b = deferred();
    queuedWrite(() => a.promise);
    queuedWrite(() => b.promise);
    expect(hasPendingWrites()).toBe(true);

    a.resolve();
    await a.promise;
    expect(hasPendingWrites()).toBe(true);

    b.resolve();
    await b.promise;
    expect(hasPendingWrites()).toBe(false);
  });

  test("後からサーバーに拒否されたら、未同期から外して失敗を知らせる", async () => {
    const onFailure = vi.fn();
    const off = onWriteFailure(onFailure);
    const a = deferred();
    queuedWrite(() => a.promise);

    a.reject(new Error("permission-denied"));
    await a.promise.catch(() => {});
    expect(hasPendingWrites()).toBe(false);
    expect(onFailure).toHaveBeenCalledTimes(1);

    off();
    const b = deferred();
    queuedWrite(() => b.promise);
    b.reject(new Error("not-found"));
    await b.promise.catch(() => {});
    expect(onFailure).toHaveBeenCalledTimes(1);
  });

  test("その場で分かる失敗は例外として投げ、未同期に数えない", () => {
    expect(() =>
      queuedWrite(() => {
        throw new Error("invalid data");
      }),
    ).toThrow("invalid data");
    expect(hasPendingWrites()).toBe(false);
  });
});
