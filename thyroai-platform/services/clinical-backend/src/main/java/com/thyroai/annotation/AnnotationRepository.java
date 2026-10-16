package com.thyroai.annotation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AnnotationRepository extends JpaRepository<Annotation, UUID> {
    List<Annotation> findByImageSeriesIdAndDeletedAtIsNull(UUID imageSeriesId);
}
