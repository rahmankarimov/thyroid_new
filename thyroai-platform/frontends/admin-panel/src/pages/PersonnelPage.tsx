import { useState, useEffect, useContext } from "react";
import { UserPlus, KeyRound, Trash2, X } from "lucide-react";
import { adminDataService } from "../services/adminDataService";
import type { DoctorUser, Role, UserPermission } from "../types/admin";
import { ToastContext } from "../App";
import { useT } from "../i18n";

// ── Small reusable toggle ──────────────────────────────────────────────────
function MiniToggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div
      onClick={() => !disabled && onChange(!value)}
      style={{ width: 36, height: 20, borderRadius: 99, background: value ? "var(--accent-blue)" : "var(--border)", position: "relative", cursor: disabled ? "default" : "pointer", transition: "background 0.2s", flexShrink: 0 }}
    >
      <div style={{ position: "absolute", top: 2, left: value ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "var(--shadow-xs)" }} />
    </div>
  );
}

// ── Add User Modal ─────────────────────────────────────────────────────────
interface AddModalProps { onClose: () => void; onCreated: (u: DoctorUser) => void; }

function AddUserModal({ onClose, onCreated }: AddModalProps) {
  const showToast = useContext(ToastContext);
  const t = useT();
  const [roles, setRoles]   = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState(""); // roleId or "ADMIN"
  const [form, setForm]     = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  useEffect(() => {
    adminDataService.getRoles().then(setRoles).catch(() => {});
  }, []);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); setErr(""); }

  async function submit() {
    if (!form.firstName || !form.lastName || !form.email || !form.password) { setErr(t("personnel.add.allRequired")); return; }
    if (form.password.length < 6) { setErr(t("personnel.add.pwShort")); return; }
    setSaving(true);
    try {
      const user = await adminDataService.createUser({
        ...form,
        role: "DOCTOR",
        customRoleId: selectedRole || undefined,
      });
      showToast(t("personnel.add.added", { name: `${user.firstName} ${user.lastName}` }), "success");
      onCreated(user);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : t("personnel.add.createFailed"));
    } finally { setSaving(false); }
  }

  const inputStyle = { width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box" as const, background: "var(--bg-base)", color: "var(--text-primary)" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(38,48,63,0.35)", backdropFilter: "blur(2px)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", padding: 28, width: 440, boxShadow: "var(--shadow-lg)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{t("personnel.add.title")}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}><X size={18} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>{t("personnel.add.firstName")}</label>
              <input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder={t("personnel.add.firstNamePh")} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>{t("personnel.add.lastName")}</label>
              <input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder={t("personnel.add.lastNamePh")} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>{t("personnel.add.email")}</label>
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder={t("personnel.add.emailPh")} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>{t("personnel.add.password")}</label>
            <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder={t("personnel.add.passwordPh")} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>{t("personnel.add.role")}</label>
            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} style={inputStyle}>
              <option value="">{t("personnel.add.selectRole")}</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          {err && <p style={{ color: "var(--accent-danger)", fontSize: 12, margin: 0 }}>{err}</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button onClick={onClose} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 18px", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)" }}>{t("common.cancel")}</button>
            <button onClick={() => void submit()} disabled={saving} style={{ background: "var(--accent-blue)", color: "#fff", border: "none", borderRadius: 10, padding: "8px 18px", cursor: saving ? "default" : "pointer", fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
              {saving ? t("personnel.add.adding") : t("personnel.add.submit")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reset Password Modal ───────────────────────────────────────────────────
interface ResetModalProps { user: DoctorUser; onClose: () => void; }

function ResetPasswordModal({ user, onClose }: ResetModalProps) {
  const showToast = useContext(ToastContext);
  const t = useT();
  const [pw, setPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (pw.length < 6) { setErr(t("personnel.add.pwShort")); return; }
    setSaving(true);
    try {
      await adminDataService.resetPassword(user.id, pw);
      showToast(t("personnel.reset.success"), "success");
      onClose();
    } catch { setErr(t("personnel.reset.failed")); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(38,48,63,0.35)", backdropFilter: "blur(2px)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", padding: 28, width: 380, boxShadow: "var(--shadow-lg)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{t("personnel.reset.title")}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 14px" }}>
          {t("personnel.reset.desc", { name: `${user.firstName} ${user.lastName}` })}
        </p>
        <input type="password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} placeholder={t("personnel.reset.placeholder")}
          style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 8, background: "var(--bg-base)", color: "var(--text-primary)" }} />
        {err && <p style={{ color: "var(--accent-danger)", fontSize: 12, margin: "0 0 8px" }}>{err}</p>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 18px", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)" }}>{t("common.cancel")}</button>
          <button onClick={() => void submit()} disabled={saving} style={{ background: "var(--accent-blue)", color: "#fff", border: "none", borderRadius: 10, padding: "8px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            {saving ? t("personnel.reset.saving") : t("personnel.reset.submit")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Permission columns ─────────────────────────────────────────────────────
const PERM_COLS: { key: keyof UserPermission; label: string; short: string }[] = [
  { key: "active",             label: "perm.active.label",    short: "perm.active.short"    },
  { key: "canAnnotate",        label: "perm.annotate.label",  short: "perm.annotate.short"  },
  { key: "canViewAnnotations", label: "perm.viewAnn.label",   short: "perm.viewAnn.short"   },
  { key: "canSubmitDiagnosis", label: "perm.diagnosis.label", short: "perm.diagnosis.short" },
  { key: "canSeeAi",           label: "perm.ai.label",        short: "perm.ai.short"        },
  { key: "canSeeGallery",      label: "perm.gallery.label",   short: "perm.gallery.short"   },
  { key: "mustChangePassword", label: "perm.pwd.label",       short: "perm.pwd.short"       },
  { key: "canSeePatients",     label: "perm.patients.label",  short: "perm.patients.short"  },
];

// ── Main page ─────────────────────────────────────────────────────────────
export function PersonnelPage() {
  const showToast = useContext(ToastContext);
  const t = useT();
  const [users, setUsers]             = useState<DoctorUser[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showAdd, setShowAdd]         = useState(false);
  const [resetTarget, setResetTarget] = useState<DoctorUser | null>(null);
  const [saving, setSaving]           = useState<Set<string>>(new Set());

  useEffect(() => {
    adminDataService.getUsers()
      .then((u) => setUsers(u))
      .catch(() => showToast(t("personnel.loadFailed"), "error"))
      .finally(() => setLoading(false));
  }, []);

  async function togglePermission(user: DoctorUser, key: keyof UserPermission, val: boolean) {
    const updated = { ...user.permissions, [key]: val };
    setSaving((s) => new Set(s).add(user.id + key));
    try {
      const saved = await adminDataService.updatePermissions(user.id, updated);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, permissions: saved } : u));
    } catch { showToast(t("personnel.permFailed"), "error"); }
    finally { setSaving((s) => { const n = new Set(s); n.delete(user.id + key); return n; }); }
  }

  async function handleDelete(user: DoctorUser) {
    if (!confirm(t("personnel.deleteConfirm", { name: `${user.firstName} ${user.lastName}` }))) return;
    try {
      await adminDataService.deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      showToast(t("personnel.deleted"), "success");
    } catch { showToast(t("personnel.deleteFailed"), "error"); }
  }

  const thStyle: React.CSSProperties = {
    padding: "14px 12px", textAlign: "center", fontSize: 12, fontWeight: 600,
    color: "var(--text-secondary)", letterSpacing: 0, textTransform: "none",
    whiteSpace: "nowrap", borderBottom: "1px solid var(--hairline)",
  };

  return (
    <div className="page-content" style={{ padding: "32px 36px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{t("personnel.title")}</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
            {t("personnel.subtitle")}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ display: "flex", alignItems: "center", gap: 7, background: "var(--accent-blue)", color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
        >
          <UserPlus size={15} /> {t("personnel.addUser")}
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)", fontSize: 14 }}>{t("personnel.loading")}</div>
      ) : (
        <div className="soft-table-wrap" style={{ overflow: "auto" }}>
          <table className="soft-table" style={{ minWidth: 780 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: "left", paddingLeft: 20 }}>{t("personnel.col.name")}</th>
                <th style={{ ...thStyle, textAlign: "left" }}>{t("personnel.col.role")}</th>
                {PERM_COLS.map((c) => (
                  <th key={c.key} style={thStyle} title={t(c.label)}>{t(c.short)}</th>
                ))}
                <th style={{ ...thStyle }}>{t("personnel.col.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: "1px solid var(--hairline)" }}>
                  {/* Name + email */}
                  <td style={{ padding: "14px 12px 14px 20px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                      {user.firstName} {user.lastName}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "IBM Plex Mono, monospace", marginTop: 2 }}>
                      {user.email}
                    </div>
                  </td>

                  {/* Role badge — custom role name if set, else system role */}
                  <td style={{ padding: "14px 12px" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 99,
                      color: user.role === "ADMIN" ? "var(--accent-blue)" : "var(--text-secondary)",
                      background: user.role === "ADMIN" ? "var(--accent-blue-light)" : "var(--bg-muted)",
                    }}>
                      {user.customRoleName ?? (user.role === "ADMIN" ? t("personnel.roleAdmin") : t("personnel.roleDoctor"))}
                    </span>
                  </td>

                  {/* Permission toggles */}
                  {PERM_COLS.map((c) => (
                    <td key={c.key} style={{ padding: "14px 12px", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <MiniToggle
                          value={user.permissions[c.key] as boolean}
                          onChange={(v) => void togglePermission(user, c.key, v)}
                          disabled={saving.has(user.id + c.key)}
                        />
                      </div>
                    </td>
                  ))}

                  {/* Actions */}
                  <td style={{ padding: "14px 12px", textAlign: "center" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                      <button
                        onClick={() => setResetTarget(user)}
                        title={t("personnel.resetTitle")}
                        style={{ background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: 10, padding: "5px 8px", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}
                      >
                        <KeyRound size={13} />
                      </button>
                      <button
                        onClick={() => void handleDelete(user)}
                        title={t("personnel.deleteTitle")}
                        style={{ background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: 10, padding: "5px 8px", cursor: "pointer", color: "var(--accent-danger)", display: "flex", alignItems: "center" }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)", fontSize: 14 }}>
              {t("personnel.none")}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{ margin: 16, display: "flex", flexWrap: "wrap", gap: "6px 20px" }}>
        {PERM_COLS.map((c) => (
          <span key={c.key} style={{ fontSize: 10, color: "var(--text-secondary)" }}>
            <strong>{t(c.short)}</strong> - {t(c.label)}
          </span>
        ))}
      </div>

      {showAdd     && <AddUserModal onClose={() => setShowAdd(false)} onCreated={(u) => { setUsers((prev) => [...prev, u]); setShowAdd(false); }} />}
      {resetTarget && <ResetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} />}
    </div>
  );
}
