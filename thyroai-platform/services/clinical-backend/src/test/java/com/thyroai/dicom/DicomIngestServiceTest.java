package com.thyroai.dicom;

import com.thyroai.dicom.dto.DicomInstanceIngestRequest;
import com.thyroai.dicom.dto.DicomStudyDTO;
import com.thyroai.dicom.dto.DicomStudyIngestRequest;
import com.thyroai.hospital.Hospital;
import com.thyroai.imageseries.ImageSeriesService;
import com.thyroai.patient.Patient;
import com.thyroai.patient.PatientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DicomIngestServiceTest {

    private static final String AE_TITLE = "USG_CLINICA";

    @Mock private DicomStudyRepository studyRepository;
    @Mock private DicomInstanceRepository instanceRepository;
    @Mock private HospitalModalityRepository modalityRepository;
    @Mock private PatientRepository patientRepository;
    @Mock private ImageSeriesService imageSeriesService;
    @Mock private DicomStudyMaterialiser materialiser;
    @Mock private DicomStudyMapper mapper;

    @InjectMocks private DicomIngestService service;

    private Hospital hospital;

    @BeforeEach
    void setUp() throws Exception {
        hospital = Hospital.builder().id(UUID.randomUUID()).name("Clinic A").code("CLINICA").build();

        when(studyRepository.findByOrthancStudyId(anyString())).thenReturn(Optional.empty());
        when(studyRepository.save(any(DicomStudy.class))).thenAnswer(inv -> {
            DicomStudy s = inv.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            return s;
        });
        when(instanceRepository.save(any(DicomInstance.class))).thenAnswer(inv -> inv.getArgument(0));
        when(imageSeriesService.storeBytes(anyString(), any())).thenReturn("/images/stored.jpg");
        when(mapper.toDetail(any())).thenReturn(DicomStudyDTO.builder().build());
    }

    // ------------------------------------------------------------ FIN parsing

    @Test
    void normalisesWellFormedFin() {
        assertThat(DicomIngestService.normaliseFin(" 4kj8n2p ")).isEqualTo("4KJ8N2P");
        assertThat(DicomIngestService.normaliseFin("4KJ-8N2P")).isEqualTo("4KJ8N2P");
    }

    @Test
    void rejectsIdentifiersThatAreNotFins() {
        assertThat(DicomIngestService.normaliseFin("TCGA-17-Z011")).isNull();   // the sample DICOMs
        assertThat(DicomIngestService.normaliseFin("12345")).isNull();          // too short
        assertThat(DicomIngestService.normaliseFin("")).isNull();
        assertThat(DicomIngestService.normaliseFin(null)).isNull();
    }

    // ------------------------------------------------------------ resolution

    @Test
    void quarantinesStudyFromUnknownAeTitle() {
        when(modalityRepository.findByAeTitleIgnoreCaseAndActiveTrue(anyString())).thenReturn(Optional.empty());

        service.ingest(request("4KJ8N2P"), Map.of());

        DicomStudy saved = captureSavedStudy();
        assertThat(saved.getStatus()).isEqualTo(DicomIngestStatus.UNMATCHED);
        assertThat(saved.getHospital()).isNull();
        assertThat(saved.getUnmatchedReason()).contains("Unknown or inactive AE Title");
        verify(materialiser, never()).materialise(any(), any(), any(), any());
    }

    @Test
    void quarantinesStudyWhosePatientIdIsNotAFin() {
        registerModality();

        service.ingest(request("TCGA-17-Z011"), Map.of());

        DicomStudy saved = captureSavedStudy();
        assertThat(saved.getStatus()).isEqualTo(DicomIngestStatus.UNMATCHED);
        assertThat(saved.getHospital()).isEqualTo(hospital);   // hospital still resolved
        assertThat(saved.getUnmatchedReason()).contains("not a valid FIN");
        verify(materialiser, never()).materialise(any(), any(), any(), any());
    }

    @Test
    void quarantinesStudyWhenNoPatientHasThatFin() {
        registerModality();
        when(patientRepository.findByFinAndHospital_Id(eq("4KJ8N2P"), any())).thenReturn(Optional.empty());

        service.ingest(request("4KJ8N2P"), Map.of());

        DicomStudy saved = captureSavedStudy();
        assertThat(saved.getStatus()).isEqualTo(DicomIngestStatus.UNMATCHED);
        assertThat(saved.getUnmatchedReason()).contains("No patient with FIN 4KJ8N2P");
        verify(materialiser, never()).materialise(any(), any(), any(), any());
    }

    @Test
    void materialisesStudyWhenHospitalAndPatientBothResolve() {
        registerModality();
        Patient patient = Patient.builder().id(UUID.randomUUID()).fin("4KJ8N2P").hospital(hospital).build();
        when(patientRepository.findByFinAndHospital_Id(eq("4KJ8N2P"), eq(hospital.getId())))
                .thenReturn(Optional.of(patient));

        service.ingest(request("4KJ8N2P"), Map.of());

        verify(materialiser).materialise(any(DicomStudy.class), eq(patient),
                eq(DicomIngestStatus.MATCHED), isNull());
    }

    // ------------------------------------------------------------ previews

    @Test
    void storesPreviewsEvenForUnmatchedStudies() throws Exception {
        // An admin reconciling an unmatched study must be able to see the images.
        when(modalityRepository.findByAeTitleIgnoreCaseAndActiveTrue(anyString())).thenReturn(Optional.empty());
        MultipartFile preview = new MockMultipartFile(
                "preview", "inst-1.jpg", "image/jpeg", new byte[]{1, 2, 3});

        service.ingest(request("TCGA-17-Z011"), Map.of("inst-1.jpg", preview));

        verify(imageSeriesService).storeBytes(anyString(), any());
        ArgumentCaptor<DicomInstance> captor = ArgumentCaptor.forClass(DicomInstance.class);
        verify(instanceRepository).save(captor.capture());
        assertThat(captor.getValue().getPreviewUrl()).isEqualTo("/images/stored.jpg");
    }

    // ------------------------------------------------------------ idempotency

    @Test
    void reIngestingTheSameStudyCreatesNoSecondExamination() {
        DicomStudy alreadyIngested = DicomStudy.builder()
                .id(UUID.randomUUID())
                .orthancStudyId("study-1")
                .studyInstanceUid("1.2.3")
                .status(DicomIngestStatus.MATCHED)
                .build();
        when(studyRepository.findByOrthancStudyId("study-1")).thenReturn(Optional.of(alreadyIngested));
        when(instanceRepository.existsByOrthancInstanceId("inst-1")).thenReturn(true);

        service.ingest(request("4KJ8N2P"), Map.of());

        verify(studyRepository, never()).save(any(DicomStudy.class));
        verify(instanceRepository, never()).save(any(DicomInstance.class));
        verify(materialiser, never()).materialise(any(), any(), any(), any());
    }

    @Test
    void reIngestingAddsOnlyInstancesNotSeenBefore() {
        DicomStudy alreadyIngested = DicomStudy.builder()
                .id(UUID.randomUUID())
                .orthancStudyId("study-1")
                .studyInstanceUid("1.2.3")
                .status(DicomIngestStatus.MATCHED)
                .build();
        when(studyRepository.findByOrthancStudyId("study-1")).thenReturn(Optional.of(alreadyIngested));
        when(instanceRepository.existsByOrthancInstanceId("inst-1")).thenReturn(true);
        when(instanceRepository.existsByOrthancInstanceId("inst-2")).thenReturn(false);

        DicomStudyIngestRequest request = request("4KJ8N2P");
        request.getInstances().add(instance("inst-2", 2));

        service.ingest(request, Map.of());

        ArgumentCaptor<DicomInstance> captor = ArgumentCaptor.forClass(DicomInstance.class);
        verify(instanceRepository).save(captor.capture());
        assertThat(captor.getValue().getOrthancInstanceId()).isEqualTo("inst-2");
    }

    // ------------------------------------------------------------ helpers

    private void registerModality() {
        when(modalityRepository.findByAeTitleIgnoreCaseAndActiveTrue(AE_TITLE))
                .thenReturn(Optional.of(HospitalModality.builder()
                        .id(UUID.randomUUID()).hospital(hospital).aeTitle(AE_TITLE).active(true).build()));
    }

    private DicomStudy captureSavedStudy() {
        ArgumentCaptor<DicomStudy> captor = ArgumentCaptor.forClass(DicomStudy.class);
        verify(studyRepository).save(captor.capture());
        return captor.getValue();
    }

    private DicomStudyIngestRequest request(String dicomPatientId) {
        DicomStudyIngestRequest r = new DicomStudyIngestRequest();
        r.setOrthancStudyId("study-1");
        r.setStudyInstanceUid("1.2.3");
        r.setSourceAeTitle(AE_TITLE);
        r.setDicomPatientId(dicomPatientId);
        r.setModality("US");
        r.setInstances(new java.util.ArrayList<>(List.of(instance("inst-1", 1))));
        return r;
    }

    private DicomInstanceIngestRequest instance(String id, int number) {
        DicomInstanceIngestRequest i = new DicomInstanceIngestRequest();
        i.setOrthancInstanceId(id);
        i.setInstanceNumber(number);
        i.setPreviewFilename(id + ".jpg");
        return i;
    }
}
