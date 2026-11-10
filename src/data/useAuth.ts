import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "../firebase";

export interface AuthState {
  user: User | null;
  /** 初回の判定が終わるまで true */
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: auth.currentUser, loading: true });
  useEffect(() => onAuthStateChanged(auth, (user) => setState({ user, loading: false })), []);
  return state;
}

export async function login(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export function loginErrorMessage(e: unknown): string {
  const code = typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : "";
  switch (code) {
    case "auth/invalid-email":
      return "メールアドレスの形式が正しくありません";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "メールアドレスまたはパスワードが違います";
    case "auth/too-many-requests":
      return "試行回数が多すぎます。しばらく待ってからお試しください";
    case "auth/network-request-failed":
      return "通信できないためログインできません";
    default:
      return "ログインできませんでした";
  }
}
