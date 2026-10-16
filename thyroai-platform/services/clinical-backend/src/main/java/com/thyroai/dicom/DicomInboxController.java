package com.thyroai.dicom;

import com.thyroai.common.ApiResponse;
import com.thyroai.common.PagedResponse;
import com.thyroai.dicom.dto.CreatePatientFromStudyRequest;
import com.thyroai.dicom.dto.DicomStudyDTO;
import com.thyroai.dicom.dto.LinkPatientRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Reconciliation inbox for DICOM studies that could not be matched to a patient
 * automatically. Hospital-scoped for admins; super admins see everything, including
 * studies from unregistered devices.
 */
@RestController
@RequestMapping("/api/v1/dicom/inbox")
@Tag(name = "DICOM Inbox")
@RequiredArgsConstructor
public class DicomInboxController {

    private final DicomInboxService inboxService;

    @Operation(summary = "List received DICOM studies (defaults to unmatched only)")
    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<DicomStudyDTO>>> list(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam(required = false, defaultValue = "UNMATCHED") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        DicomIngestStatus filter = "ALL".equalsIgnoreCase(status)
                ? null : DicomIngestStatus.valueOf(status.toUpperCase());

        Page<DicomStudyDTO> result = inboxService.findAll(principal.getUsername(), filter,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "receivedAt")));

        return ResponseEntity.ok(ApiResponse.ok(PagedResponse.<DicomStudyDTO>builder()
                .content(result.getContent())
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .last(result.isLast())
                .build()));
    }

    @Operation(summary = "Get one received study with its image previews")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DicomStudyDTO>> getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.ok(inboxService.findById(id, principal.getUsername())));
    }

    @Operation(summary = "Attach an unmatched study to an existing patient")
    @PostMapping("/{id}/link")
    public ResponseEntity<ApiResponse<DicomStudyDTO>> link(
            @PathVariable UUID id,
            @Valid @RequestBody LinkPatientRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.ok(
                inboxService.link(id, request.getPatientId(), principal.getUsername())));
    }

    @Operation(summary = "Create a patient from an unmatched study and attach it")
    @PostMapping("/{id}/create-patient")
    public ResponseEntity<ApiResponse<DicomStudyDTO>> createPatient(
            @PathVariable UUID id,
            @Valid @RequestBody CreatePatientFromStudyRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.ok(
                inboxService.createPatientAndLink(id, request, principal.getUsername())));
    }

    @Operation(summary = "Discard an unmatched study (soft — the DICOM archive is untouched)")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> discard(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        inboxService.discard(id, principal.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
