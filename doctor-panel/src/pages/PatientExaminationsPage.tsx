import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { medicalDataService } from "../services/medicalDataService";
import { formatDateDisplay } from "../components/DatePicker";
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

export function PatientExaminationsPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const t = useT();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    medicalDataService
      .getPatient(patientId)
      .then(setPatient)
      .catch(() => navigate("/patients"))
      .finally(() => setLoading(false));
  }, [patientId]);

  const exams: Examination[] = [...(patient?.examinations ?? [])].sort((a, b) =>
    a.examinationDate < b.examinationDate ? 1 : -1
  );

  return (
    <div className="page-content" style={{ padding: "32px 36px" }}>
      <button
        onClick={() => navigate("/patients")}
        style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)", padding: 0, marginBottom: 18 }}
      >
        <ChevronLeft size={15} /> {t("exams.back")}
      </button>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)", fontSize: 14 }}>
          {t("exams.loading")}
        </div>
      ) : !patient ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--accent-danger)", fontSize: 14 }}>
          {t("exams.notFound")}
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              {patient.firstName} {patient.lastName}
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4, fontFamily: "IBM Plex Mono, monospace" }}>
              {patient.fin} · DOB: {patient.dateOfBirth}
            </p>
          </div>

          {exams.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)", fontSize: 14, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10 }}>
              {t("exams.none")}
            </div>
          ) : (
            <div className="soft-table-wrap" style={{ overflow: "auto" }}>
              <table className="soft-table clickable" style={{ minWidth: 620 }}>
                <thead>
                  <tr>
                    {["col.examDate", "col.aiRisk", "col.diagnosis", "col.status", ""].map((h) => (
                      <th key={h}>{h ? t(h) : ""}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {exams.map((ex) => {
                    const risk = ex.aiScore?.malignancyProbability;
                    const confirmed = ex.pathologyResult != null;
                    return (
                      <tr
                        key={ex.id}
                        onClick={() => navigate(`/patients/${patient.id}/examinations/${ex.id}`)}
                      >
                        <td style={{ padding: "15px 18px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                          {formatDateDisplay(ex.examinationDate)}
                        </td>
                        <td style={{ padding: "15px 18px", whiteSpace: "nowrap" }}>
                          {risk != null ? (
                            <span style={{ fontSize: 13, fontWeight: 600, color: riskColor(risk) }}>{riskLabel(risk, t)}</span>
                          ) : "—"}
                        </td>
                        <td style={{ padding: "15px 18px", fontSize: 13, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                          {ex.pathologyResult?.diagnosis ?? "—"}
                        </td>
                        <td style={{ padding: "13px 16px" }}>
                          <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", color: confirmed ? "var(--accent-blue)" : "var(--text-secondary)", background: confirmed ? "var(--accent-blue-light)" : "var(--bg-muted)", padding: "2px 10px", borderRadius: 99 }}>
                            {confirmed ? t("status.confirmed") : t("status.pending")}
                          </span>
                        </td>
                        <td style={{ padding: "15px 18px", textAlign: "right", color: "var(--text-secondary)" }}>
                          <ChevronRight size={16} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
