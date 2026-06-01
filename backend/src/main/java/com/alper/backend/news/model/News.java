package com.alper.backend.news.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.BatchSize;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Harici kaynaklardan çekilen veya manuel eklenen haber makalesini temsil eder.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "news")
public class News {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column
    private String context;

    @Column(name = "published_at")
    private OffsetDateTime publishedAt;

    @Column(name = "canonical_url", nullable = false)
    private String canonicalUrl;

    @Column(name = "external_id")
    private String externalId;

    @Column(name = "image_url")
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NewsStatus status = NewsStatus.published;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "source_id", nullable = false)
    private Source source;

    @ManyToMany
    @BatchSize(size = 50)
    @JoinTable(
            name = "news_categories",
            joinColumns = @JoinColumn(name = "news_id"),
            inverseJoinColumns = @JoinColumn(name = "category_id")
    )
    private Set<Category> categories = new HashSet<>();

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;


}
