import { waitForPendingWrites } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { useOnline, usePendingWrites, type SyncState } from "./write";

/** 前回までの起動で受け付けた書き込みの確認を、これ以上待ったら「未同期あり」とみなす時間。 */
const CARRIED_CHECK_MS = 500;

/**
 * 前回までの起動で受け付け、まだサーバーに届いていない書き込みがあるか。
 * 端末に残った書き込みは、アプリを開き直しても Firestore が送り直す。
 * 無ければ waitForPendingWrites はすぐ完了するので、少し待っても完了しないときだけ「あり」にする。
 */
function useCarriedWrites(): boolean {
  const [carried, setCarried] = useState(false);
  useEffect(() => {
    let done = false;
    const timer = setTimeout(() => !done && setCarried(true), CARRIED_CHECK_MS);
    const finish = () => {
      done = true;
      clearTimeout(timer);
      setCarried(false);
    };
    // ログアウトで待ちが打ち切られたときも、表示は消す
    waitForPendingWrites(db).then(finish, finish);
    return () => {
      done = true;
      clearTimeout(timer);
    };
  }, []);
  return carried;
}

/** 通信の状態と、未同期の記録の有無。ログイン後の画面で使う。 */
export function useSyncState(): SyncState {
  const online = useOnline();
  const current = usePendingWrites();
  const carried = useCarriedWrites();
  return { online, pending: current || carried };
}
