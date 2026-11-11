import { useSyncExternalStore } from "react";
import type { User } from "firebase/auth";

export interface AuthState {
  user: User | null;
  loading: boolean;
}

/** `?login` を付けて開くと、ログアウトした状態から始まる。 */
let user: User | null = new URLSearchParams(window.location.search).has("login") ? null : ({ uid: "demo" } as User);
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export function useAuth(): AuthState {
  return { user: useSyncExternalStore(subscribe, () => user), loading: false };
}

export async function login(): Promise<void> {
  user = { uid: "demo" } as User;
  listeners.forEach((l) => l());
}

export async function logout(): Promise<void> {
  user = null;
  listeners.forEach((l) => l());
}

export function loginErrorMessage(): string {
  return "ログインできませんでした";
}
