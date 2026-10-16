import { createContext, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { ToastContainer } from "./components/ToastContainer";
import { LoginPage } from "./pages/LoginPage";
import { SettingsPage } from "./pages/SettingsPage";
import { PersonnelPage } from "./pages/PersonnelPage";
import { PatientsPage } from "./pages/PatientsPage";
import { DicomInboxPage } from "./pages/DicomInboxPage";
import { useToastState } from "./hooks/useToast";
import { LanguageProvider, useT } from "./i18n";

export const ToastContext = createContext<(msg: string, type?: "success" | "error" | "info") => void>(() => {});

// ── Blocked modal ──────────────────────────────────────────────────────────────
function BlockedModal({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const t = useT();
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(38,48,63,0.4)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "36px 32px", width: 380, textAlign: "center", boxShadow: "var(--shadow-lg)" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--accent-blue-light)", border: "2px solid var(--accent-blue)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="6.5" r="2.8" fill="var(--accent-blue)" />
            <path d="M6.5 14.5c0-2.5 2.5-4 5.5-4s5.5 1.5 5.5 4v.5H6.5v-.5z" fill="var(--accent-blue)" />
            <path d="M12 13.2l-3.2 1.4v2.6c0 1.8 1.4 3 3.2 3.6 1.8-.6 3.2-1.8 3.2-3.6v-2.6L12 13.2z" fill="var(--accent-blue)" stroke="white" strokeWidth="0.8" strokeLinejoin="round" />
            <path d="M10.4 17.2l1.2 1.2 2-2.4" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>{t("blocked.title")}</h3>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>{message}</p>
        <button
          onClick={onDismiss}
          style={{ background: "var(--accent-blue)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%" }}
        >
          {t("blocked.goLogin")}
        </button>
      </div>
    </div>
  );
}

function RequireAuth() {
  const user = localStorage.getItem("thyroai_admin_user");
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <main style={{ marginLeft: "var(--sidebar-w)", flex: 1, background: "var(--bg-base)", minHeight: "100vh", transition: "margin-left 0.2s", minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const t = useT();
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null);

  useEffect(() => {
    function onBlocked(e: Event) {
      const msg = (e as CustomEvent<string>).detail ?? t("blocked.default");
      setBlockedMsg(msg);
    }
    window.addEventListener("thyroai_admin:blocked", onBlocked);
    return () => window.removeEventListener("thyroai_admin:blocked", onBlocked);
  }, [t]);

  function handleDismiss() {
    setBlockedMsg(null);
    localStorage.removeItem("thyroai_admin_user");
    navigate("/login");
  }

  return (
    <>
      {children}
      {blockedMsg && <BlockedModal message={blockedMsg} onDismiss={handleDismiss} />}
    </>
  );
}

export default function App() {
  const { toasts, showToast, dismiss } = useToastState();

  return (
    <LanguageProvider>
    <ToastContext.Provider value={showToast}>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/" element={<Navigate to="/personnel" replace />} />
              <Route path="/personnel" element={<PersonnelPage />} />
              <Route path="/patients"  element={<PatientsPage />} />
              <Route path="/dicom"     element={<DicomInboxPage />} />
              <Route path="/settings"  element={<SettingsPage />} />
            </Route>
          </Routes>
        </AppShell>
      </BrowserRouter>
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
    </LanguageProvider>
  );
}
