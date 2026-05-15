package com.alper.backend.news.repository;

import com.alper.backend.news.model.News;
import com.alper.backend.news.model.NewsStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface NewsRepository extends JpaRepository<News, Long> {

    // Base pagination query
    @Override
    @EntityGraph(attributePaths = {"source"})
    Page<News> findAll(Pageable pageable);

    @EntityGraph(attributePaths = {"source"})
    @Query(value = """
            SELECT DISTINCT n FROM News n
            LEFT JOIN n.categories c
            WHERE (:search IS NULL
                   OR LOWER(n.title) LIKE :search
                   OR LOWER(COALESCE(n.context, '')) LIKE :search
                   OR LOWER(n.canonicalUrl) LIKE :search)
              AND (:status IS NULL OR n.status = :status)
              AND (:sourceId IS NULL OR n.source.id = :sourceId)
              AND (:categoryId IS NULL OR c.id = :categoryId)
            """,
            countQuery = """
            SELECT COUNT(DISTINCT n) FROM News n
            LEFT JOIN n.categories c
            WHERE (:search IS NULL
                   OR LOWER(n.title) LIKE :search
                   OR LOWER(COALESCE(n.context, '')) LIKE :search
                   OR LOWER(n.canonicalUrl) LIKE :search)
              AND (:status IS NULL OR n.status = :status)
              AND (:sourceId IS NULL OR n.source.id = :sourceId)
              AND (:categoryId IS NULL OR c.id = :categoryId)
            """)
    Page<News> searchAdminNews(
            @Param("search") String search,
            @Param("status") NewsStatus status,
            @Param("sourceId") Long sourceId,
            @Param("categoryId") Long categoryId,
            Pageable pageable
    );

    // Find by canonical URL
    Optional<News> findByCanonicalUrl(String canonicalUrl);
    boolean existsByCanonicalUrl(String canonicalUrl);
    // Find by source and external ID
    Optional<News> findBySourceIdAndExternalId(Long sourceId, String externalId);

    // Find by id with eager relationships
    @Override
    @EntityGraph(attributePaths = {"source", "categories"})
    Optional<News> findById(Long id);

    // Find by status
    List<News> findByStatus(NewsStatus status);

    Page<News> findByStatus(NewsStatus status, Pageable pageable);

    // Find by source
    List<News> findBySourceId(Long sourceId);
    long countBySourceId(Long sourceId);

    Page<News> findBySourceId(Long sourceId, Pageable pageable);

    // Find by source and status
    Page<News> findBySourceIdAndStatus(Long sourceId, NewsStatus status, Pageable pageable);

    // Find by category
    @Query("SELECT n FROM News n JOIN n.categories c WHERE c.id = :categoryId")
    Page<News> findByCategoryId(@Param("categoryId") Long categoryId, Pageable pageable);

    // Find by category and status
    @Query("SELECT n FROM News n JOIN n.categories c WHERE c.id = :categoryId AND n.status = :status")
    Page<News> findByCategoryIdAndStatus(@Param("categoryId") Long categoryId, @Param("status") NewsStatus status, Pageable pageable);

    // Find by published date range
    Page<News> findByPublishedAtBetween(OffsetDateTime start, OffsetDateTime end, Pageable pageable);

    // Find by status and published date range
    Page<News> findByStatusAndPublishedAtBetween(NewsStatus status, OffsetDateTime start, OffsetDateTime end, Pageable pageable);
}
