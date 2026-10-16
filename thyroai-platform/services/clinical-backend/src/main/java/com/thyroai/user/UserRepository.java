package com.thyroai.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);

    // Eagerly fetches the hospital so hospital.active can be checked after the transaction closes.
    @Query("SELECT u FROM User u LEFT JOIN FETCH u.hospital WHERE u.email = :email")
    Optional<User> findByEmailEager(@Param("email") String email);
    boolean existsByEmail(String email);
    List<User> findByHospital_Id(UUID hospitalId);
    int countByHospital_Id(UUID hospitalId);
}
