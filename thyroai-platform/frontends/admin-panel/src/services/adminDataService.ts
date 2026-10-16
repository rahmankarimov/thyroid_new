import type { DicomStatus, DicomStudy, DoctorUser, HospitalGrants, Patient, Role, UserPermission, WidgetSettings } from "../types/admin";
import { api } from "./api";

export const adminDataService = {
  // ── Widget settings ────────────────────────────────────────────────────────

  getWidgetSettings(): Promise<WidgetSettings> {
    return api.get<WidgetSettings>("/widget-settings");
  },

  saveWidgetSettings(settings: WidgetSettings): Promise<WidgetSettings> {
    return api.put<WidgetSettings>("/widget-settings", settings);
  },

  getHospitalGrants(): Promise<HospitalGrants> {
    return api.get<{ grantAiSuggestion: boolean; grantPathologyInput: boolean; grantAnnotationTool: boolean; grantViewAnnotations: boolean; grantImageGallery: boolean }>("/hospitals/mine").then((h) => ({
      grantAiSuggestion:   h.grantAiSuggestion,
      grantPathologyInput: h.grantPathologyInput,
      grantAnnotationTool: h.grantAnnotationTool,
      grantViewAnnotations: h.grantViewAnnotations,
      grantImageGallery:   h.grantImageGallery,
    }));
  },

  // ── Personnel ─────────────────────────────────────────────────────────────

  getUsers(): Promise<DoctorUser[]> {
    return api.get<DoctorUser[]>("/users");
  },

  createUser(data: { email: string; password: string; firstName: string; lastName: string; role: string; customRoleId?: string }): Promise<DoctorUser> {
    return api.post<DoctorUser>("/users", data);
  },

  updateUser(id: string, data: { firstName?: string; lastName?: string; role?: string; active?: boolean; customRoleId?: string; clearCustomRole?: boolean }): Promise<DoctorUser> {
    return api.put<DoctorUser>(`/users/${id}`, data);
  },

  resetPassword(id: string, newPassword: string): Promise<void> {
    return api.put<void>(`/users/${id}/password`, { newPassword });
  },

  deleteUser(id: string): Promise<void> {
    return api.del<void>(`/users/${id}`);
  },

  updatePermissions(userId: string, perms: UserPermission): Promise<UserPermission> {
    return api.put<UserPermission>(`/users/${userId}/permissions`, perms);
  },

  // ── Roles (read-only — managed by backend seed) ───────────────────────────

  getRoles(): Promise<Role[]> {
    return api.get<Role[]>("/roles");
  },

  // ── Patients ──────────────────────────────────────────────────────────────

  getPatients(): Promise<Patient[]> {
    return api.get<{ content: Patient[] }>("/patients?size=200").then((r) => r.content);
  },

  createPatient(data: { firstName: string; lastName: string; fin: string; dateOfBirth?: string; gender?: string; referredBy?: string }): Promise<Patient> {
    return api.post<Patient>("/patients", data);
  },

  assignDoctors(patientId: string, doctorIds: string[]): Promise<void> {
    return api.put<void>(`/patients/${patientId}/assignments`, { doctorIds });
  },

  // ── Examinations ───────────────────────────────────────────────────────────

  createExamination(patientId: string, examinationDate: string): Promise<{ id: string }> {
    return api.post<{ id: string }>("/examinations", { patientId, examinationDate });
  },

  uploadImage(examinationId: string, file: File, label?: string): Promise<void> {
    const form = new FormData();
    form.append("file", file);
    if (label) form.append("label", label);
    return api.upload<void>(`/image-series/examination/${examinationId}`, form);
  },

  // ── DICOM inbox ────────────────────────────────────────────────────────────
  // Studies pushed here by the imaging pipeline when an ultrasound device sends
  // a scan. Anything the backend could not match to a patient waits for an admin.

  getDicomStudies(status: DicomStatus | "ALL" = "UNMATCHED", size = 100): Promise<DicomStudy[]> {
    return api
      .get<{ content: DicomStudy[] }>(`/dicom/inbox?status=${status}&size=${size}`)
      .then((r) => r.content);
  },

  getDicomStudy(id: string): Promise<DicomStudy> {
    return api.get<DicomStudy>(`/dicom/inbox/${id}`);
  },

  linkDicomStudy(id: string, patientId: string): Promise<DicomStudy> {
    return api.post<DicomStudy>(`/dicom/inbox/${id}/link`, { patientId });
  },

  createPatientFromDicomStudy(
    id: string,
    data: { firstName: string; lastName: string; fin: string; dateOfBirth?: string; gender?: string; referredBy?: string },
  ): Promise<DicomStudy> {
    return api.post<DicomStudy>(`/dicom/inbox/${id}/create-patient`, data);
  },

  discardDicomStudy(id: string): Promise<void> {
    return api.del<void>(`/dicom/inbox/${id}`);
  },
};
