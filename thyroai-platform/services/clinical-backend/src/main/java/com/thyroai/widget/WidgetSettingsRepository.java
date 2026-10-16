package com.thyroai.widget;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface WidgetSettingsRepository extends JpaRepository<WidgetSettings, UUID> {
    Optional<WidgetSettings> findByHospital_Id(UUID hospitalId);
    boolean existsByHospital_Id(UUID hospitalId);
}
