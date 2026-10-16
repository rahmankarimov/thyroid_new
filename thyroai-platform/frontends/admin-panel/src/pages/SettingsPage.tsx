import { useState, useEffect, useContext } from "react";
import { Cpu, PenLine, Eye, ClipboardList, Image, Lock, Calculator } from "lucide-react";
import { adminDataService } from "../services/adminDataService";
import type { WidgetSettings, HospitalGrants } from "../types/admin";
import { ToastContext } from "../App";
import { useT } from "../i18n";

interface ToggleCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  blocked?: boolean;
}

function ToggleCard({ icon, title, description, value, onChange, disabled, blocked }: ToggleCardProps) {
  const t = useT();
  return (
    <div className="soft-card" style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 16, opacity: blocked ? 0.55 : disabled ? 0.7 : 1 }}>
      <div style={{ background: "var(--bg-muted)", borderRadius: 10, padding: 12, color: blocked ? "var(--text-secondary)" : "var(--accent-blue)", display: "flex" }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{title}</span>
          {blocked && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--accent-danger)", background: "var(--danger-tint)", padding: "2px 8px", borderRadius: 99 }}>
              <Lock size={10} /> {t("settings.blocked")}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginTop: 2 }}>{description}</div>
      </div>
      {blocked ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ width: 44, height: 24, borderRadius: 99, background: "var(--border)", position: "relative" }}>
            <div style={{ position: "absolute", top: 4, left: 4, width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "var(--shadow-xs)" }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-danger)" }}>{t("settings.locked")}</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div
            onClick={() => !disabled && onChange(!value)}
            style={{ width: 44, height: 24, borderRadius: 99, background: value ? "var(--accent-blue)" : "var(--border)", position: "relative", cursor: disabled ? "not-allowed" : "pointer", transition: "background 0.2s" }}
          >
            <div style={{ position: "absolute", top: 4, left: value ? 22 : 4, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "var(--shadow-xs)" }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: value ? "var(--accent-success)" : "var(--accent-danger)" }}>
            {value ? t("settings.visible") : t("settings.hidden")}
          </span>
        </div>
      )}
    </div>
  );
}

const DEFAULT_SETTINGS: WidgetSettings = {
  showAISuggestion: true, showPathologyInput: true,
  showAnnotationTool: true, showViewAnnotations: true, showImageGallery: true,
  showTiradsCalculator: true,
};

const ALL_GRANTED: HospitalGrants = {
  grantAiSuggestion: true, grantPathologyInput: true,
  grantAnnotationTool: true, grantViewAnnotations: true, grantImageGallery: true,
};

export function SettingsPage() {
  const showToast = useContext(ToastContext);
  const t = useT();
  const [settings, setSettings] = useState<WidgetSettings>(DEFAULT_SETTINGS);
  const [grants, setGrants] = useState<HospitalGrants>(ALL_GRANTED);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      adminDataService.getWidgetSettings(),
      adminDataService.getHospitalGrants().catch(() => ALL_GRANTED),
    ])
      .then(([ws, g]) => { setSettings(ws); setGrants(g); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function update(key: keyof WidgetSettings, val: boolean) {
    const prev = { ...settings };
    const next = { ...settings, [key]: val };
    setSettings(next);
    setSaving(true);
    try {
      const saved = await adminDataService.saveWidgetSettings(next);
      setSettings(saved);
      showToast(t("settings.saved"), "success");
    } catch {
      setSettings(prev);
      showToast(t("settings.saveFailed"), "error");
    } finally { setSaving(false); }
  }

  return (
    <div style={{ padding: "32px 36px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{t("settings.title")}</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
          {t("settings.subtitle")}
        </p>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>{t("settings.loading")}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ToggleCard
            icon={<Cpu size={20} />}
            title={t("settings.card.ai.title")}
            description={t("settings.card.ai.desc")}
            value={settings.showAISuggestion}
            onChange={(v) => void update("showAISuggestion", v)}
            disabled={saving}
            blocked={!grants.grantAiSuggestion}
          />
          <ToggleCard
            icon={<ClipboardList size={20} />}
            title={t("settings.card.pathology.title")}
            description={t("settings.card.pathology.desc")}
            value={settings.showPathologyInput}
            onChange={(v) => void update("showPathologyInput", v)}
            disabled={saving}
            blocked={!grants.grantPathologyInput}
          />
          <ToggleCard
            icon={<PenLine size={20} />}
            title={t("settings.card.annotation.title")}
            description={t("settings.card.annotation.desc")}
            value={settings.showAnnotationTool}
            onChange={(v) => void update("showAnnotationTool", v)}
            disabled={saving}
            blocked={!grants.grantAnnotationTool}
          />
          <ToggleCard
            icon={<Eye size={20} />}
            title={t("settings.card.viewAnn.title")}
            description={t("settings.card.viewAnn.desc")}
            value={settings.showViewAnnotations}
            onChange={(v) => void update("showViewAnnotations", v)}
            disabled={saving}
            blocked={!grants.grantViewAnnotations}
          />
          <ToggleCard
            icon={<Image size={20} />}
            title={t("settings.card.gallery.title")}
            description={t("settings.card.gallery.desc")}
            value={settings.showImageGallery}
            onChange={(v) => void update("showImageGallery", v)}
            disabled={saving}
            blocked={!grants.grantImageGallery}
          />
          <ToggleCard
            icon={<Calculator size={20} />}
            title={t("settings.card.tirads.title")}
            description={t("settings.card.tirads.desc")}
            value={settings.showTiradsCalculator}
            onChange={(v) => void update("showTiradsCalculator", v)}
            disabled={saving}
          />
        </div>
      )}

      {/* {!loading && (
        <div style={{ marginTop: 32, maxWidth: 720 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>CURRENT SETTINGS (live)</div>
          <pre style={{ background: "#0f172a", color: "#94a3b8", borderRadius: 8, padding: "16px 20px", fontSize: 13, fontFamily: "IBM Plex Mono, monospace", overflow: "auto", margin: 0 }}>
            {JSON.stringify({ settings, grants }, null, 2)}
          </pre>
        </div>
      )} */}
    </div>
  );
}
