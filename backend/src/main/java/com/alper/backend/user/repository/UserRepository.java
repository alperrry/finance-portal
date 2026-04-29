package com.alper.backend.user.repository;

import com.alper.backend.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByKeycloakId(String keycloakId);

    Optional<User> findByEmail(String email);

    Optional<User> findByUsername(String username);

    boolean existsByKeycloakId(String keycloakId);
}