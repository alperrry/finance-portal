package com.alper.backend.news.dto;

import java.time.OffsetDateTime;

/**
 * Google News RSS beslemesinden ayrıştırılan tek bir haber öğesini temsil eder.
 */
public class GoogleNewsRssItemResponse {

    private String title;
    private String description;
    private String link;
    private OffsetDateTime publishedAt;
    private String sourceName;
    private String sourceUrl;

    public GoogleNewsRssItemResponse() {}

    public GoogleNewsRssItemResponse(
            String title,
            String description,
            String link,
            OffsetDateTime publishedAt,
            String sourceName,
            String sourceUrl
    ) {
        this.title = title;
        this.description = description;
        this.link = link;
        this.publishedAt = publishedAt;
        this.sourceName = sourceName;
        this.sourceUrl = sourceUrl;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getLink() {
        return link;
    }

    public void setLink(String link) {
        this.link = link;
    }

    public OffsetDateTime getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(OffsetDateTime publishedAt) {
        this.publishedAt = publishedAt;
    }

    public String getSourceName() {
        return sourceName;
    }

    public void setSourceName(String sourceName) {
        this.sourceName = sourceName;
    }

    public String getSourceUrl() {
        return sourceUrl;
    }

    public void setSourceUrl(String sourceUrl) {
        this.sourceUrl = sourceUrl;
    }
}
