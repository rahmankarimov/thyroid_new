import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useT } from "../i18n";

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const t = useT();
  const [newPw, setNewPw]     = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (newPw.length < 6)    { setError(t("cp.tooShort")); return; }
    if (newPw !== confirm)   { setError(t("cp.mismatch")); return; }
    setLoading(true);
    try {
      await api.put("/users/me/change-password", { newPassword: newPw });
      // Clear the flag in localStorage
      const raw = localStorage.getItem("thyroai_user");
      if (raw) {
        const stored = JSON.parse(raw) as Record<string, unknown>;
        stored.mustChangePassword = false;
        localStorage.setItem("thyroai_user", JSON.stringify(stored));
      }
      navigate("/patients");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("cp.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "40px 36px", width: 420, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
            {t("cp.title")}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>
            {t("cp.subtitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
              {t("cp.new")}
            </label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => { setNewPw(e.target.value); setError(""); }}
              placeholder={t("cp.newPlaceholder")}
              required
              style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 14, outline: "none", boxSizing: "border-box", background: "var(--bg-base)", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
              {t("cp.confirm")}
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(""); }}
              placeholder={t("cp.confirmPlaceholder")}
              required
              style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 14, outline: "none", boxSizing: "border-box", background: "var(--bg-base)", color: "var(--text-primary)" }}
            />
          </div>

          {error && (
            <div style={{ background: "var(--danger-tint)", border: "1px solid var(--accent-danger)", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "var(--accent-danger)" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ background: "var(--accent-blue)", color: "#fff", border: "none", borderRadius: 6, padding: "11px", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", marginTop: 4, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? t("cp.updating") : t("cp.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
