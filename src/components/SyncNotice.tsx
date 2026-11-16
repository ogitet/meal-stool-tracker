import { useEffect, useState } from "react";
import { useSyncState } from "@/data/sync";
import { onWriteFailure, SYNC_FAILURE_MESSAGE, type SyncState } from "@/data/write";
import { useToast } from "./Toast";

/** 通信できるのに未同期が続くとき、表示を始めるまでの時間。保存のたびに一瞬出るのを避ける。 */
const SYNCING_DELAY_MS = 1000;

/** 同期の状態を示す札。通信でき、未同期の記録もなければ何も出さない。 */
export function SyncBadge({ online, pending }: SyncState) {
  const text = !online ? (pending ? "オフライン・未同期の記録あり" : "オフライン") : pending ? "同期しています…" : null;
  if (!text) return null;
  return (
    <div className="sync" role="status">
      {text}
    </div>
  );
}

/**
 * 画面の上端に、オフラインであることと未同期の記録があることを示す（Scope Q14）。
 * 受け付けた記録がサーバーに拒否されたときは、トーストで知らせる。
 */
export function SyncNotice() {
  const { online, pending } = useSyncState();
  const toast = useToast();
  useEffect(() => onWriteFailure(() => toast(SYNC_FAILURE_MESSAGE)), [toast]);

  const syncing = online && pending;
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!syncing) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), SYNCING_DELAY_MS);
    return () => clearTimeout(timer);
  }, [syncing]);

  return <SyncBadge online={online} pending={online ? slow : pending} />;
}
