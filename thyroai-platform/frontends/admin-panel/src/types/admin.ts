export interface WidgetSettings {
  showAISuggestion: boolean;
  showPathologyInput: boolean;
  showAnnotationTool: boolean;
  showViewAnnotations: boolean;
  showImageGallery: boolean;
  showTiradsCalculator: boolean;
}

export interface HospitalGrants {
  grantAiSuggestion: boolean;
  grantPathologyInput: boolean;
  grantAnnotationTool: boolean;
  grantViewAnnotations: boolean;
  grantImageGallery: boolean;
}

export interface UserPermission {
  userId: string;
  canAnnotate: boolean;
  canViewAnnotations: boolean;
  canSubmitDiagnosis: boolean;
  canSeeAi: boolean;
  canSeeGallery: boolean;
  active: boolean;
  mustChangePassword: boolean;
  canSeePatients: boolean;
}

export interface DoctorUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "DOCTOR" | "ADMIN";
  active: boolean;
  customRoleName?: string;
  permissions: UserPermission;
}

export interface Role {
  id: string;
  name: string;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  fin: string;
  dateOfBirth: string | null;
  gender: string | null;
  referredBy: string | null;
  assignedDoctorIds: string[];
  examinations: unknown[];
}

// ── DICOM ingest ─────────────────────────────────────────────────────────────

export type DicomStatus = "UNMATCHED" | "MATCHED" | "LINKED" | "DISCARDED";

export interface DicomInstance {
  id: string;
  orthancInstanceId: string;
  seriesDescription: string | null;
  instanceNumber: number | null;
  previewUrl: string | null;
  imageSeriesId: string | null;
}

/** A study sent by an ultrasound device, as returned by /dicom/inbox. */
export interface DicomStudy {
  id: string;
  orthancStudyId: string;
  studyInstanceUid: string;
  accessionNumber: string | null;
  studyDate: string | null;
  studyDescription: string | null;
  modality: string | null;

  // Raw DICOM identity — what the sonographer typed on the machine.
  dicomPatientId: string | null;
  dicomPatientName: string | null;
  dicomBirthDate: string | null;
  dicomSex: string | null;
  sourceAeTitle: string | null;
  institutionName: string | null;

  status: DicomStatus;
  unmatchedReason: string | null;

  hospitalId: string | null;
  hospitalName: string | null;
  patientId: string | null;
  patientName: string | null;
  examinationId: string | null;

  receivedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;

  instanceCount: number;
  instances?: DicomInstance[];
}
