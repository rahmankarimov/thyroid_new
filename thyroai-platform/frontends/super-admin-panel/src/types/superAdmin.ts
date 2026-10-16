export interface Hospital {
  id: string;
  name: string;
  code: string;
  active: boolean;
  grantAiSuggestion: boolean;
  grantPathologyInput: boolean;
  grantAnnotationTool: boolean;
  grantViewAnnotations: boolean;
  grantImageGallery: boolean;
  createdAt: string;
  userCount: number;
}

export interface HospitalAdmin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  active: boolean;
}

export interface CreateHospitalRequest {
  name: string;
  code: string;
}

/**
 * A registered DICOM device (ultrasound machine) belonging to a hospital.
 *
 * The calling AE Title is how an incoming study is attributed to a tenant — it is
 * configured on the physical machine, so it cannot be mistyped by an operator.
 * It is globally unique: one device belongs to exactly one hospital.
 */
export interface HospitalModality {
  id: string;
  hospitalId: string;
  aeTitle: string;
  stationName: string | null;
  description: string | null;
  active: boolean;
}

export interface ModalityRequest {
  aeTitle: string;
  stationName?: string;
  description?: string;
  active: boolean;
}

export interface HospitalFeatureGrants {
  grantAiSuggestion: boolean;
  grantPathologyInput: boolean;
  grantAnnotationTool: boolean;
  grantViewAnnotations: boolean;
  grantImageGallery: boolean;
}
