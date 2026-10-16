package com.thyroai.dicom;

import com.thyroai.audit.AuditLog;
import com.thyroai.audit.AuditLogRepository;
import com.thyroai.common.AuditAction;
import com.thyroai.dicom.dto.CreatePatientFromStudyRequest;
import com.thyroai.dicom.dto.DicomStudyDTO;
import com.thyroai.patient.Patient;
import com.thyroai.patient.PatientRepository;
import com.thyroai.patient.PatientService;
import com.thyroai.user.User;
import com.thyroai.user.UserRepository;
import com.thyroai.user.UserRole;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Admin-facing reconciliation of DICOM studies that could not be resolved automatically.
 *
 * <p>Scoping mirrors {@link com.thyroai.patient.PatientService#findAll}: an admin sees
 * only their own hospital's studies. Studies whose AE Title matched no hospital belong
 * to no tenant and are visible to super admins only.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DicomInboxService {

    private final DicomStudyRepository studyRepository;
    private final PatientRepository patientRepository;
    private final PatientService patientService;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final DicomStudyMaterialiser materialiser;
    private final DicomStudyMapper mapper;

    public Page<DicomStudyDTO> findAll(String userEmail, DicomIngestStatus status, Pageable pageable) {
        User user = requireUser(userEmail);

        if (user.getRole() == UserRole.SUPER_ADMIN) {
            Page<DicomStudy> page = status != null
                    ? studyRepository.findByStatus(status, pageable)
                    : studyRepository.findAll(pageable);
            return page.map(mapper::toSummary);
        }

        if (user.getHospital() == null) return Page.empty(pageable);
        UUID hospitalId = user.getHospital().getId();
        Page<DicomStudy> page = status != null
                ? studyRepository.findByHospital_IdAndStatus(hospitalId, status, pageable)
                : studyRepository.findByHospital_Id(hospitalId, pageable);
        return page.map(mapper::toSummary);
    }

    public DicomStudyDTO findById(UUID id, String userEmail) {
        return mapper.toDetail(requireVisibleStudy(id, requireUser(userEmail)));
    }

    /** Attaches an unmatched study to an existing patient and creates the Examination. */
    @Transactional
    public DicomStudyDTO link(UUID studyId, UUID patientId, String userEmail) {
        User admin = requireUser(userEmail);
        DicomStudy study = requireVisibleStudy(studyId, admin);
        requirePending(study);

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new EntityNotFoundException("Patient not found: " + patientId));
        requireSameHospital(study, patient, admin);

        materialiser.materialise(study, patient, DicomIngestStatus.LINKED, admin);
        audit(admin, patient.getId(), AuditAction.DICOM_STUDY_LINKED,
                "Linked DICOM study " + study.getOrthancStudyId()
                        + " (PatientID " + study.getDicomPatientId() + ") to patient " + patient.getFin());
        return mapper.toDetail(study);
    }

    /**
     * Creates a patient from admin-confirmed demographics, then attaches the study.
     * Reuses {@link PatientService#create} so a patient already registered with this FIN
     * in the hospital is returned rather than duplicated.
     */
    @Transactional
    public DicomStudyDTO createPatientAndLink(UUID studyId, CreatePatientFromStudyRequest req, String userEmail) {
        User admin = requireUser(userEmail);
        DicomStudy study = requireVisibleStudy(studyId, admin);
        requirePending(study);

        if (admin.getHospital() == null) {
            throw new AccessDeniedException("Your account is not attached to a hospital.");
        }

        Patient patient = patientService.create(req.getFirstName(), req.getLastName(), req.getFin(),
                req.getDateOfBirth(), req.getGender(), req.getReferredBy(), userEmail);
        requireSameHospital(study, patient, admin);

        materialiser.materialise(study, patient, DicomIngestStatus.LINKED, admin);
        audit(admin, patient.getId(), AuditAction.DICOM_STUDY_LINKED,
                "Created patient " + patient.getFin() + " from DICOM study " + study.getOrthancStudyId());
        return mapper.toDetail(study);
    }

    /** Soft-rejects a study. The original DICOM stays in the pipeline's archive. */
    @Transactional
    public void discard(UUID studyId, String userEmail) {
        User admin = requireUser(userEmail);
        DicomStudy study = requireVisibleStudy(studyId, admin);
        requirePending(study);

        study.setStatus(DicomIngestStatus.DISCARDED);
        study.setResolvedBy(admin);
        study.setResolvedAt(LocalDateTime.now());
        studyRepository.save(study);

        audit(admin, null, AuditAction.DICOM_STUDY_DISCARDED,
                "Discarded DICOM study " + study.getOrthancStudyId()
                        + " (PatientID " + study.getDicomPatientId() + ")");
    }

    // ---------------------------------------------------------------- helpers

    private User requireUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + email));
    }

    private DicomStudy requireVisibleStudy(UUID id, User user) {
        DicomStudy study = studyRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("DICOM study not found: " + id));
        if (user.getRole() == UserRole.SUPER_ADMIN) return study;

        UUID userHospital = user.getHospital() != null ? user.getHospital().getId() : null;
        UUID studyHospital = study.getHospital() != null ? study.getHospital().getId() : null;
        if (userHospital == null || !userHospital.equals(studyHospital)) {
            throw new AccessDeniedException("This DICOM study belongs to another hospital.");
        }
        return study;
    }

    /** A study that already produced an Examination, or was discarded, cannot be re-resolved. */
    private void requirePending(DicomStudy study) {
        if (study.getStatus() != DicomIngestStatus.UNMATCHED) {
            throw new IllegalStateException(
                    "DICOM study is already " + study.getStatus() + " and cannot be reconciled again.");
        }
    }

    private void requireSameHospital(DicomStudy study, Patient patient, User admin) {
        if (patient.getHospital() == null) {
            throw new AccessDeniedException("That patient is not attached to a hospital.");
        }
        UUID target = patient.getHospital().getId();

        // The study's own hospital wins when known; otherwise (unknown AE Title, super
        // admin triage) fall back to the acting admin's hospital.
        UUID expected = study.getHospital() != null ? study.getHospital().getId()
                : (admin.getHospital() != null ? admin.getHospital().getId() : null);
        if (expected != null && !expected.equals(target)) {
            throw new AccessDeniedException("That patient belongs to a different hospital than this study.");
        }
    }

    private void audit(User actor, UUID patientId, AuditAction action, String details) {
        auditLogRepository.save(AuditLog.builder()
                .doctor(actor)
                .patientId(patientId)
                .action(action)
                .details(details)
                .build());
    }
}
