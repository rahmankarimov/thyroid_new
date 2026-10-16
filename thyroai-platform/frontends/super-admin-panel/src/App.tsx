import { createContext } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { ToastContainer } from "./components/ToastContainer";
import { useToastState } from "./hooks/useToast";
import { useTheme } from "./hooks/useTheme";
import { LoginPage } from "./pages/LoginPage";
import { HospitalsPage } from "./pages/HospitalsPage";
import { HospitalDetailPage } from "./pages/HospitalDetailPage";
import { LanguageProvider } from "./i18n";

export const ToastContext = createContext<(msg: string, type?: "success" | "error" | "info") => void>(() => {});

function RequireAuth() {
  useTheme();
  const stored = localStorage.getItem("thyroai_super_admin_user");
  if (!stored) return <Navigate to="/login" replace />;
  try {
    const user = JSON.parse(stored) as { role?: string };
    if ((user.role ?? "").toUpperCase() !== "SUPER_ADMIN") return <Navigate to="/login" replace />;
  } catch {
    return <Navigate to="/login" replace />;
  }
  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <main style={{ marginLeft: "var(--sidebar-w)", flex: 1, background: "var(--bg-base)", minHeight: "100vh", transition: "margin-left 0.2s", minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  const { toasts, showToast, dismiss } = useToastState();

  return (
    <LanguageProvider>
    <ToastContext.Provider value={showToast}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Navigate to="/hospitals" replace />} />
            <Route path="/hospitals" element={<HospitalsPage />} />
            <Route path="/hospitals/:id" element={<HospitalDetailPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
    </LanguageProvider>
  );
}
