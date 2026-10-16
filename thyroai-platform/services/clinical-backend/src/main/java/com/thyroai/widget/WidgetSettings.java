package com.thyroai.widget;

import com.thyroai.hospital.Hospital;
import com.thyroai.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "widget_settings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WidgetSettings {

    @Id
    @Column(name = "hospital_id")
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "hospital_id")
    private Hospital hospital;

    @Column(name = "show_ai_suggestion")
    @Builder.Default
    private boolean showAISuggestion = true;
    @Builder.Default
    private boolean showPathologyInput = true;
    @Builder.Default
    private boolean showAnnotationTool = true;
    @Builder.Default
    private boolean showViewAnnotations = true;
    @Builder.Default
    private boolean showImageGallery = true;
    @Builder.Default
    private boolean showTiradsCalculator = true;

    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;
}
