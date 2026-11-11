import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import { useAuth } from "./data/useAuth";
import { UserDataProvider } from "./data/UserDataContext";
import { Calendar } from "./screens/Calendar";
import { CategoryEdit } from "./screens/CategoryEdit";
import { CategoryList } from "./screens/CategoryList";
import { DayDetail } from "./screens/DayDetail";
import { Login } from "./screens/Login";
import { MealForm } from "./screens/MealForm";
import { StoolForm } from "./screens/StoolForm";

// データルーターを使う（画面遷移の View Transitions に必要）。
const router = createBrowserRouter([
  { path: "/", element: <Calendar /> },
  { path: "/day/:date", element: <DayDetail /> },
  { path: "/meal/:date/:slot", element: <MealForm /> },
  { path: "/meal/:date/:slot/:id", element: <MealForm /> },
  { path: "/stool/:id", element: <StoolForm /> },
  { path: "/categories", element: <CategoryList /> },
  { path: "/categories/:id", element: <CategoryEdit /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);

export function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="screen" />;
  if (!user) return <Login />;

  return (
    <UserDataProvider uid={user.uid}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </UserDataProvider>
  );
}
