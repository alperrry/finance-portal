package com.alper.backend.news.dto;

import com.alper.backend.news.model.News;
import com.alper.backend.news.model.NewsStatus;
import com.alper.backend.news.model.Source;
import com.alper.backend.news.model.Category;

import java.io.Serial;
import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class NewsResponse implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private Long id;
    private String title;
    private String context;
    private OffsetDateTime publishedAt;
    private String canonicalUrl;
    private String externalId;
    private NewsStatus status;
    private SourceSummary source;
    private List<CategorySummary> categories = new ArrayList<>();
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public NewsResponse() {}

    public NewsResponse(News news) {
        this.id = news.getId();
        this.title = news.getTitle();
        this.context = news.getContext();
        this.publishedAt = news.getPublishedAt();
        this.canonicalUrl = news.getCanonicalUrl();
        this.externalId = news.getExternalId();
        this.status = news.getStatus();
        if (news.getSource() != null) {
            this.source = new SourceSummary(news.getSource());
        }
        if (news.getCategories() != null && !news.getCategories().isEmpty()) {
            this.categories = news.getCategories().stream()
                .map(CategorySummary::new)
                .sorted(Comparator.comparing(CategorySummary::getName, String.CASE_INSENSITIVE_ORDER))
                .toList();
        }
        this.createdAt = news.getCreatedAt();
        this.updatedAt = news.getUpdatedAt();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContext() {
        return context;
    }

    public void setContext(String context) {
        this.context = context;
    }

    public OffsetDateTime getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(OffsetDateTime publishedAt) {
        this.publishedAt = publishedAt;
    }

    public String getCanonicalUrl() {
        return canonicalUrl;
    }

    public void setCanonicalUrl(String canonicalUrl) {
        this.canonicalUrl = canonicalUrl;
    }

    public String getExternalId() {
        return externalId;
    }

    public void setExternalId(String externalId) {
        this.externalId = externalId;
    }

    public NewsStatus getStatus() {
        return status;
    }

    public void setStatus(NewsStatus status) {
        this.status = status;
    }

    public SourceSummary getSource() {
        return source;
    }

    public void setSource(SourceSummary source) {
        this.source = source;
    }

    public List<CategorySummary> getCategories() {
        return categories;
    }

    public void setCategories(List<CategorySummary> categories) {
        this.categories = categories;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public static class SourceSummary implements Serializable {
        @Serial
        private static final long serialVersionUID = 1L;

        private Long id;
        private String name;
        private String url;

        public SourceSummary() {
        }

        public SourceSummary(Source source) {
            this.id = source.getId();
            this.name = source.getName();
            this.url = source.getSourceUrl();
        }

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getUrl() {
            return url;
        }

        public void setUrl(String url) {
            this.url = url;
        }
    }

    public static class CategorySummary implements Serializable {
        @Serial
        private static final long serialVersionUID = 1L;

        private Long id;
        private String name;

        public CategorySummary() {
        }

        public CategorySummary(Category category) {
            this.id = category.getId();
            this.name = category.getName();
        }

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }
    }
}
