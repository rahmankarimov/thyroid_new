package com.thyroai.dicom;

import com.thyroai.common.ApiResponse;
import com.thyroai.hospital.Hospital;
import com.thyroai.hospital.HospitalRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Registry of ultrasound devices per hospital, keyed by DICOM AE Title.
 *
 * <p>Nested under {@code /api/v1/hospitals/**}, which SecurityConfig already restricts
 * to SUPER_ADMIN — registering a device decides which tenant a study lands in, so it is
 * deliberately not something a hospital admin can do for themselves.
 */
@RestController
@RequestMapping("/api/v1/hospitals/{hospitalId}/modalities")
@Tag(name = "DICOM Modalities")
@RequiredArgsConstructor
public class HospitalModalityController {

    private final HospitalModalityRepository modalityRepository;
    private final HospitalRepository hospitalRepository;

    @Operation(summary = "List the DICOM devices registered to a hospital")
    @GetMapping
    public ResponseEntity<ApiResponse<List<HospitalModalityDTO>>> list(@PathVariable UUID hospitalId) {
        return ResponseEntity.ok(ApiResponse.ok(modalityRepository.findByHospital_Id(hospitalId)
                .stream().map(HospitalModalityController::toDTO).collect(Collectors.toList())));
    }

    @Operation(summary = "Register a DICOM device (AE Title) to a hospital")
    @PostMapping
    @Transactional
    public ResponseEntity<ApiResponse<HospitalModalityDTO>> create(
            @PathVariable UUID hospitalId,
            @Valid @RequestBody ModalityRequest request) {

        Hospital hospital = hospitalRepository.findById(hospitalId)
                .orElseThrow(() -> new EntityNotFoundException("Hospital not found: " + hospitalId));

        String aeTitle = request.getAeTitle().trim();
        // IllegalStateException, not ResponseStatusException: GlobalExceptionHandler maps the
        // former to 409 with this message intact, while its Exception catch-all would turn a
        // ResponseStatusException into a 500.
        modalityRepository.findByAeTitleIgnoreCase(aeTitle).ifPresent(clash -> {
            throw new IllegalStateException("AE Title '" + aeTitle + "' is already registered to "
                    + clash.getHospital().getName() + ".");
        });

        HospitalModality saved = modalityRepository.save(HospitalModality.builder()
                .hospital(hospital)
                .aeTitle(aeTitle)
                .stationName(request.getStationName())
                .description(request.getDescription())
                .active(request.isActive())
                .build());
        return ResponseEntity.ok(ApiResponse.ok(toDTO(saved)));
    }

    @Operation(summary = "Update a registered DICOM device")
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<HospitalModalityDTO>> update(
            @PathVariable UUID hospitalId,
            @PathVariable UUID id,
            @Valid @RequestBody ModalityRequest request) {

        HospitalModality modality = requireOwned(hospitalId, id);
        String aeTitle = request.getAeTitle().trim();
        modalityRepository.findByAeTitleIgnoreCase(aeTitle)
                .filter(other -> !other.getId().equals(id))
                .ifPresent(other -> {
                    throw new IllegalStateException("AE Title '" + aeTitle + "' is already registered to "
                            + other.getHospital().getName() + ".");
                });

        modality.setAeTitle(aeTitle);
        modality.setStationName(request.getStationName());
        modality.setDescription(request.getDescription());
        modality.setActive(request.isActive());
        return ResponseEntity.ok(ApiResponse.ok(toDTO(modalityRepository.save(modality))));
    }

    @Operation(summary = "Remove a registered DICOM device")
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID hospitalId, @PathVariable UUID id) {
        modalityRepository.delete(requireOwned(hospitalId, id));
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    private HospitalModality requireOwned(UUID hospitalId, UUID id) {
        HospitalModality modality = modalityRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Modality not found: " + id));
        if (!modality.getHospital().getId().equals(hospitalId)) {
            throw new EntityNotFoundException("Modality not found in this hospital: " + id);
        }
        return modality;
    }

    private static HospitalModalityDTO toDTO(HospitalModality m) {
        return HospitalModalityDTO.builder()
                .id(m.getId())
                .hospitalId(m.getHospital().getId())
                .aeTitle(m.getAeTitle())
                .stationName(m.getStationName())
                .description(m.getDescription())
                .active(m.isActive())
                .build();
    }

    @Data
    public static class ModalityRequest {
        @NotBlank
        @Size(max = 16, message = "A DICOM AE Title is at most 16 characters")
        private String aeTitle;

        @Size(max = 64)
        private String stationName;

        private String description;
        private boolean active = true;
    }

    @Data
    @Builder
    public static class HospitalModalityDTO {
        private UUID id;
        private UUID hospitalId;
        private String aeTitle;
        private String stationName;
        private String description;
        private boolean active;
    }
}
