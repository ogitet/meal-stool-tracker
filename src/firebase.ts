import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const required = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

for (const k of required) {
  if (!import.meta.env[k]) {
    throw new Error(`環境変数 ${k} が未設定です。.env.example を参考に .env.local を作成してください。`);
  }
}

export const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

export const auth = getAuth(app);
/**
 * 記録を端末（IndexedDB）にも保存し、オフラインでも読み書きできるようにする（Scope Q14、06-tech 6章）。
 * オフラインでの書き込みは端末に残り、通信が戻ると Firestore が自動で送る。
 * 端末に保存できないブラウザー（プライベートブラウズなど）では、メモリ内の保存に切り替わる。
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
