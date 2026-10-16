import { useEffect, useRef, useState } from "react";
import { Globe, Check } from "lucide-react";
import { LANGS, useI18n } from "../i18n";

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title={t("lang.label")}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: 10, padding: "7px 10px", cursor: "pointer", color: "var(--text-secondary)", fontSize: 13 }}
      >
        <Globe size={14} />
        <span style={{ fontWeight: 600 }}>{current.label}</span>
      </button>

      {open && (
        <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 4, boxShadow: "var(--shadow-lg)", zIndex: 400 }}>
          {LANGS.map((l) => {
            const active = l.code === lang;
            return (
              <button
                key={l.code}
                onClick={() => { setLang(l.code); setOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: active ? "var(--accent-blue-light)" : "none", border: "none", borderRadius: 8, padding: "7px 10px", cursor: "pointer", fontSize: 13, color: active ? "var(--accent-blue)" : "var(--text-primary)", textAlign: "left" }}
              >
                <span style={{ width: 16, flexShrink: 0 }}>{active && <Check size={14} />}</span>
                <span style={{ fontWeight: 600, width: 26 }}>{l.label}</span>
                <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{l.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
