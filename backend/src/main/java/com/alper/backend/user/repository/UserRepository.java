package com.alper.backend.user.repository;

import com.alper.backend.user.model.User;
import com.alper.backend.user.model.UserRole;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * User varlığı için CRUD ve Keycloak ID bazlı arama sorguları.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByKeycloakId(String keycloakId);

    Optional<User> findByEmail(String email);

    Optional<User> findByUsername(String username);

    boolean existsByKeycloakId(String keycloakId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") Long id);

    long countByRoleAndIsActiveAndIdNot(UserRole userRole, boolean b, Long id);

    @Query("""
            SELECT u
            FROM User u
            WHERE (:role IS NULL OR u.role = :role)
              AND (:active IS NULL OR u.isActive = :active)
              AND (
                    :search IS NULL
                    OR :search = ''
                    OR LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(COALESCE(u.firstName, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(COALESCE(u.lastName, '')) LIKE LOWER(CONCAT('%', :search, '%'))
              )
            """)
    Page<User> searchAdminUsers(
            @Param("search") String search,
            @Param("role") UserRole role,
            @Param("active") Boolean active,
            Pageable pageable
    );
}
