package com.thyroai.patient;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface PatientRepository extends JpaRepository<Patient, UUID> {
    Optional<Patient> findByFin(String fin);
    Optional<Patient> findByFinAndHospital_Id(String fin, UUID hospitalId);

    Page<Patient> findByHospital_Id(UUID hospitalId, Pageable pageable);

    @Query("SELECT p FROM Patient p WHERE LOWER(p.firstName) LIKE LOWER(CONCAT('%',:q,'%')) OR LOWER(p.lastName) LIKE LOWER(CONCAT('%',:q,'%')) OR LOWER(p.fin) LIKE LOWER(CONCAT('%',:q,'%'))")
    Page<Patient> search(@Param("q") String query, Pageable pageable);

    @Query("SELECT p FROM Patient p WHERE p.hospital.id = :hospitalId AND (LOWER(p.firstName) LIKE LOWER(CONCAT('%',:q,'%')) OR LOWER(p.lastName) LIKE LOWER(CONCAT('%',:q,'%')) OR LOWER(p.fin) LIKE LOWER(CONCAT('%',:q,'%')))")
    Page<Patient> searchInHospital(@Param("hospitalId") UUID hospitalId, @Param("q") String query, Pageable pageable);
}
