import {
  getDoc,
  getDocFromCache,
  getDocs,
  getDocsFromCache,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type Query,
  type QuerySnapshot,
  type SnapshotOptions,
} from "firebase/firestore";
import { isOnline } from "./write";

/** 保存前の記録では、サーバーが付ける日時（createdAt など）を端末の時刻で見積もる。 */
export const ESTIMATE: SnapshotOptions = { serverTimestamps: "estimate" };

/** サーバーの応答をこれ以上待たない時間。電波が弱い場所で、記録画面を開けなくなるのを防ぐ。 */
const SERVER_READ_TIMEOUT_MS = 3000;

/**
 * 1件の読み込み。端末に保存されていればそれを返し、無ければサーバーに問い合わせる。
 * 通信できないときは「無い」（null）とみなす。オフラインでも新規の記録を始められるようにするため。
 */
export async function getDocCacheFirst(ref: DocumentReference<DocumentData>): Promise<DocumentSnapshot | null> {
  try {
    return await getDocFromCache(ref);
  } catch {
    // 端末に無い。サーバーに問い合わせる
  }
  if (!isOnline()) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), SERVER_READ_TIMEOUT_MS);
  });
  try {
    return await Promise.race([getDoc(ref), timeout]);
  } catch (e) {
    if (typeof e === "object" && e && "code" in e && e.code === "unavailable") return null;
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** 一覧の読み込み。オフラインのときは、サーバーを待たずに端末の保存分から返す。 */
export function getDocsOfflineAware(q: Query<DocumentData>): Promise<QuerySnapshot<DocumentData>> {
  return isOnline() ? getDocs(q) : getDocsFromCache(q);
}
