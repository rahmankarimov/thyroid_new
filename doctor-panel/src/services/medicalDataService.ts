import type { Annotation, ExaminationMetric, Patient, PathologyResult } from "../types/medical";
import { api } from "./api";

interface PagedResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  last: boolean;
}

interface RawAnnotation {
  id: string;
  imageSeriesId: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  path: string;
  comment: string;
  color: string;
  shared: boolean;
  isOwner: boolean;
  createdAt: string;
}

function parseAnnotation(raw: RawAnnotation): Annotation {
  return {
    ...raw,
    path: JSON.parse(raw.path) as Array<{ x: number; y: number }>,
  };
}

export const medicalDataService = {
  getPatients(): Promise<Patient[]> {
    return api
      .get<PagedResult<Patient>>("/patients?size=100")
      .then((r) => r.content);
  },

  getPatient(id: string): Promise<Patient> {
    return api.get<Patient>(`/patients/${id}`);
  },

  getAnnotations(imageSeriesId: string): Promise<Annotation[]> {
    return api
      .get<RawAnnotation[]>(`/annotations/image/${imageSeriesId}`)
      .then((items) => items.map(parseAnnotation));
  },

  saveAnnotation(req: {
    imageSeriesId: string;
    patientId: string;
    path: Array<{ x: number; y: number }>;
    comment: string;
    color: string;
  }): Promise<Annotation> {
    return api
      .post<RawAnnotation>("/annotations", {
        imageSeriesId: req.imageSeriesId,
        patientId: req.patientId,
        path: JSON.stringify(req.path),
        comment: req.comment,
        color: req.color,
      })
      .then(parseAnnotation);
  },

  deleteAnnotation(id: string): Promise<void> {
    return api.del<void>(`/annotations/${id}`);
  },

  setAnnotationShared(id: string, shared: boolean): Promise<Annotation> {
    return api.patch<RawAnnotation>(`/annotations/${id}/shared`, { shared }).then(parseAnnotation);
  },

  getExaminationMetrics(examinationId: string): Promise<ExaminationMetric[]> {
    return api.get<ExaminationMetric[]>(`/examination-metrics/examination/${examinationId}`);
  },

  getPatientMetrics(patientId: string): Promise<ExaminationMetric[]> {
    return api.get<ExaminationMetric[]>(`/examination-metrics/patient/${patientId}`);
  },

  addExaminationMetric(req: {
    examinationId: string;
    key: string;
    value: string;
  }): Promise<ExaminationMetric> {
    return api.post<ExaminationMetric>("/examination-metrics", req);
  },

  deleteExaminationMetric(id: string): Promise<void> {
    return api.del<void>(`/examination-metrics/${id}`);
  },

  savePathologyResult(req: {
    examinationId: string;
    diagnosis: string;
    notes: string;
  }): Promise<PathologyResult> {
    return api.post<PathologyResult>("/pathology", req);
  },

  logAuditEvent(event: {
    patientId?: string;
    action: string;
    details?: string;
  }): Promise<void> {
    return api.post<void>("/audit-logs", event).catch(() => {});
  },

  getNextRandomExaminationId(): Promise<{ patientId: string, examId: string }> {
    return api.get<{ patientId: string, examId: string }>("/rating-queue/next");
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
    return api.post<any>(`/examinations/${examinationId}/tirads`, result);
  },
};
