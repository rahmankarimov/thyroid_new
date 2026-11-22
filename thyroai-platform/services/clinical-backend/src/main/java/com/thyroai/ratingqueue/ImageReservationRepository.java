package com.thyroai.ratingqueue;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface ImageReservationRepository extends JpaRepository<ImageReservation, UUID> {

    @Query("SELECT r FROM ImageReservation r WHERE r.clinicianId = :clinicianId AND r.status = 'ACTIVE' AND r.expiresAt > :now ORDER BY r.expiresAt DESC")
    List<ImageReservation> findActiveByClinician(@Param("clinicianId") UUID clinicianId, @Param("now") LocalDateTime now);

    @Query("SELECT r FROM ImageReservation r WHERE r.examinationId = :examId AND r.clinicianId = :clinicianId AND r.status = 'ACTIVE'")
    List<ImageReservation> findActiveByExamAndClinician(@Param("examId") UUID examId, @Param("clinicianId") UUID clinicianId);

    @Modifying
    @Query("UPDATE ImageReservation r SET r.status = 'EXPIRED' WHERE r.status = 'ACTIVE' AND r.expiresAt <= :now")
    int expireStaleReservations(@Param("now") LocalDateTime now);

    @Modifying
    @Query("UPDATE ImageReservation r SET r.status = 'EXPIRED' WHERE r.clinicianId = :clinicianId AND r.status = 'ACTIVE'")
    int expireActiveByClinician(@Param("clinicianId") UUID clinicianId);

    @Modifying
    @Query("UPDATE ImageReservation r SET r.status = 'RELEASED' WHERE r.clinicianId = :clinicianId AND r.status = 'ACTIVE'")
    int releaseActiveByClinician(@Param("clinicianId") UUID clinicianId);
}
