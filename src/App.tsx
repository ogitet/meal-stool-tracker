import { useEffect, useRef } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { SyncNotice } from "./components/SyncNotice";
import { ToastProvider } from "./components/Toast";
import { useAuth } from "./data/useAuth";
import { UserDataProvider } from "./data/UserDataContext";
import { Calendar } from "./screens/Calendar";
import { ItemEdit } from "./screens/ItemEdit";
import { ItemList } from "./screens/ItemList";
import { Login } from "./screens/Login";
import { StoolForm } from "./screens/StoolForm";

// データルーターを使う（画面遷移の View Transitions に必要）。
const router = createBrowserRouter([
  { path: "/", element: <Calendar /> },
  { path: "/stool/:id", element: <StoolForm /> },
  { path: "/items", element: <ItemList /> },
  { path: "/items/:id", element: <ItemEdit /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);

export function App() {
  const { user, loading } = useAuth();

  // ログイン画面を経てログインしたら、カレンダーから始める（Structure 8章：ログインの期限切れ）。
  // 起動時にすでにログイン済みなら、開いた URL のままにする。
  const shownLogin = useRef(false);
  useEffect(() => {
    if (loading) return;
    if (!user) shownLogin.current = true;
    else if (shownLogin.current) {
      shownLogin.current = false;
      void router.navigate("/", { replace: true });
    }
  }, [user, loading]);

  if (loading) return <div className="screen" />;
  if (!user) return <Login />;

  return (
    <UserDataProvider uid={user.uid}>
      <ToastProvider>
        <RouterProvider router={router} />
        <SyncNotice />
      </ToastProvider>
    </UserDataProvider>
  );
}
