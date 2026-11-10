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
        <div className="appicon" aria-hidden="true"><i /><i /><i /></div>
        <h1 className="appname" style={{ margin: "0 0 20px" }}>ひびログ</h1>
        <label htmlFor="email" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>メールアドレス</label>
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
        <label htmlFor="password" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>パスワード</label>
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
        <button type="submit" className="btn pri" style={{ flex: "none", marginTop: 8 }} disabled={busy}>
          {busy ? "ログインしています…" : "ログイン"}
        </button>
        {error && <div className="msg center" role="alert" style={{ padding: 0 }}>{error}</div>}
      </form>
    </div>
  );
}
