import { useState, useRef, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import { useT } from "../i18n";

const BACKEND_ORIGIN = (import.meta.env.VITE_BACKEND_ORIGIN as string | undefined) ?? "http://localhost:8080";
const RECAPTCHA_SITE_KEY = (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined) ?? "";

const PulseIcon = () => (
  <svg width="32" height="32" viewBox="0 0 22 22" fill="none">
    <polyline
      points="2,11 6,11 8,5 10,17 12,9 14,13 16,11 20,11"
      stroke="#1D4ED8"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const navigate = useNavigate();
  const t = useT();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (RECAPTCHA_SITE_KEY && !captchaToken) {
      setError(t("login.captcha"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_ORIGIN}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, recaptchaToken: captchaToken }),
      });
      if (!res.ok) {
        let msg = t("login.invalid");
        try {
          const body = await res.json() as { error?: string };
          if (body.error) msg = body.error;
        } catch { /* ignore */ }
        setError(msg);
        recaptchaRef.current?.reset();
        setCaptchaToken(null);
        return;
      }
      const json = await res.json() as { data: { token: string; refreshToken: string; user: { role: string; firstName: string; lastName: string; id: string; email: string } } };
      const { token, refreshToken, user } = json.data;
      if ((user.role as string).toUpperCase() !== "ADMIN") {
        setError(t("login.notAdmin"));
        recaptchaRef.current?.reset();
        setCaptchaToken(null);
        return;
      }
      localStorage.setItem(
        "thyroai_admin_user",
        JSON.stringify({
          role: "admin",
          name: `${user.firstName} ${user.lastName}`,
          id: user.id,
          email: user.email,
          token,
          refreshToken,
        })
      );
      navigate("/personnel");
    } catch {
      setError(t("login.noServer"));
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <PulseIcon />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{t("login.title")}</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 6 }}>
            {t("login.subtitle")}
          </p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t("login.email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@clinic.az"
              style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 14, outline: "none", boxSizing: "border-box", background: "var(--bg-base)" }}
              required
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t("login.password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 14, outline: "none", boxSizing: "border-box", background: "var(--bg-base)" }}
              required
            />
          </div>
          {RECAPTCHA_SITE_KEY && (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={RECAPTCHA_SITE_KEY}
                onChange={(token) => setCaptchaToken(token)}
                onExpired={() => setCaptchaToken(null)}
              />
            </div>
          )}
          {error && (
            <div style={{ background: "var(--danger-tint)", border: "1px solid var(--accent-danger)", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "var(--accent-danger)" }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{ background: "var(--accent-blue)", color: "#fff", border: "none", borderRadius: 6, padding: 11, fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", marginTop: 4, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? t("login.signingIn") : t("login.signIn")}
          </button>
        </form>
      </div>
    </div>
  );
}
