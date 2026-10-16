import { createContext, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from "react-router-dom";

import { ToastContainer } from "./components/ToastContainer";
import { LoginPage } from "./pages/LoginPage";
import { ExaminationsPage } from "./pages/ExaminationsPage";
import { ExaminationDetailPage } from "./pages/ExaminationDetailPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { PatientExaminationsPage } from "./pages/PatientExaminationsPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { Sidebar } from "./components/Sidebar";

import { useToastState } from "./hooks/useToast";
import { LanguageProvider, useT } from "./i18n";
import { medicalDataService } from "./services/medicalDataService";

export const ToastContext = createContext<(msg: string, type?: "success" | "error" | "info") => void>(() => {});

// ── Blocked modal ────────────────────────────────────────────────────────────
function BlockedModal({ message, onDismiss }: { message: string; onDismiss: () => void; }) {
  const t = useT();
  const isAssignmentIssue = message.includes("assigned");
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(38,48,63,0.4)", backdropFilter: "blur(2px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "var(--bg-surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)", padding: "36px 32px", width: 380, textAlign: "center",
        boxShadow: "var(--shadow-lg)",
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "var(--accent-blue-light)", border: "2px solid var(--accent-blue)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px",
        }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Head */}
            <circle cx="12" cy="6.5" r="2.8" fill="var(--accent-blue)" />
            {/* Shoulders */}
            <path d="M6.5 14.5c0-2.5 2.5-4 5.5-4s5.5 1.5 5.5 4v.5H6.5v-.5z" fill="var(--accent-blue)" />
            {/* Shield */}
            <path d="M12 13.2l-3.2 1.4v2.6c0 1.8 1.4 3 3.2 3.6 1.8-.6 3.2-1.8 3.2-3.6v-2.6L12 13.2z"
              fill="var(--accent-blue)" stroke="white" strokeWidth="0.8" strokeLinejoin="round" />
            {/* Shield checkmark */}
            <path d="M10.4 17.2l1.2 1.2 2-2.4" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>
          {t("blocked.title")}
        </h3>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          {message}
        </p>
        <button
          onClick={onDismiss}
          style={{
            background: "var(--accent-blue)", color: "#fff", border: "none",
            borderRadius: 10, padding: "10px 28px", fontSize: 14, fontWeight: 600,
            cursor: "pointer", width: "100%",
          }}
        >
          {isAssignmentIssue ? t("blocked.goPatients") : t("blocked.goLogin")}
        </button>
      </div>
    </div>
  );
}

function IndexRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const raw = localStorage.getItem("thyroai_user");
    const user = raw ? JSON.parse(raw) : null;
    if (user?.role === "admin" || user?.role === "super_admin") {
      navigate("/admin", { replace: true });
      return;
    }

    medicalDataService.getNextRandomExaminationId()
      .then((data) => {
        navigate(`/patients/${data.patientId}/examinations/${data.examId}`, { replace: true });
      })
      .catch((err) => {
        console.error("Queue empty or error:", err);
      });
  }, [navigate]);

  return <div style={{ padding: 20 }}>Yüklənir...</div>;
}

function RequireAuth() {
  const raw = localStorage.getItem("thyroai_user");
  if (!raw) return <Navigate to="/login" replace />;
  const stored = JSON.parse(raw) as { mustChangePassword?: boolean };
  if (stored.mustChangePassword) return <Navigate to="/change-password" replace />;
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar /><main style={{ flex: 1, background: "var(--bg-base)", minWidth: 0, height: "100%" }}>
        <Outlet />
      </main>
    </div>
  );
}

function RequireChangePassword() {
  const raw = localStorage.getItem("thyroai_user");
  if (!raw) return <Navigate to="/login" replace />;
  const stored = JSON.parse(raw) as { mustChangePassword?: boolean };
  if (!stored.mustChangePassword) return <Navigate to="/patients" replace />;
  return <ChangePasswordPage />;
}

// ── App shell that listens for the blocked event ─────────────────────────────
function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const t = useT();
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null);

  useEffect(() => {
    function onBlocked(e: Event) {
      const msg = (e as CustomEvent<string>).detail ?? t("blocked.default");
      setBlockedMsg(msg);
    }
    window.addEventListener("thyroai:blocked", onBlocked);
    return () => window.removeEventListener("thyroai:blocked", onBlocked);
  }, [t]);

  function handleDismiss() {
    const msg = blockedMsg ?? "";
    setBlockedMsg(null);
    if (msg.includes("assigned")) {
      navigate("/patients");
    } else {
      localStorage.removeItem("thyroai_user");
      navigate("/login");
    }
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
            <Route path="/change-password" element={<RequireChangePassword />} />
            <Route element={<RequireAuth />}>
              <Route path="/" element={<IndexRedirect />} />
              <Route path="/patients" element={<ExaminationsPage />} />
              <Route path="/patients/:patientId" element={<PatientExaminationsPage />} />
              <Route path="/patients/:patientId/examinations/:examId" element={<ExaminationDetailPage />} />

              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
              {/* Legacy paths → new Patients flow */}
              <Route path="/examinations" element={<Navigate to="/patients" replace />} />
              <Route path="/examinations/:patientId" element={<Navigate to="/patients" replace />} />
            </Route>
          </Routes>
        </AppShell>
      </BrowserRouter>
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
    </LanguageProvider>
  );
}
