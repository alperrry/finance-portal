package com.alper.backend.news.dto;

import com.alper.backend.news.model.Source;

import java.time.OffsetDateTime;

public class SourceResponse {

    private Long id;
    private String name;
    private String sourceUrl;
    private boolean isActive;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public SourceResponse() {}

    public SourceResponse(Source source) {
        this.id = source.getId();
        this.name = source.getName();
        this.sourceUrl = source.getSourceUrl();
        this.isActive = source.isActive();
        this.createdAt = source.getCreatedAt();
        this.updatedAt = source.getUpdatedAt();
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

    public String getSourceUrl() {
        return sourceUrl;
    }

    public void setSourceUrl(String sourceUrl) {
        this.sourceUrl = sourceUrl;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
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
