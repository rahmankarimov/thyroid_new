import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Plus, Trash2, ChevronRight, X } from "lucide-react";
import { api } from "../services/api";
import type { Hospital, CreateHospitalRequest, HospitalModality } from "../types/superAdmin";
import { ToastContext } from "../App";
import { useT } from "../i18n";

// ── Add Hospital Modal ─────────────────────────────────────────────────────

function AddHospitalModal({ onClose, onCreated }: { onClose: () => void; onCreated: (h: Hospital) => void }) {
  const showToast = useContext(ToastContext);
  const t = useT();
  const [form, setForm] = useState<CreateHospitalRequest>({ name: "", code: "" });
  const [aeTitle, setAeTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  function set(k: keyof CreateHospitalRequest, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setErr("");
  }

  async function submit() {
    if (!form.name.trim() || !form.code.trim()) { setErr(t("hospitals.add.required")); return; }
    setSaving(true);
    try {
      const hospital = await api.post<Hospital>("/hospitals", form);

      // Optional first device. The hospital already exists at this point, so a rejected
      // AE Title (duplicate) must not look like the whole creation failed — keep the
      // hospital and tell the admin to add the device from its detail page.
      const ae = aeTitle.trim();
      if (ae) {
        try {
          await api.post<HospitalModality>(`/hospitals/${hospital.id}/modalities`, {
            aeTitle: ae, active: true,
          });
        } catch (deviceErr: unknown) {
          showToast(t("hospitals.add.createdNoDevice", {
            name: hospital.name,
            reason: deviceErr instanceof Error ? deviceErr.message : "",
          }), "info");
          onCreated(hospital);
          return;
        }
      }

      showToast(t("hospitals.add.created", { name: hospital.name }), "success");
      onCreated(hospital);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : t("hospitals.add.createFailed"));
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
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{t("hospitals.add.title")}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}><X size={18} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t("hospitals.add.name")}</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={t("hospitals.add.namePh")} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t("hospitals.add.code")}</label>
            <input value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder={t("hospitals.add.codePh")} style={inputStyle} />
            <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "4px 0 0" }}>{t("hospitals.add.codeHint")}</p>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
              {t("hospitals.add.aeTitle")} <span style={{ fontWeight: 400, opacity: 0.7 }}>{t("hospitals.add.optional")}</span>
            </label>
            <input
              value={aeTitle}
              onChange={(e) => { setAeTitle(e.target.value.toUpperCase()); setErr(""); }}
              placeholder={t("hospitals.add.aeTitlePh")}
              maxLength={16}
              style={{ ...inputStyle, fontFamily: "IBM Plex Mono, monospace" }}
            />
            <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "4px 0 0", lineHeight: 1.45 }}>{t("hospitals.add.aeTitleHint")}</p>
          </div>
          {err && <p style={{ color: "var(--accent-danger)", fontSize: 13, margin: 0 }}>{err}</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button onClick={onClose} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 18px", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)" }}>{t("common.cancel")}</button>
            <button onClick={() => void submit()} disabled={saving} style={{ background: "var(--accent-blue)", color: "#fff", border: "none", borderRadius: 10, padding: "8px 18px", cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
              {saving ? t("hospitals.add.creating") : t("hospitals.add.submit")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export function HospitalsPage() {
  const navigate    = useNavigate();
  const showToast   = useContext(ToastContext);
  const t = useT();
  const [hospitals, setHospitals]       = useState<Hospital[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showAdd, setShowAdd]           = useState(false);
  const [deleting, setDeleting]         = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Hospital | null>(null);

  useEffect(() => {
    api.get<Hospital[]>("/hospitals")
      .then(setHospitals)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(h: Hospital) {
    setDeleting(h.id);
    try {
      await api.del(`/hospitals/${h.id}`);
      setHospitals((prev) => prev.filter((x) => x.id !== h.id));
      showToast(t("hospitals.deleted", { name: h.name }), "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : t("hospitals.deleteFailed"), "error");
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  }

  return (
    <div className="page-content" style={{ padding: "32px 36px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{t("hospitals.title")}</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
            {t("hospitals.subtitle")}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ display: "flex", alignItems: "center", gap: 7, background: "var(--accent-blue)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
        >
          <Plus size={15} /> {t("hospitals.addHospital")}
        </button>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>{t("hospitals.loading")}</div>
      ) : hospitals.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-secondary)" }}>
          <Building2 size={48} style={{ opacity: 0.2, marginBottom: 12, display: "block", margin: "0 auto 12px" }} />
          <p style={{ margin: 0, fontSize: 15 }}>{t("hospitals.none")}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {hospitals.map((h) => (
            <div key={h.id} className="soft-card" style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ background: "var(--accent-blue-light)", borderRadius: 10, padding: 10, color: "var(--accent-blue)", display: "flex", flexShrink: 0 }}>
                <Building2 size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{h.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3 }}>
                  {t("hospitals.code")} <span style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600 }}>{h.code}</span>
                  &nbsp;·&nbsp;{t("hospitals.usersCount", { count: h.userCount })}
                  &nbsp;·&nbsp;{t("hospitals.created", { date: new Date(h.createdAt).toLocaleDateString() })}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  {[
                    { label: "hospitals.grant.ai",         granted: h.grantAiSuggestion },
                    { label: "hospitals.grant.pathology",  granted: h.grantPathologyInput },
                    { label: "hospitals.grant.annotation", granted: h.grantAnnotationTool },
                    { label: "hospitals.grant.viewAnnot",  granted: h.grantViewAnnotations },
                    { label: "hospitals.grant.gallery",    granted: h.grantImageGallery },
                  ].map(({ label, granted }) => (
                    <span
                      key={label}
                      style={{
                        fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
                        background: granted ? "var(--success-tint)" : "var(--danger-tint)",
                        color: granted ? "var(--accent-success)" : "var(--accent-danger)",
                      }}
                    >
                      {t(label)}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => navigate(`/hospitals/${h.id}`)}
                style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: 10, padding: "7px 14px", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)", fontWeight: 600, flexShrink: 0 }}
              >
                {t("hospitals.manage")} <ChevronRight size={14} />
              </button>
              <button
                onClick={() => setConfirmDelete(h)}
                disabled={deleting === h.id}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "1px solid var(--danger-tint)", borderRadius: 10, padding: 8, cursor: "pointer", color: "var(--accent-danger)", flexShrink: 0 }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddHospitalModal
          onClose={() => setShowAdd(false)}
          onCreated={(h) => { setHospitals((prev) => [...prev, h]); setShowAdd(false); }}
        />
      )}

      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(38,48,63,0.35)", backdropFilter: "blur(2px)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", padding: 28, width: 400, boxShadow: "var(--shadow-lg)" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{t("hospitals.delete.title")}</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: "0 0 20px", lineHeight: 1.5 }}>
              {t("hospitals.delete.desc", { name: confirmDelete.name, count: confirmDelete.userCount })}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDelete(null)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 18px", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)" }}>{t("common.cancel")}</button>
              <button onClick={() => void handleDelete(confirmDelete)} disabled={deleting !== null} style={{ background: "var(--accent-danger)", color: "#fff", border: "none", borderRadius: 10, padding: "8px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, opacity: deleting ? 0.7 : 1 }}>
                {deleting ? t("hospitals.delete.deleting") : t("hospitals.delete.submit")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
