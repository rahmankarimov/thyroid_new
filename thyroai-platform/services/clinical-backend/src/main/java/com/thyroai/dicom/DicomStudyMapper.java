package com.thyroai.dicom;

import com.thyroai.dicom.dto.DicomInstanceDTO;
import com.thyroai.dicom.dto.DicomStudyDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class DicomStudyMapper {

    private final DicomInstanceRepository instanceRepository;

    /** Summary form for inbox listings — instance count only, no preview payload. */
    public DicomStudyDTO toSummary(DicomStudy s) {
        List<DicomInstance> instances = instanceRepository.findByStudy_IdOrderByInstanceNumberAsc(s.getId());
        return base(s).instanceCount(instances.size()).build();
    }

    /** Detail form — includes every instance so the admin can eyeball the previews. */
    public DicomStudyDTO toDetail(DicomStudy s) {
        List<DicomInstance> instances = instanceRepository.findByStudy_IdOrderByInstanceNumberAsc(s.getId());
        return base(s)
                .instanceCount(instances.size())
                .instances(instances.stream().map(this::toInstanceDTO).collect(Collectors.toList()))
                .build();
    }

    private DicomStudyDTO.DicomStudyDTOBuilder base(DicomStudy s) {
        return DicomStudyDTO.builder()
                .id(s.getId())
                .orthancStudyId(s.getOrthancStudyId())
                .studyInstanceUid(s.getStudyInstanceUid())
                .accessionNumber(s.getAccessionNumber())
                .studyDate(s.getStudyDate())
                .studyDescription(s.getStudyDescription())
                .modality(s.getModality())
                .dicomPatientId(s.getDicomPatientId())
                .dicomPatientName(s.getDicomPatientName())
                .dicomBirthDate(s.getDicomBirthDate())
                .dicomSex(s.getDicomSex())
                .sourceAeTitle(s.getSourceAeTitle())
                .institutionName(s.getInstitutionName())
                .status(s.getStatus().name())
                .unmatchedReason(s.getUnmatchedReason())
                .hospitalId(s.getHospital() != null ? s.getHospital().getId() : null)
                .hospitalName(s.getHospital() != null ? s.getHospital().getName() : null)
                .patientId(s.getPatient() != null ? s.getPatient().getId() : null)
                .patientName(s.getPatient() != null
                        ? s.getPatient().getFirstName() + " " + s.getPatient().getLastName() : null)
                .examinationId(s.getExamination() != null ? s.getExamination().getId() : null)
                .receivedAt(s.getReceivedAt())
                .resolvedAt(s.getResolvedAt())
                .resolvedBy(s.getResolvedBy() != null ? s.getResolvedBy().getEmail() : null);
    }

    private DicomInstanceDTO toInstanceDTO(DicomInstance i) {
        return DicomInstanceDTO.builder()
                .id(i.getId())
                .orthancInstanceId(i.getOrthancInstanceId())
                .seriesDescription(i.getSeriesDescription())
                .instanceNumber(i.getInstanceNumber())
                .previewUrl(i.getPreviewUrl())
                .imageSeriesId(i.getImageSeriesId())
                .build();
    }
}
