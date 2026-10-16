import { useState, useEffect, useContext, useRef } from "react";
import { Plus, Search, RefreshCw, UserCheck, X, Upload, ImageIcon } from "lucide-react";
import { adminDataService } from "../services/adminDataService";
import type { DoctorUser, Patient } from "../types/admin";
import { ToastContext } from "../App";
import { DatePicker } from "../components/DatePicker";
import { useT } from "../i18n";

const GENDERS = ["MALE", "FEMALE"];

export function PatientsPage() {
  const toast = useContext(ToastContext);
  const t = useT();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<DoctorUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add patient modal
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    firstName: "", lastName: "", fin: "", dateOfBirth: "", gender: "", referredBy: "", checkupDate: "",
  });
  const [addImages, setAddImages] = useState<File[]>([]);
  const [addLoading, setAddLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Assign doctors modal
  const [assignPatient, setAssignPatient] = useState<Patient | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [pts, users] = await Promise.all([
        adminDataService.getPatients(),
        adminDataService.getUsers(),
      ]);
      setPatients(pts);
      setDoctors(users.filter((u) => u.role === "DOCTOR"));
    } catch {
      toast(t("patients.toast.loadFailed"), "error");
    } finally {
      setLoading(false);
    }
  }

  const filtered = patients.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      p.fin.toLowerCase().includes(q)
    );
  });

  async function handleAdd() {
    if (!addForm.firstName.trim() || !addForm.lastName.trim() || !addForm.fin.trim()) {
      toast(t("patients.toast.reqFields"), "error");
      return;
    }
    if (addImages.length > 0 && !addForm.checkupDate) {
      toast(t("patients.toast.reqCheckupDate"), "error");
      return;
    }
    setAddLoading(true);
    try {
      const created = await adminDataService.createPatient({
        firstName: addForm.firstName.trim(),
        lastName: addForm.lastName.trim(),
        fin: addForm.fin.trim(),
        dateOfBirth: addForm.dateOfBirth || undefined,
        gender: addForm.gender || undefined,
        referredBy: addForm.referredBy.trim() || undefined,
      });

      const alreadyExists = patients.some((p) => p.id === created.id);

      if (addForm.checkupDate) {
        const exam = await adminDataService.createExamination(created.id, addForm.checkupDate);
        for (const file of addImages) {
          await adminDataService.uploadImage(exam.id, file);
        }
      }

      setPatients((prev) => alreadyExists ? prev : [created, ...prev]);
      setAddOpen(false);
      setAddForm({ firstName: "", lastName: "", fin: "", dateOfBirth: "", gender: "", referredBy: "", checkupDate: "" });
      setAddImages([]);
      if (alreadyExists) {
        toast(addForm.checkupDate ? t("patients.toast.newCheckup") : t("patients.toast.alreadyReg"), "info");
      } else {
        toast(addForm.checkupDate ? t("patients.toast.registeredCheckup") : t("patients.toast.registered"), "success");
      }
    } catch (e: unknown) {
      toast((e as Error)?.message || t("patients.toast.addFailed"), "error");
    } finally {
      setAddLoading(false);
    }
  }

  function openAssign(p: Patient) {
    setAssignPatient(p);
    setSelectedIds(p.assignedDoctorIds ?? []);
  }

  async function handleAssign() {
    if (!assignPatient) return;
    setAssignLoading(true);
    try {
      await adminDataService.assignDoctors(assignPatient.id, selectedIds);
      setPatients((prev) =>
        prev.map((p) =>
          p.id === assignPatient.id ? { ...p, assignedDoctorIds: selectedIds } : p
        )
      );
      setAssignPatient(null);
      toast(t("patients.assign.saved"), "success");
    } catch {
      toast(t("patients.assign.failed"), "error");
    } finally {
      setAssignLoading(false);
    }
  }

  function toggleDoctor(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

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

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1100 }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{t("patients.title")}</h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0" }}>
            {t("patients.subtitle", { count: patients.length })}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => toast(t("patients.fetchAllToast"), "info")}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13, fontWeight: 500, background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer", color: "var(--text-secondary)" }}
          >
            <RefreshCw size={14} />
            {t("patients.fetchAll")}
          </button>
          <button
            onClick={() => setAddOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13, fontWeight: 600, background: "var(--accent-blue)", border: "none", borderRadius: 10, cursor: "pointer", color: "#fff" }}
          >
            <Plus size={14} />
            {t("patients.addPatient")}
          </button>
        </div>
      </div>

      {/* ── Search ── */}
      <div style={{ position: "relative", marginBottom: 20, maxWidth: 360 }}>
        <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("patients.search")}
          style={{ ...inputStyle, paddingLeft: 32, background: "var(--bg-surface)" }}
        />
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-secondary)", fontSize: 14 }}>{t("patients.loading")}</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-secondary)", fontSize: 14 }}>
          {search ? t("patients.noneSearch") : t("patients.noneYet")}
        </div>
      ) : (
        <div className="soft-table-wrap">
          <table className="soft-table" style={{ fontSize: 14 }}>
            <thead>
              <tr>
                {["patients.col.fullName", "patients.col.fin", "patients.col.dob", "patients.col.gender", "patients.col.referredBy", "patients.col.doctors", ""].map((h) => (
                  <th key={h}>{h ? t(h) : ""}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const count = p.assignedDoctorIds?.length ?? 0;
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--hairline)" }}>
                    <td style={{ padding: "14px 18px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {p.firstName} {p.lastName}
                    </td>
                    <td style={{ padding: "14px 18px", fontFamily: "monospace", fontSize: 13, color: "var(--text-secondary)" }}>
                      {p.fin}
                    </td>
                    <td style={{ padding: "14px 18px", color: "var(--text-secondary)" }}>
                      {p.dateOfBirth ?? "—"}
                    </td>
                    <td style={{ padding: "14px 18px", color: "var(--text-secondary)" }}>
                      {p.gender ? t(`patients.gender.${p.gender.toLowerCase()}`) : "—"}
                    </td>
                    <td style={{ padding: "14px 18px", color: "var(--text-secondary)" }}>
                      {p.referredBy ?? "—"}
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          background: count > 0 ? "var(--accent-blue-light)" : "var(--bg-muted)",
                          color: count > 0 ? "var(--accent-blue)" : "var(--text-secondary)",
                          borderRadius: 20,
                          padding: "2px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {t("patients.doctorsCount", { count })}
                      </span>
                    </td>
                    <td style={{ padding: "14px 18px", textAlign: "right" }}>
                      <button
                        onClick={() => openAssign(p)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", fontSize: 12, fontWeight: 500, background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", color: "var(--text-primary)" }}
                      >
                        <UserCheck size={13} />
                        {t("patients.assign")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add Patient Modal ── */}
      {addOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(38,48,63,0.35)", backdropFilter: "blur(2px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", padding: 32, width: 540, maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{t("patients.add.title")}</h2>
              <button onClick={() => { setAddOpen(false); setAddImages([]); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Name row */}
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>{t("patients.add.firstName")}</label>
                  <input value={addForm.firstName} onChange={(e) => setAddForm((p) => ({ ...p, firstName: e.target.value }))} placeholder={t("patients.add.firstNamePh")} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>{t("patients.add.lastName")}</label>
                  <input value={addForm.lastName} onChange={(e) => setAddForm((p) => ({ ...p, lastName: e.target.value }))} placeholder={t("patients.add.lastNamePh")} style={inputStyle} />
                </div>
              </div>

              {/* FIN */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>{t("patients.add.fin")}</label>
                <input value={addForm.fin} onChange={(e) => setAddForm((p) => ({ ...p, fin: e.target.value }))} placeholder={t("patients.add.finPh")} style={inputStyle} maxLength={7} />
              </div>

              {/* Date of Birth + Gender row */}
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>{t("patients.add.dob")}</label>
                  <DatePicker value={addForm.dateOfBirth} onChange={(v) => setAddForm((p) => ({ ...p, dateOfBirth: v }))} placeholder={t("patients.add.dobPh")} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>{t("patients.add.gender")}</label>
                  <select value={addForm.gender} onChange={(e) => setAddForm((p) => ({ ...p, gender: e.target.value }))} style={inputStyle}>
                    <option value="">{t("patients.add.select")}</option>
                    {GENDERS.map((g) => <option key={g} value={g}>{t(`patients.gender.${g.toLowerCase()}`)}</option>)}
                  </select>
                </div>
              </div>

              {/* Referred By */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>{t("patients.add.referredBy")}</label>
                <input value={addForm.referredBy} onChange={(e) => setAddForm((p) => ({ ...p, referredBy: e.target.value }))} placeholder={t("patients.add.referredByPh")} style={inputStyle} />
              </div>

              {/* Divider */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10, letterSpacing: "0.04em" }}>{t("patients.add.initialCheckup")}</div>

                {/* Check-up Date */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>{t("patients.add.checkupDate")}</label>
                  <DatePicker value={addForm.checkupDate} onChange={(v) => setAddForm((p) => ({ ...p, checkupDate: v }))} placeholder={t("patients.add.checkupDatePh")} />
                </div>

                {/* UZI Image Upload */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                    {t("patients.add.uzi")} {addForm.checkupDate ? "" : <span style={{ fontWeight: 400, opacity: 0.7 }}>{t("patients.add.uziRequires")}</span>}
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      setAddImages((prev) => [...prev, ...files]);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: "100%", padding: "10px 14px", border: "1.5px dashed var(--border)", borderRadius: 10,
                      background: "var(--bg-base)", cursor: "pointer", display: "flex", alignItems: "center",
                      justifyContent: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", boxSizing: "border-box",
                    }}
                  >
                    <Upload size={14} /> {t("patients.add.chooseUzi")}
                  </button>
                  {addImages.length > 0 && (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                      {addImages.map((f, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-muted)", borderRadius: 6, padding: "5px 10px" }}>
                          <ImageIcon size={13} style={{ color: "var(--accent-blue)", flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: 12, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                          <button type="button" onClick={() => setAddImages((prev) => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", padding: 0 }}>
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setAddOpen(false); setAddImages([]); }}
                style={{ padding: "8px 18px", fontSize: 13, background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer", color: "var(--text-primary)" }}
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleAdd}
                disabled={addLoading}
                style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, background: "var(--accent-blue)", border: "none", borderRadius: 10, cursor: "pointer", color: "#fff", opacity: addLoading ? 0.7 : 1 }}
              >
                {addLoading ? t("patients.add.adding") : t("patients.add.submit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign Doctors Modal ── */}
      {assignPatient && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(38,48,63,0.35)", backdropFilter: "blur(2px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", padding: 32, width: 440, maxWidth: "90vw", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{t("patients.assign.title")}</h2>
              <button onClick={() => setAssignPatient(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4, marginBottom: 20 }}>
              {assignPatient.firstName} {assignPatient.lastName}
              {" · "}
              <span style={{ fontFamily: "monospace" }}>{assignPatient.fin}</span>
            </p>

            {doctors.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center", padding: "20px 0" }}>
                {t("patients.assign.none")}
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
                {doctors.map((d) => {
                  const checked = selectedIds.includes(d.id);
                  return (
                    <label
                      key={d.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 12px",
                        background: checked ? "var(--accent-blue-light)" : "var(--bg-base)",
                        border: `1px solid ${checked ? "var(--accent-blue)" : "var(--border)"}`,
                        borderRadius: 10,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDoctor(d.id)}
                        style={{ accentColor: "var(--accent-blue)", width: 15, height: 15, flexShrink: 0 }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                          {d.firstName} {d.lastName}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                          {d.email}
                          {d.customRoleName ? ` · ${d.customRoleName}` : ""}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
              <button
                onClick={() => setAssignPatient(null)}
                style={{ padding: "8px 18px", fontSize: 13, background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer", color: "var(--text-primary)" }}
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleAssign}
                disabled={assignLoading}
                style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, background: "var(--accent-blue)", border: "none", borderRadius: 10, cursor: "pointer", color: "#fff", opacity: assignLoading ? 0.7 : 1 }}
              >
                {assignLoading ? t("patients.assign.saving") : t("patients.assign.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
