package com.thyroai.dicom;

import com.thyroai.examination.Examination;
import com.thyroai.examination.ExaminationRepository;
import com.thyroai.imageseries.ImageSeries;
import com.thyroai.imageseries.ImageSeriesRepository;
import com.thyroai.patient.Patient;
import com.thyroai.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Turns a resolved {@link DicomStudy} into the clinical record: one Examination plus
 * one ImageSeries per instance.
 *
 * <p>Shared by automatic ingest (AE Title + FIN both resolved) and by manual
 * reconciliation from the DICOM inbox, so both produce identical rows.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DicomStudyMaterialiser {

    private final ExaminationRepository examinationRepository;
    private final ImageSeriesRepository imageSeriesRepository;
    private final DicomInstanceRepository instanceRepository;
    private final DicomStudyRepository studyRepository;

    /**
     * Creates the Examination and its images, then stamps the outcome onto the study.
     *
     * @param status {@link DicomIngestStatus#MATCHED} when resolved automatically at
     *               ingest, {@link DicomIngestStatus#LINKED} when an admin did it
     * @param resolvedBy the admin who reconciled it; null for automatic matches
     */
    @Transactional
    public Examination materialise(DicomStudy study, Patient patient,
                                   DicomIngestStatus status, User resolvedBy) {
        Examination exam = examinationRepository.save(Examination.builder()
                .patient(patient)
                .examinationDate(study.getStudyDate() != null ? study.getStudyDate() : LocalDate.now())
                .source("DICOM")
                .build());

        List<DicomInstance> instances = instanceRepository.findByStudy_IdOrderByInstanceNumberAsc(study.getId());
        for (DicomInstance instance : instances) {
            if (instance.getPreviewUrl() == null) {
                // The pipeline could not render this instance (e.g. a non-image SOP class).
                // The .dcm is still archived; there is just nothing for the gallery to show.
                continue;
            }
            ImageSeries series = imageSeriesRepository.save(ImageSeries.builder()
                    .examination(exam)
                    .label(labelFor(instance))
                    .fullUrl(instance.getPreviewUrl())
                    .thumbnailUrl(instance.getPreviewUrl())
                    .build());
            instance.setImageSeriesId(series.getId());
            instanceRepository.save(instance);
        }

        study.setPatient(patient);
        study.setHospital(patient.getHospital());
        study.setExamination(exam);
        study.setStatus(status);
        study.setUnmatchedReason(null);
        study.setResolvedBy(resolvedBy);
        study.setResolvedAt(LocalDateTime.now());
        studyRepository.save(study);

        log.info("DICOM study {} materialised as examination {} for patient {} ({})",
                study.getOrthancStudyId(), exam.getId(), patient.getId(), status);
        return exam;
    }

    private String labelFor(DicomInstance instance) {
        if (instance.getSeriesDescription() != null && !instance.getSeriesDescription().isBlank()) {
            return instance.getInstanceNumber() != null
                    ? instance.getSeriesDescription() + " " + instance.getInstanceNumber()
                    : instance.getSeriesDescription();
        }
        return "Image " + (instance.getInstanceNumber() != null ? instance.getInstanceNumber() : "");
    }
}
