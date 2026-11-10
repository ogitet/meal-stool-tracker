/**
 * Firestore の書き込みは、通信できないと完了を待ち続ける。
 * MVP ではオフライン記録に対応しないため（Scope Q14）、通信状態と時間上限で失敗にする（06-tech 6章）。
 */
export class OfflineError extends Error {
  constructor() {
    super("通信できないため保存できません");
    this.name = "OfflineError";
  }
}

export class TimeoutError extends Error {
  constructor() {
    super("保存できませんでした。もう一度お試しください");
    this.name = "TimeoutError";
  }
}

const WRITE_TIMEOUT_MS = 8000;

export async function guardedWrite<T>(op: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new OfflineError();
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError()), WRITE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([op(), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function writeErrorMessage(e: unknown): string {
  if (e instanceof OfflineError || e instanceof TimeoutError) return e.message;
  return "保存できませんでした。もう一度お試しください";
}
