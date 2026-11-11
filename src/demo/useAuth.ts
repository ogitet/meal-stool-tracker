import type { User } from "firebase/auth";

export interface AuthState {
  user: User | null;
  loading: boolean;
}

/** `?login` を付けるとログイン画面を表示する。 */
export function useAuth(): AuthState {
  const loggedOut = new URLSearchParams(window.location.search).has("login");
  return { user: loggedOut ? null : ({ uid: "demo" } as User), loading: false };
}

export async function login(): Promise<void> {
  window.location.assign("/");
}

export async function logout(): Promise<void> {}

export function loginErrorMessage(): string {
  return "ログインできませんでした";
}
