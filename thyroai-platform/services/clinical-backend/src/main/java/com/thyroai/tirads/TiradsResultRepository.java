package com.thyroai.tirads;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.Query;
import com.thyroai.admin.dto.DoctorActivityDTO;

@Repository
public interface TiradsResultRepository extends JpaRepository<TiradsResult, UUID> {
    List<TiradsResult> findByExaminationIdOrderByCreatedAtDesc(UUID examinationId);
    List<TiradsResult> findByCreatedByIdOrderByCreatedAtDesc(UUID createdById);

    @Query("SELECT new com.thyroai.admin.dto.DoctorActivityDTO(u.id, CONCAT(u.firstName, ' ', u.lastName), u.email, COUNT(tr.id)) " +
           "FROM User u LEFT JOIN TiradsResult tr ON tr.createdBy.id = u.id " +
           "WHERE u.role = 'DOCTOR' " +
           "GROUP BY u.id, u.firstName, u.lastName, u.email " +
           "ORDER BY COUNT(tr.id) DESC")
    List<DoctorActivityDTO> getDoctorActivity();
}
