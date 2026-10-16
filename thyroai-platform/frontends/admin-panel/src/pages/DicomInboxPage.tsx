import { useState, useEffect, useContext } from "react";
import { RefreshCw, X, Link2, UserPlus, Trash2, AlertTriangle, ScanLine } from "lucide-react";
import { adminDataService } from "../services/adminDataService";
import { imageUrl } from "../services/api";
import type { DicomStatus, DicomStudy, Patient } from "../types/admin";
import { ToastContext } from "../App";
import { DatePicker } from "../components/DatePicker";
import { useT } from "../i18n";

const GENDERS = ["MALE", "FEMALE"];

const TABS: { status: DicomStatus | "ALL"; label: string }[] = [
  { status: "UNMATCHED", label: "dicom.tab.unmatched" },
  { status: "MATCHED", label: "dicom.tab.matched" },
  { status: "LINKED", label: "dicom.tab.linked" },
  { status: "ALL", label: "dicom.tab.all" },
];

const STATUS_COLORS: Record<DicomStatus, { bg: string; fg: string }> = {
  UNMATCHED: { bg: "var(--bg-muted)", fg: "var(--text-secondary)" },
  MATCHED: { bg: "var(--accent-blue-light)", fg: "var(--accent-blue)" },
  LINKED: { bg: "var(--accent-blue-light)", fg: "var(--accent-blue)" },
  DISCARDED: { bg: "var(--bg-muted)", fg: "var(--text-secondary)" },
};

/**
 * "DICOM^NAME^PARTS" is how DICOM encodes a person name (family^given^middle).
 * Shown to the admin as "Given Family" so it reads like a name.
 */
function formatDicomName(raw: string | null): string {
  if (!raw) return "—";
  const parts = raw.split("^").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0];
  return `${parts[1]} ${parts[0]}`;
}

/** Splits a DICOM name into first/last to pre-fill the create-patient form. */
function splitDicomName(raw: string | null): { firstName: string; lastName: string } {
  if (!raw) return { firstName: "", lastName: "" };
  const parts = raw.split("^").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[1], lastName: parts[0] };
}

/** DICOM sex is a single letter; the patient record uses MALE/FEMALE. */
function dicomSexToGender(sex: string | null): string {
  const s = (sex ?? "").trim().toUpperCase();
  if (s === "M") return "MALE";
  if (s === "F") return "FEMALE";
  return "";
}

/** The device's PatientID only becomes a FIN if it is 7 alphanumerics — same rule as the backend. */
function finFromPatientId(patientId: string | null): string {
  if (!patientId) return "";
  const normalised = patientId.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[A-Z0-9]{7}$/.test(normalised) ? normalised : "";
}

export function DicomInboxPage() {
  const toast = useContext(ToastContext);
  const t = useT();

  const [tab, setTab] = useState<DicomStatus | "ALL">("UNMATCHED");
  const [studies, setStudies] = useState<DicomStudy[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail / reconciliation drawer
  const [selected, setSelected] = useState<DicomStudy | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // Link-to-existing-patient
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientQuery, setPatientQuery] = useState("");
  const [linkTargetId, setLinkTargetId] = useState("");

  // Create-patient form
  const [createMode, setCreateMode] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: "", lastName: "", fin: "", dateOfBirth: "", gender: "", referredBy: "",
  });

  useEffect(() => { void load(tab); }, [tab]);

  async function load(status: DicomStatus | "ALL") {
    setLoading(true);
    try {
      setStudies(await adminDataService.getDicomStudies(status));
    } catch (e: unknown) {
      toast((e as Error)?.message || t("dicom.toast.loadFailed"), "error");
    } finally {
      setLoading(false);
    }
  }

  async function openStudy(study: DicomStudy) {
    setSelected(study);
    setCreateMode(false);
    setLinkTargetId("");
    setPatientQuery("");
    setDetailLoading(true);
    try {
      const [detail, pts] = await Promise.all([
        adminDataService.getDicomStudy(study.id),
        patients.length > 0 ? Promise.resolve(patients) : adminDataService.getPatients(),
      ]);
      setSelected(detail);
      setPatients(pts);
      // Pre-fill the create form from the DICOM tags — the admin still confirms every field.
      const { firstName, lastName } = splitDicomName(detail.dicomPatientName);
      setCreateForm({
        firstName,
        lastName,
        fin: finFromPatientId(detail.dicomPatientId),
        dateOfBirth: detail.dicomBirthDate ?? "",
        gender: dicomSexToGender(detail.dicomSex),
        referredBy: "",
      });
    } catch (e: unknown) {
      toast((e as Error)?.message || t("dicom.toast.loadFailed"), "error");
    } finally {
      setDetailLoading(false);
    }
  }

  function closeStudy() {
    setSelected(null);
    setCreateMode(false);
  }

  /** Removes a reconciled study from the list unless the current tab still includes it. */
  function afterResolve(id: string, message: string) {
    if (tab === "UNMATCHED") setStudies((prev) => prev.filter((s) => s.id !== id));
    else void load(tab);
    closeStudy();
    toast(message, "success");
  }

  async function handleLink() {
    if (!selected || !linkTargetId) {
      toast(t("dicom.toast.pickPatient"), "error");
      return;
    }
    setBusy(true);
    try {
      await adminDataService.linkDicomStudy(selected.id, linkTargetId);
      afterResolve(selected.id, t("dicom.toast.linked"));
    } catch (e: unknown) {
      toast((e as Error)?.message || t("dicom.toast.linkFailed"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate() {
    if (!selected) return;
    if (!createForm.firstName.trim() || !createForm.lastName.trim() || !createForm.fin.trim()) {
      toast(t("dicom.toast.reqFields"), "error");
      return;
    }
    setBusy(true);
    try {
      await adminDataService.createPatientFromDicomStudy(selected.id, {
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        fin: createForm.fin.trim(),
        dateOfBirth: createForm.dateOfBirth || undefined,
        gender: createForm.gender || undefined,
        referredBy: createForm.referredBy.trim() || undefined,
      });
      setPatients([]);   // force a refetch next time — a new patient now exists
      afterResolve(selected.id, t("dicom.toast.created"));
    } catch (e: unknown) {
      toast((e as Error)?.message || t("dicom.toast.createFailed"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleDiscard() {
    if (!selected) return;
    if (!window.confirm(t("dicom.discardConfirm"))) return;
    setBusy(true);
    try {
      await adminDataService.discardDicomStudy(selected.id);
      afterResolve(selected.id, t("dicom.toast.discarded"));
    } catch (e: unknown) {
      toast((e as Error)?.message || t("dicom.toast.discardFailed"), "error");
    } finally {
      setBusy(false);
    }
  }

  const filteredPatients = patients.filter((p) => {
    if (!patientQuery) return true;
    const q = patientQuery.toLowerCase();
    return `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) || p.fin.toLowerCase().includes(q);
  });

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    fontSize: 13,
    background: "var(--bg-base)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    color: "var(--text-primary)",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4,
  };

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1100 }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{t("dicom.title")}</h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0", maxWidth: 620 }}>
            {t("dicom.subtitle")}
          </p>
        </div>
        <button
          onClick={() => void load(tab)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13, fontWeight: 500, background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer", color: "var(--text-secondary)" }}
        >
          <RefreshCw size={14} />
          {t("dicom.refresh")}
        </button>
      </div>

      {/* ── Status tabs ── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {TABS.map((tb) => {
          const active = tab === tb.status;
          return (
            <button
              key={tb.status}
              onClick={() => setTab(tb.status)}
              style={{
                padding: "6px 14px", fontSize: 13, fontWeight: active ? 600 : 500,
                background: active ? "var(--accent-blue-light)" : "var(--bg-muted)",
                border: `1px solid ${active ? "var(--accent-blue)" : "var(--border)"}`,
                color: active ? "var(--accent-blue)" : "var(--text-secondary)",
                borderRadius: 20, cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {t(tb.label)}
            </button>
          );
        })}
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-secondary)", fontSize: 14 }}>{t("dicom.loading")}</div>
      ) : studies.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-secondary)", fontSize: 14 }}>
          <ScanLine size={28} style={{ opacity: 0.4, marginBottom: 10 }} />
          <div>{tab === "UNMATCHED" ? t("dicom.emptyUnmatched") : t("dicom.empty")}</div>
        </div>
      ) : (
        <div className="soft-table-wrap">
          <table className="soft-table" style={{ fontSize: 14 }}>
            <thead>
              <tr>
                {["dicom.col.studyDate", "dicom.col.patientId", "dicom.col.name", "dicom.col.device", "dicom.col.images", "dicom.col.status", ""].map((h, i) => (
                  <th key={i}>{h ? t(h) : ""}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {studies.map((s) => {
                const colors = STATUS_COLORS[s.status];
                return (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--hairline)" }}>
                    <td style={{ padding: "14px 18px", color: "var(--text-secondary)" }}>{s.studyDate ?? "—"}</td>
                    <td style={{ padding: "14px 18px", fontFamily: "monospace", fontSize: 13, color: "var(--text-primary)" }}>
                      {s.dicomPatientId ?? "—"}
                    </td>
                    <td style={{ padding: "14px 18px", color: "var(--text-primary)" }}>
                      {s.status === "UNMATCHED" ? formatDicomName(s.dicomPatientName) : (s.patientName ?? formatDicomName(s.dicomPatientName))}
                    </td>
                    <td style={{ padding: "14px 18px", fontFamily: "monospace", fontSize: 12, color: "var(--text-secondary)" }}>
                      {s.sourceAeTitle ?? "—"}
                    </td>
                    <td style={{ padding: "14px 18px", color: "var(--text-secondary)" }}>{s.instanceCount}</td>
                    <td style={{ padding: "14px 18px" }}>
                      <span style={{ display: "inline-block", background: colors.bg, color: colors.fg, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                        {t(`dicom.status.${s.status.toLowerCase()}`)}
                      </span>
                    </td>
                    <td style={{ padding: "14px 18px", textAlign: "right" }}>
                      <button
                        onClick={() => void openStudy(s)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", fontSize: 12, fontWeight: 500, background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", color: "var(--text-primary)" }}
                      >
                        {s.status === "UNMATCHED" ? t("dicom.reconcile") : t("dicom.view")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Detail / reconciliation modal ── */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(38,48,63,0.35)", backdropFilter: "blur(2px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", padding: 32, width: 660, maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{t("dicom.detail.title")}</h2>
              <button onClick={closeStudy} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                <X size={18} />
              </button>
            </div>

            {/* Why it did not match */}
            {selected.status === "UNMATCHED" && selected.unmatchedReason && (
              <div style={{ display: "flex", gap: 9, alignItems: "flex-start", background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", margin: "14px 0 18px" }}>
                <AlertTriangle size={15} style={{ color: "var(--text-secondary)", flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.45 }}>
                  <strong style={{ color: "var(--text-primary)" }}>{t("dicom.detail.whyUnmatched")}</strong>{" "}
                  {selected.unmatchedReason}
                </div>
              </div>
            )}

            {/* DICOM identity as sent by the device */}
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.04em", margin: "4px 0 10px" }}>
              {t("dicom.detail.asSent")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
              {([
                ["dicom.detail.patientId", selected.dicomPatientId ?? "—", true],
                ["dicom.detail.patientName", formatDicomName(selected.dicomPatientName), false],
                ["dicom.detail.birthDate", selected.dicomBirthDate ?? "—", false],
                ["dicom.detail.sex", selected.dicomSex ?? "—", false],
                ["dicom.detail.studyDate", selected.studyDate ?? "—", false],
                ["dicom.detail.modality", selected.modality ?? "—", false],
                ["dicom.detail.device", selected.sourceAeTitle ?? "—", true],
                ["dicom.detail.hospital", selected.hospitalName ?? "—", false],
              ] as [string, string, boolean][]).map(([key, value, mono]) => (
                <div key={key}>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 2 }}>{t(key)}</div>
                  <div style={{ fontSize: 13, color: "var(--text-primary)", fontFamily: mono ? "monospace" : undefined, wordBreak: "break-word" }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Image previews */}
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.04em", marginBottom: 10 }}>
              {t("dicom.detail.images", { count: selected.instanceCount })}
            </div>
            {detailLoading ? (
              <div style={{ fontSize: 13, color: "var(--text-secondary)", padding: "16px 0" }}>{t("dicom.loading")}</div>
            ) : (
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 20 }}>
                {(selected.instances ?? []).filter((i) => i.previewUrl).map((inst) => (
                  <a
                    key={inst.id}
                    href={imageUrl(inst.previewUrl!)}
                    target="_blank"
                    rel="noreferrer"
                    title={inst.seriesDescription ?? `#${inst.instanceNumber ?? ""}`}
                    style={{ flexShrink: 0, width: 108, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", background: "var(--bg-base)" }}
                  >
                    <img
                      src={imageUrl(inst.previewUrl!)}
                      alt={inst.seriesDescription ?? "preview"}
                      style={{ width: "100%", height: 84, objectFit: "cover", display: "block" }}
                    />
                    <div style={{ fontSize: 10.5, color: "var(--text-secondary)", padding: "4px 6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {inst.seriesDescription ?? `#${inst.instanceNumber ?? "?"}`}
                    </div>
                  </a>
                ))}
                {(selected.instances ?? []).filter((i) => i.previewUrl).length === 0 && (
                  <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{t("dicom.detail.noPreviews")}</div>
                )}
              </div>
            )}

            {/* Already resolved — show where it went */}
            {selected.status !== "UNMATCHED" && (
              <div style={{ background: "var(--accent-blue-light)", border: "1px solid var(--accent-blue)", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "var(--text-primary)" }}>
                {t("dicom.detail.resolvedTo", { patient: selected.patientName ?? "—" })}
                {selected.resolvedBy ? ` · ${selected.resolvedBy}` : ""}
              </div>
            )}

            {/* Reconciliation actions */}
            {selected.status === "UNMATCHED" && (
              <>
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                    <button
                      onClick={() => setCreateMode(false)}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", fontSize: 13, fontWeight: !createMode ? 600 : 500, background: !createMode ? "var(--accent-blue-light)" : "var(--bg-muted)", border: `1px solid ${!createMode ? "var(--accent-blue)" : "var(--border)"}`, color: !createMode ? "var(--accent-blue)" : "var(--text-secondary)", borderRadius: 20, cursor: "pointer" }}
                    >
                      <Link2 size={14} /> {t("dicom.linkExisting")}
                    </button>
                    <button
                      onClick={() => setCreateMode(true)}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", fontSize: 13, fontWeight: createMode ? 600 : 500, background: createMode ? "var(--accent-blue-light)" : "var(--bg-muted)", border: `1px solid ${createMode ? "var(--accent-blue)" : "var(--border)"}`, color: createMode ? "var(--accent-blue)" : "var(--text-secondary)", borderRadius: 20, cursor: "pointer" }}
                    >
                      <UserPlus size={14} /> {t("dicom.createPatient")}
                    </button>
                  </div>

                  {createMode ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>{t("dicom.create.hint")}</p>
                      <div style={{ display: "flex", gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <label style={labelStyle}>{t("patients.add.firstName")}</label>
                          <input value={createForm.firstName} onChange={(e) => setCreateForm((p) => ({ ...p, firstName: e.target.value }))} style={inputStyle} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={labelStyle}>{t("patients.add.lastName")}</label>
                          <input value={createForm.lastName} onChange={(e) => setCreateForm((p) => ({ ...p, lastName: e.target.value }))} style={inputStyle} />
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>{t("patients.add.fin")}</label>
                        <input value={createForm.fin} onChange={(e) => setCreateForm((p) => ({ ...p, fin: e.target.value.toUpperCase() }))} style={inputStyle} maxLength={7} placeholder={t("patients.add.finPh")} />
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <label style={labelStyle}>{t("patients.add.dob")}</label>
                          <DatePicker value={createForm.dateOfBirth} onChange={(v) => setCreateForm((p) => ({ ...p, dateOfBirth: v }))} placeholder={t("patients.add.dobPh")} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={labelStyle}>{t("patients.add.gender")}</label>
                          <select value={createForm.gender} onChange={(e) => setCreateForm((p) => ({ ...p, gender: e.target.value }))} style={inputStyle}>
                            <option value="">{t("patients.add.select")}</option>
                            {GENDERS.map((g) => <option key={g} value={g}>{t(`patients.gender.${g.toLowerCase()}`)}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <input
                        value={patientQuery}
                        onChange={(e) => setPatientQuery(e.target.value)}
                        placeholder={t("dicom.searchPatients")}
                        style={{ ...inputStyle, marginBottom: 8 }}
                      />
                      {filteredPatients.length === 0 ? (
                        <p style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center", padding: "16px 0", margin: 0 }}>
                          {t("dicom.noPatients")}
                        </p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
                          {filteredPatients.map((p) => {
                            const checked = linkTargetId === p.id;
                            return (
                              <label
                                key={p.id}
                                style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 12px", background: checked ? "var(--accent-blue-light)" : "var(--bg-base)", border: `1px solid ${checked ? "var(--accent-blue)" : "var(--border)"}`, borderRadius: 10, cursor: "pointer", transition: "all 0.15s" }}
                              >
                                <input
                                  type="radio"
                                  name="dicom-link-patient"
                                  checked={checked}
                                  onChange={() => setLinkTargetId(p.id)}
                                  style={{ accentColor: "var(--accent-blue)", width: 15, height: 15, flexShrink: 0 }}
                                />
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{p.firstName} {p.lastName}</div>
                                  <div style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "monospace" }}>{p.fin}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "space-between", alignItems: "center" }}>
                  <button
                    onClick={handleDiscard}
                    disabled={busy}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13, background: "none", border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer", color: "var(--text-secondary)" }}
                  >
                    <Trash2 size={14} /> {t("dicom.discard")}
                  </button>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={closeStudy}
                      style={{ padding: "8px 18px", fontSize: 13, background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer", color: "var(--text-primary)" }}
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      onClick={createMode ? handleCreate : handleLink}
                      disabled={busy}
                      style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, background: "var(--accent-blue)", border: "none", borderRadius: 10, cursor: "pointer", color: "#fff", opacity: busy ? 0.7 : 1 }}
                    >
                      {busy ? t("dicom.saving") : createMode ? t("dicom.createAndAttach") : t("dicom.attach")}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
