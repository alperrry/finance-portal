package com.alper.backend.news.repository;

import com.alper.backend.news.model.Source;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * Source varlığı için CRUD ve URL tekliği kontrol sorguları.
 */
public interface SourceRepository extends JpaRepository<Source, Long> {
    List<Source> findByIsActiveTrue();
    Optional<Source> findByName(String name);
    Optional<Source> findBySourceUrl(String sourceUrl);
    boolean existsBySourceUrl(String sourceUrl);
}
