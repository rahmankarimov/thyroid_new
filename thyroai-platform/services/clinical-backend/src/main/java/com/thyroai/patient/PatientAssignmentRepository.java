package com.thyroai.patient;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface PatientAssignmentRepository extends JpaRepository<PatientAssignment, PatientAssignmentId> {
    List<PatientAssignment> findByPatient_Id(UUID patientId);
    void deleteByPatient_Id(UUID patientId);

    boolean existsByPatient_IdAndDoctor_Id(UUID patientId, UUID doctorId);

    @Query("SELECT pa.patient FROM PatientAssignment pa WHERE pa.doctor.id = :doctorId")
    List<Patient> findPatientsByDoctorId(@Param("doctorId") UUID doctorId);

    void deleteByDoctor_IdIn(List<UUID> doctorIds);

    void deleteByAssignedBy_IdIn(List<UUID> assignedByIds);
}
