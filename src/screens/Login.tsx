import { useState, type FormEvent } from "react";
import { login, loginErrorMessage } from "../data/useAuth";

/** S-01 ログイン。登録画面は設けない（Scope F-07）。 */
export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(loginErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <form className="login" onSubmit={onSubmit}>
        <div className="logo" aria-hidden="true"><i /><i /><i /></div>
        <h1 className="appname">ひびログ</h1>
        <p className="tagline">日々を、押していく。</p>
        <label htmlFor="email" className="sr">メールアドレス</label>
        <input
          id="email"
          className="inp"
          type="email"
          inputMode="email"
          autoComplete="username"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label htmlFor="password" className="sr">パスワード</label>
        <input
          id="password"
          className="inp"
          type="password"
          autoComplete="current-password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="btn inv" disabled={busy}>
          {busy ? "ログインしています…" : "ログイン"}
        </button>
        {error && <div className="msg" role="alert">{error}</div>}
      </form>
    </div>
  );
}
