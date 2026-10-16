import { useT } from "../i18n";

export function SettingsPage() {
  const t = useT();
  return (
    <div style={{ padding: "32px 36px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>{t("settings.title")}</h1>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>
        {t("settings.subtitle")}
      </p>
    </div>
  );
}
