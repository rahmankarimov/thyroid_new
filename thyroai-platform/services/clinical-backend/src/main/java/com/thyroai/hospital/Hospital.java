package com.thyroai.hospital;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "hospitals")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Hospital {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String code;

    @Builder.Default private boolean active               = true;

    @Builder.Default private boolean grantAiSuggestion   = true;
    @Builder.Default private boolean grantPathologyInput  = true;
    @Builder.Default private boolean grantAnnotationTool  = true;
    @Builder.Default private boolean grantViewAnnotations = true;
    @Builder.Default private boolean grantImageGallery    = true;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
