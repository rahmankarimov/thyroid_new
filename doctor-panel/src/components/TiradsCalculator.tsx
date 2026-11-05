import { useMemo, useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCcw, X, Check, AlertCircle, ArrowRight } from "lucide-react";
import { TIRADS_CATEGORIES, classifyTirads } from "../data/tirads";
import type { TiradsCategory, TiradsLevel } from "../data/tirads";
import { useT } from "../i18n";
import { medicalDataService } from "../services/medicalDataService";
import { ToastContext } from "../App";

// TR level → translation keys (label text is localized; the TRn code stays as-is).
const LEVEL_LABEL_KEY: Record<string, string> = {
  TR1: "tirads.level.benign",
  TR2: "tirads.level.notSuspicious",
  TR3: "tirads.level.mild",
  TR4: "tirads.level.moderate",
  TR5: "tirads.level.high",
};
const LEVEL_GUIDE_KEY: Record<string, string> = {
  TR1: "tirads.guide.none",
  TR2: "tirads.guide.none",
  TR3: "tirads.guide.tr3",
  TR4: "tirads.guide.tr4",
  TR5: "tirads.guide.tr5",
};

const RISK_COLOR: Record<TiradsLevel["risk"], { color: string; tint: string }> = {
  low:      { color: "var(--accent-success)", tint: "var(--success-tint)" },
  mild:     { color: "var(--accent-blue)",    tint: "var(--accent-blue-light)" },
  moderate: { color: "var(--accent-warning)", tint: "var(--warning-tint)" },
  high:     { color: "var(--accent-danger)",  tint: "var(--danger-tint)" },
};

function pointsBadge(points: number, additive: boolean, selected: boolean) {
  const num = additive && points > 0 ? `+${points}` : `${points}`;
  const unit = points === 1 && !additive ? " pt" : " pts";
  return (
    <span
      style={{
        flexShrink: 0,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "IBM Plex Mono, monospace",
        color: selected ? "var(--accent-blue)" : "var(--text-secondary)",
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 999,
        padding: "2px 9px",
      }}
    >
      {num}
      {unit}
    </span>
  );
}

export function TiradsCalculator({ onClose, examinationId }: { onClose?: () => void; examinationId?: string } = {}) {
  const t = useT();
  const navigate = useNavigate();
  const showToast = useContext(ToastContext);

  // Single-choice categories store one option id; the additive category stores a set.
  const [single, setSingle] = useState<Record<string, string>>({});
  const [foci, setFoci] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Reset when examination changes
  useEffect(() => {
    setSingle({});
    setFoci([]);
    setSubmitted(false);
  }, [examinationId]);

  function selectSingle(catKey: string, optId: string) {
    setSingle((prev) => (prev[catKey] === optId ? (() => { const n = { ...prev }; delete n[catKey]; return n; })() : { ...prev, [catKey]: optId }));
  }

  function toggleFocus(cat: TiradsCategory, optId: string) {
    const noneId = cat.options.find((o) => o.points === 0)?.id;
    setFoci((prev) => {
      if (prev.includes(optId)) return prev.filter((id) => id !== optId);
      // "None" is mutually exclusive with any real focus.
      if (optId === noneId) return [optId];
      return [...prev.filter((id) => id !== noneId), optId];
    });
  }

  function isCategorySelected(cat: TiradsCategory): boolean {
    if (cat.additive) {
      return foci.length > 0;
    }
    return Boolean(single[cat.key]);
  }

  const selectedCount = useMemo(() => {
    return TIRADS_CATEGORIES.filter(isCategorySelected).length;
  }, [single, foci]);

  const allCategoriesSelected = selectedCount === TIRADS_CATEGORIES.length;

  const total = useMemo(() => {
    let sum = 0;
    for (const cat of TIRADS_CATEGORIES) {
      if (cat.additive) {
        for (const id of foci) sum += cat.options.find((o) => o.id === id)?.points ?? 0;
      } else {
        const chosen = single[cat.key];
        if (chosen) sum += cat.options.find((o) => o.id === chosen)?.points ?? 0;
      }
    }
    return sum;
  }, [single, foci]);

  const touched = Object.keys(single).length > 0 || foci.length > 0;
  const result = classifyTirads(total);
  const rc = RISK_COLOR[result.risk];

  function reset() {
    setSingle({});
    setFoci([]);
  }

  async function advanceToNextImage() {
    try {
      const data = await medicalDataService.getNextRandomExaminationId();
      if (data && data.patientId && data.examId) {
        setSingle({});
        setFoci([]);
        setSubmitted(false);
        navigate(`/patients/${data.patientId}/examinations/${data.examId}`);
      } else {
        showToast?.("Növbədə yeni təsdiqlənməmiş müayinə tapılmadı.", "info");
      }
    } catch (err: any) {
      console.error("Queue fetch error:", err);
      showToast?.(err?.message || "Növbədə yeni şəkil tapılmadı.", "info");
    }
  }

  async function handleSubmit() {
    if (!examinationId || !allCategoriesSelected) return;
    setIsSubmitting(true);
    try {
      const payload = {
        totalPoints: total,
        level: result.level,
        composition: TIRADS_CATEGORIES.find(c => c.key === "composition")?.options.find(o => o.id === single["composition"])?.label,
        echogenicity: TIRADS_CATEGORIES.find(c => c.key === "echogenicity")?.options.find(o => o.id === single["echogenicity"])?.label,
        shape: TIRADS_CATEGORIES.find(c => c.key === "shape")?.options.find(o => o.id === single["shape"])?.label,
        margin: TIRADS_CATEGORIES.find(c => c.key === "margin")?.options.find(o => o.id === single["margin"])?.label,
        echogenicFoci: foci.map(f => TIRADS_CATEGORIES.find(c => c.key === "foci")?.options.find(o => o.id === f)?.label).filter(Boolean).join(", ")
      };
      await medicalDataService.saveTiradsResult(examinationId, payload);
      setSubmitted(true);
      showToast?.("TI-RADS qiymətləndirməsi uğurla yadda saxlanıldı", "success");
      
      // Auto-advance to next random examination
      await advanceToNextImage();
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.message || err?.message || "Xəta baş verdi";
      showToast?.(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="soft-card" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{t("tirads.title")}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {touched && (
            <button
              onClick={reset}
              style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "1px solid var(--border)", borderRadius: 10, padding: "5px 10px", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)" }}
            >
              <RotateCcw size={13} /> {t("tirads.reset")}
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              title={t("common.cancel")}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: 10, padding: 6, cursor: "pointer", color: "var(--text-secondary)" }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.5 }}>
        {t("tirads.intro")}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {TIRADS_CATEGORIES.map((cat) => {
          const selectedIds = cat.additive ? foci : (single[cat.key] ? [single[cat.key]] : []);
          const descriptions = cat.options.filter((o) => selectedIds.includes(o.id) && o.description);
          const isComplete = isCategorySelected(cat);

          return (
            <div key={cat.key}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {t(`tirads.cat.${cat.key}`)}
                  </span>
                  {cat.additive && <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t("tirads.selectAll")}</span>}
                </div>

                {isComplete ? (
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--accent-success)",
                    background: "rgba(63, 157, 110, 0.12)",
                    padding: "2px 8px",
                    borderRadius: 999
                  }}>
                    <Check size={11} strokeWidth={3} /> Seçildi
                  </span>
                ) : (
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--accent-danger)",
                    background: "rgba(229, 96, 94, 0.12)",
                    padding: "2px 8px",
                    borderRadius: 999
                  }}>
                    * Seçilməyib
                  </span>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {cat.options.map((opt) => {
                  const selected = selectedIds.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => (cat.additive ? toggleFocus(cat, opt.id) : selectSingle(cat.key, opt.id))}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                        background: selected ? "var(--accent-blue-light)" : "var(--bg-muted)",
                        border: `1px solid ${selected ? "var(--accent-blue)" : "var(--border)"}`,
                        borderRadius: 10, padding: "9px 12px", cursor: "pointer", transition: "background 0.12s, border-color 0.12s",
                      }}
                    >
                      <span style={{
                        flexShrink: 0, width: 16, height: 16, borderRadius: cat.additive ? 5 : "50%",
                        border: `2px solid ${selected ? "var(--accent-blue)" : "var(--border)"}`,
                        background: selected ? "var(--accent-blue)" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {selected && <span style={{ width: 6, height: 6, borderRadius: cat.additive ? 1 : "50%", background: "#fff" }} />}
                      </span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: selected ? 600 : 500, color: "var(--text-primary)" }}>{opt.label}</span>
                      {pointsBadge(opt.points, !!cat.additive, selected)}
                    </button>
                  );
                })}
              </div>

              {descriptions.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  {descriptions.map((o) => (
                    <div key={o.id} style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, background: "var(--bg-surface)", border: "1px solid var(--hairline)", borderLeft: "3px solid var(--accent-blue)", borderRadius: 8, padding: "8px 12px" }}>
                      <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>{o.label}.</strong> {o.description}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Result */}
      <div style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 16, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 34, fontWeight: 800, fontFamily: "IBM Plex Mono, monospace", color: touched ? rc.color : "var(--text-secondary)", lineHeight: 1 }}>{total}</span>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{total === 1 ? t("tirads.point") : t("tirads.points")}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: rc.color, background: rc.tint, borderRadius: 999, padding: "3px 12px", fontFamily: "IBM Plex Mono, monospace" }}>{result.level}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{t(LEVEL_LABEL_KEY[result.level])}</span>
          </div>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t(LEVEL_GUIDE_KEY[result.level])}</span>
        </div>
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: "var(--text-secondary)", background: "var(--bg-muted)", border: "1px solid var(--border)", borderLeft: "3px solid var(--accent-blue)", borderRadius: 10, padding: "8px 12px", lineHeight: 1.5 }}>
        {t("tirads.disclaimer")}
      </div>

      {examinationId && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {!allCategoriesSelected && !submitted && (
            <div style={{
              fontSize: 12,
              color: "var(--accent-warning)",
              background: "rgba(201, 138, 43, 0.1)",
              border: "1px solid var(--accent-warning)",
              borderRadius: 8,
              padding: "9px 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              lineHeight: 1.4
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>
                Təsdiqləmək üçün bütün 5 kateqoriya seçilməlidir (<strong>{selectedCount}/5</strong> seçilib).
              </span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!allCategoriesSelected || isSubmitting || submitted}
            style={{
              width: "100%",
              padding: "12px",
              background: submitted
                ? "var(--accent-success)"
                : allCategoriesSelected
                  ? "var(--accent-blue)"
                  : "var(--bg-muted)",
              color: submitted || allCategoriesSelected ? "#fff" : "var(--text-secondary)",
              border: allCategoriesSelected ? "none" : "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              cursor: (!allCategoriesSelected || isSubmitting || submitted) ? "not-allowed" : "pointer",
              opacity: (!allCategoriesSelected || isSubmitting) ? 0.75 : 1,
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: allCategoriesSelected && !submitted ? "0 2px 8px rgba(79, 107, 237, 0.25)" : "none",
            }}
          >
            {isSubmitting
              ? "Yadda saxlanılır..."
              : submitted
                ? "Yadda saxlanıldı ✓"
                : allCategoriesSelected
                  ? "Təsdiqlə"
                  : `Təsdiqlə (${selectedCount}/5 seçilib)`}
          </button>

          {submitted && (
            <button
              onClick={advanceToNextImage}
              style={{
                width: "100%",
                padding: "11px",
                background: "var(--accent-blue)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "background 0.15s",
              }}
            >
              <span>Növbəti müayinəyə keç</span>
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
