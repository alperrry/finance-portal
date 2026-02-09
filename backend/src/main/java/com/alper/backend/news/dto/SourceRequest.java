package com.alper.backend.news.dto;

import jakarta.validation.constraints.NotBlank;

public class SourceRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Source URL is required")
    private String sourceUrl;

    private Boolean isActive;

    public SourceRequest() {}

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

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }
}
