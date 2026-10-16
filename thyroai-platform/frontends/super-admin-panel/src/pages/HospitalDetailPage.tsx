import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Cpu, PenLine, Eye, ClipboardList, Image, UserPlus, X, Mail, User as UserIcon, Lock, TriangleAlert, ScanLine, Plus, Trash2 } from "lucide-react";
import { api } from "../services/api";
import type { Hospital, HospitalAdmin, HospitalFeatureGrants, HospitalModality } from "../types/superAdmin";
import { ToastContext } from "../App";
import { useT } from "../i18n";

// ── Feature grant toggle card ──────────────────────────────────────────────

function GrantCard({
  icon, title, description, value, onChange, disabled,
}: {
  icon: React.ReactNode; title: string; description: string;
  value: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  const t = useT();
  return (
    <div className="soft-card" style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 16, opacity: disabled ? 0.7 : 1 }}>
      <div style={{ background: "var(--bg-muted)", borderRadius: 10, padding: 12, color: "var(--accent-blue)", display: "flex" }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{description}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div
          onClick={() => !disabled && onChange(!value)}
          style={{ width: 44, height: 24, borderRadius: 99, background: value ? "var(--accent-blue)" : "var(--border)", position: "relative", cursor: disabled ? "not-allowed" : "pointer", transition: "background 0.2s" }}
        >
          <div style={{ position: "absolute", top: 4, left: value ? 22 : 4, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "var(--shadow-xs)" }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: value ? "var(--accent-success)" : "var(--accent-danger)" }}>
          {value ? t("detail.granted") : t("detail.blocked")}
        </span>
      </div>
    </div>
  );
}

// ── Add Admin Modal ────────────────────────────────────────────────────────

function AddAdminModal({ hospitalId, onClose, onCreated }: { hospitalId: string; onClose: () => void; onCreated: (a: HospitalAdmin) => void }) {
  const showToast = useContext(ToastContext);
  const t = useT();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); setErr(""); }

  async function submit() {
    if (!form.firstName || !form.lastName || !form.email || !form.password) { setErr(t("detail.addAdmin.required")); return; }
    if (form.password.length < 6) { setErr(t("detail.addAdmin.pwShort")); return; }
    setSaving(true);
    try {
      const admin = await api.post<HospitalAdmin>(`/hospitals/${hospitalId}/admins`, form);
      showToast(t("detail.addAdmin.created", { name: `${admin.firstName} ${admin.lastName}` }), "success");
      onCreated(admin);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : t("detail.addAdmin.createFailed"));
    } finally { setSaving(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", border: "1px solid var(--border)",
    borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box",
    background: "var(--bg-base)", color: "var(--text-primary)",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(38,48,63,0.35)", backdropFilter: "blur(2px)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", padding: 28, width: 440, boxShadow: "var(--shadow-lg)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{t("detail.addAdmin.title")}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}><X size={18} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t("detail.addAdmin.firstName")}</label>
              <input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder={t("detail.addAdmin.firstNamePh")} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t("detail.addAdmin.lastName")}</label>
              <input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder={t("detail.addAdmin.lastNamePh")} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t("detail.addAdmin.email")}</label>
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder={t("detail.addAdmin.emailPh")} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t("detail.addAdmin.password")}</label>
            <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder={t("detail.addAdmin.passwordPh")} style={inputStyle} />
          </div>
          {err && <p style={{ color: "var(--accent-danger)", fontSize: 13, margin: 0 }}>{err}</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button onClick={onClose} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 18px", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)" }}>{t("common.cancel")}</button>
            <button onClick={() => void submit()} disabled={saving} style={{ background: "var(--accent-blue)", color: "#fff", border: "none", borderRadius: 10, padding: "8px 18px", cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
              {saving ? t("detail.addAdmin.creating") : t("detail.addAdmin.submit")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add Device (DICOM modality) Modal ──────────────────────────────────────

function AddDeviceModal({ hospitalId, onClose, onCreated }: { hospitalId: string; onClose: () => void; onCreated: (m: HospitalModality) => void }) {
  const showToast = useContext(ToastContext);
  const t = useT();
  const [form, setForm] = useState({ aeTitle: "", stationName: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); setErr(""); }

  async function submit() {
    const aeTitle = form.aeTitle.trim();
    if (!aeTitle) { setErr(t("detail.devices.add.required")); return; }
    setSaving(true);
    try {
      const modality = await api.post<HospitalModality>(`/hospitals/${hospitalId}/modalities`, {
        aeTitle,
        stationName: form.stationName.trim() || undefined,
        description: form.description.trim() || undefined,
        active: true,
      });
      showToast(t("detail.devices.add.created", { aeTitle: modality.aeTitle }), "success");
      onCreated(modality);
    } catch (e: unknown) {
      // A duplicate AE Title comes back as 409 naming the hospital that already owns it.
      setErr(e instanceof Error ? e.message : t("detail.devices.add.failed"));
    } finally { setSaving(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", border: "1px solid var(--border)",
    borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box",
    background: "var(--bg-base)", color: "var(--text-primary)",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(38,48,63,0.35)", backdropFilter: "blur(2px)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", padding: 28, width: 460, boxShadow: "var(--shadow-lg)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{t("detail.devices.add.title")}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 18px", lineHeight: 1.5 }}>{t("detail.devices.add.hint")}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t("detail.devices.aeTitle")}</label>
            <input
              value={form.aeTitle}
              onChange={(e) => set("aeTitle", e.target.value.toUpperCase())}
              placeholder={t("detail.devices.aeTitlePh")}
              maxLength={16}
              style={{ ...inputStyle, fontFamily: "IBM Plex Mono, monospace" }}
            />
            <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "4px 0 0" }}>{t("detail.devices.aeTitleHint")}</p>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t("detail.devices.stationName")}</label>
            <input value={form.stationName} onChange={(e) => set("stationName", e.target.value)} placeholder={t("detail.devices.stationNamePh")} maxLength={64} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t("detail.devices.description")}</label>
            <input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder={t("detail.devices.descriptionPh")} style={inputStyle} />
          </div>
          {err && <p style={{ color: "var(--accent-danger)", fontSize: 13, margin: 0 }}>{err}</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button onClick={onClose} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 18px", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)" }}>{t("common.cancel")}</button>
            <button onClick={() => void submit()} disabled={saving} style={{ background: "var(--accent-blue)", color: "#fff", border: "none", borderRadius: 10, padding: "8px 18px", cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
              {saving ? t("detail.devices.add.saving") : t("detail.devices.add.submit")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export function HospitalDetailPage() {
  const { id }      = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const showToast   = useContext(ToastContext);
  const t = useT();

  const [hospital, setHospital]           = useState<Hospital | null>(null);
  const [admins, setAdmins]               = useState<HospitalAdmin[]>([]);
  const [loading, setLoading]             = useState(true);
  const [savingGrants, setSavingGrants]   = useState(false);
  const [savingActive, setSavingActive]   = useState(false);
  const [togglingAdmin, setTogglingAdmin] = useState<string | null>(null);
  const [showAddAdmin, setShowAddAdmin]   = useState(false);
  const [devices, setDevices]             = useState<HospitalModality[]>([]);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [busyDevice, setBusyDevice]       = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get<Hospital>(`/hospitals/${id}`),
      api.get<HospitalAdmin[]>(`/hospitals/${id}/admins`),
      api.get<HospitalModality[]>(`/hospitals/${id}/modalities`),
    ])
      .then(([h, a, m]) => { setHospital(h); setAdmins(a); setDevices(m); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function toggleDeviceActive(device: HospitalModality) {
    if (!id) return;
    setBusyDevice(device.id);
    try {
      const updated = await api.put<HospitalModality>(`/hospitals/${id}/modalities/${device.id}`, {
        aeTitle: device.aeTitle,
        stationName: device.stationName ?? undefined,
        description: device.description ?? undefined,
        active: !device.active,
      });
      setDevices((prev) => prev.map((d) => d.id === device.id ? updated : d));
      showToast(updated.active ? t("detail.devices.enabled") : t("detail.devices.disabled"), "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : t("detail.devices.statusFailed"), "error");
    } finally { setBusyDevice(null); }
  }

  async function removeDevice(device: HospitalModality) {
    if (!id) return;
    setBusyDevice(device.id);
    try {
      await api.del(`/hospitals/${id}/modalities/${device.id}`);
      setDevices((prev) => prev.filter((d) => d.id !== device.id));
      showToast(t("detail.devices.removed", { aeTitle: device.aeTitle }), "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : t("detail.devices.removeFailed"), "error");
    } finally { setBusyDevice(null); }
  }

  async function updateGrant(key: keyof HospitalFeatureGrants, val: boolean) {
    if (!hospital) return;
    const prev = { ...hospital };
    const next = { ...hospital, [key]: val };
    setHospital(next);
    setSavingGrants(true);
    try {
      const updated = await api.put<Hospital>(`/hospitals/${hospital.id}/grants`, {
        grantAiSuggestion:   next.grantAiSuggestion,
        grantPathologyInput: next.grantPathologyInput,
        grantAnnotationTool: next.grantAnnotationTool,
        grantViewAnnotations: next.grantViewAnnotations,
        grantImageGallery:   next.grantImageGallery,
      });
      setHospital(updated);
      showToast(t("detail.grantsUpdated"), "success");
    } catch {
      setHospital(prev);
      showToast(t("detail.grantsFailed"), "error");
    } finally { setSavingGrants(false); }
  }

  async function toggleAdminActive(adminId: string, currentActive: boolean) {
    if (!id) return;
    setTogglingAdmin(adminId);
    try {
      await api.put<void>(`/hospitals/${id}/admins/${adminId}/active`, { active: !currentActive });
      setAdmins((prev) => prev.map((a) => a.id === adminId ? { ...a, active: !currentActive } : a));
      showToast(currentActive ? t("detail.adminBlocked") : t("detail.adminUnblocked"), "success");
    } catch {
      showToast(t("detail.adminStatusFailed"), "error");
    } finally { setTogglingAdmin(null); }
  }

  async function toggleActive() {
    if (!hospital) return;
    const next = !hospital.active;
    setSavingActive(true);
    try {
      const updated = await api.put<Hospital>(`/hospitals/${hospital.id}/active`, { active: next });
      setHospital(updated);
      showToast(next ? t("detail.hospEnabled") : t("detail.hospDisabled"), next ? "success" : "info");
    } catch {
      showToast(t("detail.hospStatusFailed"), "error");
    } finally { setSavingActive(false); }
  }

  if (loading) return <div className="page-content" style={{ padding: 36, color: "var(--text-secondary)" }}>{t("detail.loading")}</div>;
  if (!hospital) return <div className="page-content" style={{ padding: 36, color: "var(--accent-danger)" }}>{t("detail.notFound")}</div>;

  return (
    <div className="page-content" style={{ padding: "32px 36px" }}>
      <button
        onClick={() => navigate("/hospitals")}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, marginBottom: 20, padding: 0 }}
      >
        <ArrowLeft size={14} /> {t("detail.back")}
      </button>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{hospital.name}</h1>
          {!hospital.active && (
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "var(--accent-danger)", background: "var(--danger-tint)", padding: "3px 10px", borderRadius: 99 }}>
              <TriangleAlert size={11} /> {t("detail.disabledBadge")}
            </span>
          )}
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
          {t("detail.code")} <span style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600 }}>{hospital.code}</span>
          &nbsp;·&nbsp;{t("detail.usersCount", { count: hospital.userCount })}
        </p>
      </div>

      {/* Hospital Status */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px", color: "var(--text-primary)" }}>{t("detail.status.title")}</h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 14px", lineHeight: 1.5 }}>
          {t("detail.status.desc")}
        </p>
        <div style={{ background: "var(--bg-surface)", border: `1px solid ${hospital.active ? "var(--border)" : "var(--accent-danger)"}`, borderRadius: 10, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ background: hospital.active ? "var(--bg-muted)" : "var(--danger-tint)", borderRadius: 10, padding: 12, color: hospital.active ? "var(--accent-blue)" : "var(--accent-danger)", display: "flex" }}>
            <TriangleAlert size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
              {hospital.active ? t("detail.status.active") : t("detail.status.disabledTitle")}
            </div>
            <div style={{ fontSize: 12, color: hospital.active ? "var(--text-secondary)" : "var(--accent-danger)", marginTop: 4, lineHeight: 1.5 }}>
              {hospital.active
                ? t("detail.status.activeDesc")
                : t("detail.status.disabledDesc")}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div
              onClick={() => !savingActive && void toggleActive()}
              style={{
                width: 44, height: 24, borderRadius: 99,
                background: hospital.active ? "var(--accent-blue)" : "var(--accent-danger)",
                position: "relative",
                cursor: savingActive ? "not-allowed" : "pointer",
                transition: "background 0.2s",
                opacity: savingActive ? 0.6 : 1,
              }}
            >
              <div style={{ position: "absolute", top: 4, left: hospital.active ? 22 : 4, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "var(--shadow-xs)" }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: hospital.active ? "var(--accent-success)" : "var(--accent-danger)" }}>
              {hospital.active ? t("detail.status.enabled") : t("detail.status.disabledLabel")}
            </span>
          </div>
        </div>
      </div>

      {/* Feature Grants */}
      <div style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px", color: "var(--text-primary)" }}>{t("detail.grants.title")}</h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 16px", lineHeight: 1.5 }}>
          {t("detail.grants.desc")}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <GrantCard icon={<Cpu size={20} />}          title={t("detail.grants.ai.title")}         description={t("detail.grants.ai.desc")}         value={hospital.grantAiSuggestion}   onChange={(v) => void updateGrant("grantAiSuggestion", v)}   disabled={savingGrants} />
          <GrantCard icon={<ClipboardList size={20} />} title={t("detail.grants.pathology.title")}  description={t("detail.grants.pathology.desc")}  value={hospital.grantPathologyInput} onChange={(v) => void updateGrant("grantPathologyInput", v)} disabled={savingGrants} />
          <GrantCard icon={<PenLine size={20} />}       title={t("detail.grants.annotation.title")} description={t("detail.grants.annotation.desc")} value={hospital.grantAnnotationTool} onChange={(v) => void updateGrant("grantAnnotationTool", v)} disabled={savingGrants} />
          <GrantCard icon={<Eye size={20} />}           title={t("detail.grants.viewAnn.title")}    description={t("detail.grants.viewAnn.desc")}    value={hospital.grantViewAnnotations} onChange={(v) => void updateGrant("grantViewAnnotations", v)} disabled={savingGrants} />
          <GrantCard icon={<Image size={20} />}         title={t("detail.grants.gallery.title")}    description={t("detail.grants.gallery.desc")}    value={hospital.grantImageGallery}   onChange={(v) => void updateGrant("grantImageGallery", v)}   disabled={savingGrants} />
        </div>
      </div>

      {/* DICOM Devices */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>{t("detail.devices.title")}</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0", maxWidth: 640, lineHeight: 1.5 }}>{t("detail.devices.desc")}</p>
          </div>
          <button
            onClick={() => setShowAddDevice(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--accent-blue)", color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600, flexShrink: 0 }}
          >
            <Plus size={14} /> {t("detail.devices.add")}
          </button>
        </div>

        {devices.length === 0 ? (
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 24, color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.5 }}>
            {t("detail.devices.none")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {devices.map((d) => {
              const isBusy = busyDevice === d.id;
              return (
                <div key={d.id} style={{ background: "var(--bg-surface)", border: `1px solid ${d.active ? "var(--border)" : "var(--accent-danger)"}`, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: d.active ? "var(--accent-blue-light)" : "var(--danger-tint)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ScanLine size={16} color={d.active ? "var(--accent-blue)" : "var(--accent-danger)"} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)", fontFamily: "IBM Plex Mono, monospace" }}>{d.aeTitle}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                      {d.stationName || t("detail.devices.noStation")}
                      {d.description ? ` · ${d.description}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div
                      onClick={() => !isBusy && void toggleDeviceActive(d)}
                      style={{ width: 36, height: 20, borderRadius: 99, background: d.active ? "var(--accent-blue)" : "var(--accent-danger)", position: "relative", cursor: isBusy ? "not-allowed" : "pointer", transition: "background 0.2s", opacity: isBusy ? 0.6 : 1, flexShrink: 0 }}
                    >
                      <div style={{ position: "absolute", top: 3, left: d.active ? 17 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "var(--shadow-xs)" }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: d.active ? "var(--accent-success)" : "var(--accent-danger)" }}>
                      {d.active ? t("detail.devices.activeLabel") : t("detail.devices.inactiveLabel")}
                    </span>
                  </div>
                  <button
                    onClick={() => void removeDevice(d)}
                    disabled={isBusy}
                    title={t("detail.devices.remove")}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "1px solid var(--danger-tint)", borderRadius: 10, padding: 8, cursor: isBusy ? "not-allowed" : "pointer", color: "var(--accent-danger)", flexShrink: 0 }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Admins */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>{t("detail.admins.title")}</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0" }}>{t("detail.admins.desc")}</p>
          </div>
          <button
            onClick={() => setShowAddAdmin(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--accent-blue)", color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            <UserPlus size={14} /> {t("detail.admins.add")}
          </button>
        </div>

        {admins.length === 0 ? (
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 24, color: "var(--text-secondary)", fontSize: 13 }}>
            {t("detail.admins.none")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {admins.map((a) => {
              const isToggling = togglingAdmin === a.id;
              return (
                <div key={a.id} style={{ background: "var(--bg-surface)", border: `1px solid ${a.active ? "var(--border)" : "var(--accent-danger)"}`, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: a.active ? "var(--accent-blue-light)" : "var(--danger-tint)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <UserIcon size={16} color={a.active ? "var(--accent-blue)" : "var(--accent-danger)"} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                      {a.firstName} {a.lastName}
                      {!a.active && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent-danger)", background: "var(--danger-tint)", padding: "2px 7px", borderRadius: 99 }}>{t("detail.admins.blockedBadge")}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <Mail size={11} /> {a.email}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "var(--accent-blue-light)", color: "var(--accent-blue)", marginRight: 8 }}>
                    <Lock size={10} style={{ marginRight: 4, verticalAlign: "middle" }} />{t("detail.admins.roleAdmin")}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div
                      onClick={() => !isToggling && void toggleAdminActive(a.id, a.active)}
                      style={{ width: 36, height: 20, borderRadius: 99, background: a.active ? "var(--accent-blue)" : "var(--accent-danger)", position: "relative", cursor: isToggling ? "not-allowed" : "pointer", transition: "background 0.2s", opacity: isToggling ? 0.6 : 1, flexShrink: 0 }}
                    >
                      <div style={{ position: "absolute", top: 3, left: a.active ? 17 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "var(--shadow-xs)" }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: a.active ? "var(--accent-success)" : "var(--accent-danger)" }}>
                      {a.active ? t("detail.admins.active") : t("detail.admins.blockedLabel")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddDevice && id && (
        <AddDeviceModal
          hospitalId={id}
          onClose={() => setShowAddDevice(false)}
          onCreated={(m) => { setDevices((prev) => [...prev, m]); setShowAddDevice(false); }}
        />
      )}

      {showAddAdmin && id && (
        <AddAdminModal
          hospitalId={id}
          onClose={() => setShowAddAdmin(false)}
          onCreated={(a) => {
            setAdmins((prev) => [...prev, a]);
            setHospital((h) => h ? { ...h, userCount: h.userCount + 1 } : h);
            setShowAddAdmin(false);
          }}
        />
      )}
    </div>
  );
}
