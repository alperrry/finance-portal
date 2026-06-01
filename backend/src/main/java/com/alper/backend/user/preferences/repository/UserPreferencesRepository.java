package com.alper.backend.user.preferences.repository;

import com.alper.backend.user.preferences.model.UserPreferences;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * UserPreferences varlığı için CRUD ve kullanıcıya özel sorgular.
 */
public interface UserPreferencesRepository extends JpaRepository<UserPreferences, Long> {

    // user_id üzerinden tek kayıt. One-to-one olduğu için Optional tek sonuç döner.
    Optional<UserPreferences> findByUserId(Long userId);
}