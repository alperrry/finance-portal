package com.alper.backend.news.dto;

import com.alper.backend.news.model.Category;
import com.alper.backend.news.model.News;
import com.alper.backend.news.model.NewsStatus;

import java.time.OffsetDateTime;
import java.util.Set;
import java.util.stream.Collectors;

public class NewsResponse {

    private Long id;
    private String title;
    private String context;
    private OffsetDateTime publishedAt;
    private String canonicalUrl;
    private String externalId;
    private NewsStatus status;
    private SourceResponse source;
    private Set<CategoryResponse> categories;
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
        this.source = news.getSource() != null ? new SourceResponse(news.getSource()) : null;
        this.categories = news.getCategories().stream()
                .map(CategoryResponse::new)
                .collect(Collectors.toSet());
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

    public SourceResponse getSource() {
        return source;
    }

    public void setSource(SourceResponse source) {
        this.source = source;
    }

    public Set<CategoryResponse> getCategories() {
        return categories;
    }

    public void setCategories(Set<CategoryResponse> categories) {
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
}
