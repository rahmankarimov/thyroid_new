package com.thyroai.dicom;

import com.thyroai.dicom.dto.DicomInstanceIngestRequest;
import com.thyroai.dicom.dto.DicomStudyDTO;
import com.thyroai.dicom.dto.DicomStudyIngestRequest;
import com.thyroai.hospital.Hospital;
import com.thyroai.imageseries.ImageSeriesService;
import com.thyroai.patient.Patient;
import com.thyroai.patient.PatientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Receives a DICOM study from the imaging pipeline and resolves it to a hospital and
 * a patient.
 *
 * <p>Resolution never guesses. A study is attached to a patient only when the sending
 * device's AE Title maps to a hospital <em>and</em> the DICOM PatientID is a well-formed
 * FIN that already exists in that hospital. Anything else is quarantined with a reason
 * for an admin to reconcile — a typo'd PatientID must not silently create a ghost patient.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DicomIngestService {

    /** Azerbaijani FIN: 7 alphanumeric characters. Matches {@code patients.fin VARCHAR(7)}. */
    private static final Pattern FIN_PATTERN = Pattern.compile("^[A-Z0-9]{7}$");

    private final DicomStudyRepository studyRepository;
    private final DicomInstanceRepository instanceRepository;
    private final HospitalModalityRepository modalityRepository;
    private final PatientRepository patientRepository;
    private final ImageSeriesService imageSeriesService;
    private final DicomStudyMaterialiser materialiser;
    private final DicomStudyMapper mapper;

    @Transactional
    public DicomStudyDTO ingest(DicomStudyIngestRequest request, Map<String, MultipartFile> previews) {
        // 1. Idempotency — RabbitMQ redelivers, and a device may re-send a study.
        Optional<DicomStudy> existing = studyRepository.findByOrthancStudyId(request.getOrthancStudyId());
        if (existing.isPresent()) {
            DicomStudy study = existing.get();
            int added = addNewInstances(study, request, previews);
            log.info("DICOM study {} already ingested (status {}); added {} new instance(s)",
                    study.getOrthancStudyId(), study.getStatus(), added);
            return mapper.toDetail(study);
        }

        // 2. Hospital — from the sending device's calling AE Title.
        Hospital hospital = null;
        String unmatchedReason = null;
        String aeTitle = trimToNull(request.getSourceAeTitle());
        if (aeTitle == null) {
            unmatchedReason = "Study arrived with no source AE Title";
        } else {
            Optional<HospitalModality> modality =
                    modalityRepository.findByAeTitleIgnoreCaseAndActiveTrue(aeTitle);
            if (modality.isPresent()) {
                hospital = modality.get().getHospital();
            } else {
                unmatchedReason = "Unknown or inactive AE Title: " + aeTitle;
            }
        }

        // 3 + 4. Patient — DICOM PatientID carries the FIN.
        Patient patient = null;
        if (hospital != null) {
            String fin = normaliseFin(request.getDicomPatientId());
            if (fin == null) {
                unmatchedReason = "PatientID is not a valid FIN: " + request.getDicomPatientId();
            } else {
                Optional<Patient> found = patientRepository.findByFinAndHospital_Id(fin, hospital.getId());
                if (found.isPresent()) {
                    patient = found.get();
                } else {
                    unmatchedReason = "No patient with FIN " + fin + " in " + hospital.getName();
                }
            }
        }

        DicomStudy study = studyRepository.save(DicomStudy.builder()
                .orthancStudyId(request.getOrthancStudyId())
                .studyInstanceUid(request.getStudyInstanceUid())
                .accessionNumber(request.getAccessionNumber())
                .studyDate(request.getStudyDate())
                .studyDescription(request.getStudyDescription())
                .modality(request.getModality())
                .dicomPatientId(request.getDicomPatientId())
                .dicomPatientName(request.getDicomPatientName())
                .dicomBirthDate(request.getDicomBirthDate())
                .dicomSex(request.getDicomSex())
                .sourceAeTitle(aeTitle)
                .institutionName(request.getInstitutionName())
                .hospital(hospital)
                .status(DicomIngestStatus.UNMATCHED)
                .unmatchedReason(unmatchedReason)
                .build());

        // 5. Store previews regardless of match outcome — an admin reconciling an
        //    unmatched study needs to see the images.
        for (DicomInstanceIngestRequest ir : request.getInstances()) {
            saveInstance(study, ir, previews);
        }

        // 6. Materialise or quarantine.
        if (patient != null) {
            materialiser.materialise(study, patient, DicomIngestStatus.MATCHED, null);
        } else {
            log.info("DICOM study {} quarantined: {}", study.getOrthancStudyId(), unmatchedReason);
        }

        return mapper.toDetail(study);
    }

    /**
     * A re-delivered study may carry instances we have not seen (the device sent more
     * images after the first stable-study event). Add only those.
     */
    private int addNewInstances(DicomStudy study, DicomStudyIngestRequest request,
                                Map<String, MultipartFile> previews) {
        int added = 0;
        for (DicomInstanceIngestRequest ir : request.getInstances()) {
            if (instanceRepository.existsByOrthancInstanceId(ir.getOrthancInstanceId())) {
                continue;
            }
            saveInstance(study, ir, previews);
            added++;
        }
        return added;
    }

    private void saveInstance(DicomStudy study, DicomInstanceIngestRequest ir,
                              Map<String, MultipartFile> previews) {
        String previewUrl = null;
        MultipartFile preview = ir.getPreviewFilename() != null
                ? previews.get(ir.getPreviewFilename()) : null;
        if (preview != null && !preview.isEmpty()) {
            try {
                previewUrl = imageSeriesService.storeBytes(UUID.randomUUID() + ".jpg", preview.getBytes());
            } catch (IOException e) {
                // Losing a preview must not fail the whole study — the .dcm is still
                // archived upstream and the admin can re-request it.
                log.error("Failed to store preview for instance {}: {}",
                        ir.getOrthancInstanceId(), e.getMessage());
            }
        }

        instanceRepository.save(DicomInstance.builder()
                .study(study)
                .orthancInstanceId(ir.getOrthancInstanceId())
                .seriesDescription(ir.getSeriesDescription())
                .instanceNumber(ir.getInstanceNumber())
                .archiveObjectKey(ir.getArchiveObjectKey())
                .previewUrl(previewUrl)
                .build());
    }

    /** Trims, uppercases and strips separators; returns null if the result is not a FIN. */
    static String normaliseFin(String dicomPatientId) {
        if (dicomPatientId == null) return null;
        String normalised = dicomPatientId.trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
        return FIN_PATTERN.matcher(normalised).matches() ? normalised : null;
    }

    private static String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    /** Convenience for tests and callers that only need a lookup map keyed by filename. */
    public static Map<String, MultipartFile> indexByFilename(MultipartFile[] files) {
        Map<String, MultipartFile> map = new HashMap<>();
        if (files == null) return map;
        for (MultipartFile f : files) {
            if (f != null && f.getOriginalFilename() != null) {
                map.put(f.getOriginalFilename(), f);
            }
        }
        return map;
    }
}
