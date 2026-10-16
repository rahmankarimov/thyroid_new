package com.thyroai.role;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class RoleDTO {
    private UUID id;
    private String name;
}
