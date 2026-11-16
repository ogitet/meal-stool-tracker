import { useOnline, usePendingWrites, type SyncState } from "@/data/write";

/** デモでは、オフラインの間に受け付けた記録だけを未同期として数える（store.ts の accept）。 */
export function useSyncState(): SyncState {
  return { online: useOnline(), pending: usePendingWrites() };
}
