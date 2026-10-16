package com.thyroai.role;

import com.thyroai.common.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/roles")
@Tag(name = "Roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleRepository roleRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<RoleDTO>>> list() {
        List<RoleDTO> roles = roleRepository.findAll().stream()
                .map(r -> RoleDTO.builder().id(r.getId()).name(r.getName()).build())
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(roles));
    }
}
