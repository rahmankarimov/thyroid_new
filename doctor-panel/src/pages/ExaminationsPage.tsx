import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { medicalDataService } from "../services/medicalDataService";
import { useWindowWidth } from "../hooks/useWindowWidth";
import { DatePicker, formatDateDisplay } from "../components/DatePicker";
import { useT, type TranslateFn } from "../i18n";
import type { Patient, Examination } from "../types/medical";

function riskColor(prob: number) {
  if (prob >= 0.7) return "var(--accent-danger)";
  if (prob >= 0.3) return "var(--accent-warning)";
  return "var(--accent-success)";
}

function riskLabel(prob: number, t: TranslateFn) {
  const pct = Math.round(prob * 100);
  if (prob >= 0.7) return `${pct}% ${t("risk.high")}`;
  if (prob >= 0.3) return `${pct}% ${t("risk.moderate")}`;
  return `${pct}% ${t("risk.low")}`;
}

function latestExam(p: Patient): Examination | null {
  if (!p.examinations?.length) return null;
  return p.examinations.reduce((a, b) =>
    a.examinationDate > b.examinationDate ? a : b
  );
}

export function ExaminationsPage() {
  const navigate = useNavigate();
  const t = useT();
  const windowWidth = useWindowWidth();
  const isSmall = windowWidth < 860;

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    medicalDataService
      .getPatients()
      .then(setPatients)
      .catch(() => setPatients([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return patients.filter((p) => {
      const matchSearch =
        !q ||
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.fin.toLowerCase().includes(q);
      const exam = latestExam(p);
      const matchDate = !dateFilter || (exam != null && exam.examinationDate === dateFilter);
      return matchSearch && matchDate;
    });
  }, [patients, search, dateFilter]);

  return (
    <div className="page-content" style={{ padding: "32px 36px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
          {t("patients.title")}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
          {t("patients.subtitle")}
        </p>
      </div>

      {/* Filter bar — wraps on small screens */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search
            size={15}
            style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("patients.search")}
            style={{ width: "100%", padding: "9px 12px 9px 34px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <DatePicker value={dateFilter} onChange={setDateFilter} placeholder={t("patients.filterDate")} />
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)", fontSize: 14 }}>
          {t("patients.loading")}
        </div>
      ) : !loading && filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)", fontSize: 14 }}>
          {t("patients.none")}
        </div>
      ) : isSmall ? (
        /* ── Card layout (small screens) ── */
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((p) => {
            const exam = latestExam(p);
            const confirmed = p.examinations?.some((e) => e.pathologyResult != null) ?? false;
            const risk = exam?.aiScore?.malignancyProbability;
            return (
              <div
                key={p.id}
                className="soft-card"
                onClick={() => navigate(`/patients/${p.id}`)}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-surface)")}
                style={{ padding: "14px 16px", cursor: "pointer", transition: "background 0.15s" }}
              >
                {/* Top row: name + status */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                    {p.firstName} {p.lastName}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, color: confirmed ? "var(--accent-blue)" : "var(--text-secondary)", background: confirmed ? "var(--accent-blue-light)" : "var(--bg-muted)", padding: "2px 10px", borderRadius: 99 }}>
                    {confirmed ? t("patients.confirmed") : t("patients.pending")}
                  </span>
                </div>
                {/* Detail chips */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
                  <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: "var(--text-secondary)" }}>
                    {p.fin}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {t("patients.dob")}: {p.dateOfBirth}
                  </span>
                  {exam && (
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {t("patients.lastExam")}: {formatDateDisplay(exam.examinationDate)}
                    </span>
                  )}
                  {risk != null && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: riskColor(risk) }}>
                      {riskLabel(risk, t)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Table layout (large screens) ── */
        <div className="soft-table-wrap">
          <table className="soft-table clickable">
            <thead>
              <tr>
                {["col.patientName", "col.fin", "col.dob", "col.lastExam", "col.aiRisk", "col.status"].map((h) => (
                  <th key={h}>{t(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const exam = latestExam(p);
                const confirmed = p.examinations?.some((e) => e.pathologyResult != null) ?? false;
                const risk = exam?.aiScore?.malignancyProbability;
                return (
                  <tr key={p.id} onClick={() => navigate(`/patients/${p.id}`)}>
                    <td style={{ padding: "15px 18px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                      {p.firstName} {p.lastName}
                    </td>
                    <td style={{ padding: "15px 18px", fontSize: 13, fontFamily: "IBM Plex Mono, monospace", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                      {p.fin}
                    </td>
                    <td style={{ padding: "15px 18px", fontSize: 13, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                      {p.dateOfBirth}
                    </td>
                    <td style={{ padding: "15px 18px", fontSize: 13, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                      {exam ? formatDateDisplay(exam.examinationDate) : "—"}
                    </td>
                    <td style={{ padding: "15px 18px", whiteSpace: "nowrap" }}>
                      {risk != null ? (
                        <span style={{ fontSize: 13, fontWeight: 600, color: riskColor(risk) }}>
                          {riskLabel(risk, t)}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", color: confirmed ? "var(--accent-blue)" : "var(--text-secondary)", background: confirmed ? "var(--accent-blue-light)" : "var(--bg-muted)", padding: "2px 10px", borderRadius: 99 }}>
                        {confirmed ? t("status.confirmed") : t("status.pending")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
