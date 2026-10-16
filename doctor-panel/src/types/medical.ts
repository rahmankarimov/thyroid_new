export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  fin: string;
  dateOfBirth: string;
  gender: "Male" | "Female";
  referredBy: string | null;
  assignedDoctorIds: string[];
  examinations: Examination[];
}

export interface Examination {
  id: string;
  patientId: string;
  examinationDate: string;
  status: string;
  imageSeries: ImageSeries[];
  aiScore?: AIScore;
  pathologyResult?: PathologyResult | null;
}

export interface ImageSeries {
  id: string;
  label: string;
  thumbnailUrl: string;
  fullUrl: string;
}

export interface AIScore {
  id: string;
  malignancyProbability: number;
  tiradsScore: string;
  justification: string;
}

export interface Annotation {
  id: string;
  imageSeriesId: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  path: Array<{ x: number; y: number }>;
  comment: string;
  color: string;
  shared: boolean;
  isOwner: boolean;
  createdAt: string;
}

export interface PathologyResult {
  id: string;
  examinationId: string;
  diagnosis: "Benign" | "Malignant" | "Indeterminate";
  notes: string;
  confirmedAt: string;
  confirmedBy: string;
  approvedForRetraining: boolean;
}

export interface AuditEvent {
  patientId?: string;
  action: string;
  details?: string;
}

export interface ExaminationMetric {
  id: string;
  examinationId: string;
  patientId: string;
  key: string;
  value: string;
  doctorName: string;
  createdAt: string;
  isOwner: boolean;
}

export interface WidgetSettings {
  showAISuggestion: boolean;
  showPathologyInput: boolean;
  showAnnotationTool: boolean;
  showViewAnnotations: boolean;
  showImageGallery: boolean;
  showPatients: boolean;
  showTiradsCalculator: boolean;
}
