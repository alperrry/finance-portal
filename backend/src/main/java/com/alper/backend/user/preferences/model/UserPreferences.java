package com.alper.backend.user.preferences.model;

import com.alper.backend.user.model.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Kullanıcının tema, dil ve arayüz yoğunluğu gibi kişisel arayüz tercihlerini saklar.
 */
@Entity
@Table(name = "user_preferences")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPreferences {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // One-to-one User ilişkisi. user_id UNIQUE olduğu için 1-1 garanti.
    // LAZY: kullanıcıyı çekerken tercihleri otomatik yüklenmesin.
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column(name = "theme", nullable = false, length = 16)
    private ThemePreference theme;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column(name = "locale", nullable = false, length = 8)
    private LocalePreference locale;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Yeni kullanıcı için varsayılan tercih kaydı üretir.
    public static UserPreferences defaultsFor(User user) {
        return UserPreferences.builder()
                .user(user)
                .theme(ThemePreference.SYSTEM)
                .locale(LocalePreference.TR)
                .build();
    }
}
