package com.thyroai.imageseries;

import com.thyroai.examination.Examination;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "image_series")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = "examination")
@ToString(exclude = "examination")
public class ImageSeries {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "examination_id", nullable = false)
    private Examination examination;

    @Column(nullable = false)
    private String label;

    private String thumbnailUrl;
    private String fullUrl;

    @Builder.Default
    private LocalDateTime uploadedAt = LocalDateTime.now();
}
