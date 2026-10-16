import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Settings, LogOut, Sun, Moon, Users, Stethoscope, ScanLine } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { api } from "../services/api";
import { useT } from "../i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";

const BrandMark = ({ size = 34 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 34 34" fill="none" style={{ flexShrink: 0, filter: "drop-shadow(0 3px 8px rgba(91,123,255,0.35))" }}>
    <defs>
      <linearGradient id="thyroaiMark" x1="0" y1="0" x2="34" y2="34" gradientUnits="userSpaceOnUse">
        <stop stopColor="#5B7BFF" />
        <stop offset="1" stopColor="#8A6BF0" />
      </linearGradient>
    </defs>
    <rect width="34" height="34" rx="11" fill="url(#thyroaiMark)" />
    <path d="M6 18.4h4.1l2.2-6.2a1 1 0 0 1 1.9.04l3 11.8a1 1 0 0 0 1.9.05l2-5.9h4.9"
      stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const navItems = [
  { to: "/personnel", icon: <Users size={18} />, label: "nav.personnel" },
  { to: "/patients",  icon: <Stethoscope size={18} />, label: "nav.patients" },
  { to: "/dicom",     icon: <ScanLine size={18} />, label: "nav.dicom" },
  { to: "/settings",  icon: <Settings size={18} />, label: "nav.settings" },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const t = useT();
  const raw = localStorage.getItem("thyroai_admin_user");
  const user = raw ? JSON.parse(raw) : { name: "Admin" };
  const initials = (user.name ?? "").trim().split(/\s+/).map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() || "A";
  const [hospitalName, setHospitalName] = useState("Admin Panel");

  useEffect(() => {
    api.get<{ name: string }>("/hospitals/mine")
      .then((h) => setHospitalName(h.name))
      .catch(() => {});
  }, []);

  function logout() {
    localStorage.removeItem("thyroai_admin_user");
    navigate("/login");
  }

  return (
    <aside
      className="sidebar"
      style={{
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 100,
      }}
    >
      <div className="sidebar-header" style={{ padding: "22px 18px 18px", display: "flex", alignItems: "center", gap: 11 }}>
        <BrandMark />
        <span
          className="sidebar-logo-text"
          title={hospitalName}
          style={{
            flex: 1,
            minWidth: 0,
            fontFamily: "Manrope, system-ui, sans-serif",
            fontWeight: 700,
            fontSize: 16,
            lineHeight: 1.25,
            color: "var(--text-primary)",
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            overflow: "hidden",
            wordBreak: "break-word",
          }}
        >
          {hospitalName}
        </span>
      </div>

      <nav style={{ flex: 1, padding: "10px 0" }}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 11,
              margin: "3px 12px",
              padding: "8px 10px",
              borderRadius: 12,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? "var(--accent-blue)" : "var(--text-secondary)",
              ...(isActive ? { background: "var(--accent-blue-light)" } : {}),
              transition: "all 0.15s",
            })}
          >
            {({ isActive }) => (
              <>
                <span style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  background: isActive ? "var(--bg-surface)" : "var(--bg-muted)",
                  color: isActive ? "var(--accent-blue)" : "var(--text-secondary)",
                  boxShadow: isActive ? "var(--shadow-xs)" : "none",
                  transition: "all 0.15s",
                }}>{item.icon}</span>
                <span className="sidebar-label">{t(item.label)}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer" style={{ padding: "16px 20px", borderTop: "1px solid var(--hairline)", display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="sidebar-footer-text" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--bg-muted)", border: "1px solid var(--hairline)", borderRadius: 12 }}>
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: "var(--accent-blue-light)", color: "var(--accent-blue)", fontSize: 12, fontWeight: 700, letterSpacing: "0.3px" }}>{initials}</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div title={user.name} style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t("sidebar.role")}</div>
          </div>
        </div>
        <LanguageSwitcher />
        <div className="sidebar-footer-buttons" style={{ display: "flex", gap: 8 }}>
          <button
            onClick={toggle}
            title={theme === "dark" ? t("sidebar.toLight") : t("sidebar.toDark")}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: 10, padding: "7px 10px", cursor: "pointer", color: "var(--text-secondary)" }}
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button
            onClick={logout}
            title={t("sidebar.logout")}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "none", border: "1px solid var(--border)", borderRadius: 10, padding: "7px 12px", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)" }}
          >
            <LogOut size={14} />
            <span className="sidebar-label">{t("sidebar.logout")}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
