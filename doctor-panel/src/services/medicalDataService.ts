import { api } from "./api";
import type { Patient, ExaminationMetric, PathologyResult, AuditEvent } from "../data/mockData";

export const medicalDataService = {
  getPatients(): Promise<Patient[]> {
    return api.get<Patient[]>("/patients");
  },

  getPatient(id: string): Promise<Patient> {
    return api.get<Patient>(`/patients/${id}`);
  },

  updatePatient(id: string, updates: Partial<Patient>): Promise<Patient> {
    return api.put<Patient>(`/patients/${id}`, updates);
  },

  deletePatient(id: string): Promise<void> {
    return api.del<void>(`/patients/${id}`);
  },

  createPatient(patient: {
    fullName: string;
    nationalId: string;
    birthDate: string;
    gender: "male" | "female" | "other";
    phone?: string;
  }): Promise<Patient> {
    return api.post<Patient>("/patients", patient);
  },

  createExamination(exam: {
    patientId: string;
    description?: string;
    notes?: string;
  }): Promise<{ id: string; patientId: string; status: string; createdAt: string }> {
    return api.post("/examinations", exam);
  },

  deleteExamination(id: string): Promise<void> {
    return api.del<void>(`/examinations/${id}`);
  },

  deleteSeries(id: string): Promise<void> {
    return api.del<void>(`/image-series/${id}`);
  },

  uploadImage(formData: FormData): Promise<{ id: string; examinationId: string; dicomInstanceUid?: string; localThumbnailPath?: string; sliceCount: number }> {
    const raw = localStorage.getItem("thyroai_user");
    const token = raw ? (JSON.parse(raw) as { token?: string }).token ?? null : null;
    const base = (import.meta.env.VITE_API_BASE as string | undefined) ?? "http://localhost:8080/api/v1";

    return fetch(`${base}/image-series/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        let msg = `Upload failed (${res.status})`;
        try {
          const body = await res.json() as { error?: string };
          if (body.error) msg = body.error;
        } catch { /* use default */ }
        throw new Error(msg);
      }
      const json = await res.json() as { data: { id: string; examinationId: string; dicomInstanceUid?: string; localThumbnailPath?: string; sliceCount: number } };
      return json.data;
    });
  },

  saveMetrics(metrics: {
    examinationId: string;
    leftLobeVolume?: number;
    rightLobeVolume?: number;
    isthmusThickness?: number;
    totalVolume?: number;
    notes?: string;
  }): Promise<ExaminationMetric> {
    return api.post<ExaminationMetric>("/examination-metrics", metrics);
  },

  deleteMetrics(id: string): Promise<void> {
    return api.del<void>(`/examination-metrics/${id}`);
  },

  savePathologyResult(result: {
    examinationId: string;
    diagnosis: string;
    notes?: string;
  }): Promise<PathologyResult> {
    return api.post<PathologyResult>("/pathology-results", result);
  },

  confirmPathologyResult(id: string): Promise<PathologyResult> {
    return api.post<PathologyResult>(`/pathology-results/${id}/confirm`);
  },

  logAuditEvent(event: {
    patientId: string;
    action: AuditEvent["action"];
    details?: string;
  }): Promise<void> {
    return api.post<void>("/audit-logs", event).catch(() => {});
  },

  getNextRandomExaminationId(): Promise<{ patientId: string, examId: string }> {
    return api.get<{ patientId: string, examId: string }>(`/rating-queue/next?_t=${Date.now()}`);
  },

  saveTiradsResult(examinationId: string, result: {
    totalPoints: number;
    level: string;
    composition?: string;
    echogenicity?: string;
    shape?: string;
    margin?: string;
    echogenicFoci?: string;
  }): Promise<any> {
    return api.post(`/examinations/${examinationId}/tirads`, result);
  },

  getTiradsResults(examinationId: string): Promise<any[]> {
    return api.get<any[]>(`/examinations/${examinationId}/tirads`);
  },
};
