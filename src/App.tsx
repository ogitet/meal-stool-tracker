import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Loading } from "./components/Status";
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

export function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="screen">
        <Loading text="" />
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <UserDataProvider uid={user.uid}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Calendar />} />
            <Route path="/day/:date" element={<DayDetail />} />
            <Route path="/meal/:date/:slot" element={<MealForm />} />
            <Route path="/meal/:date/:slot/:id" element={<MealForm />} />
            <Route path="/stool/:id" element={<StoolForm />} />
            <Route path="/categories" element={<CategoryList />} />
            <Route path="/categories/:id" element={<CategoryEdit />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </UserDataProvider>
  );
}
