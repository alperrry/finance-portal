package com.alper.backend.news.dto;

import org.springframework.data.domain.Page;

import java.io.Serial;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class NewsPageCacheEntry implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private List<NewsResponse> content = new ArrayList<>();
    private long totalElements;

    public NewsPageCacheEntry() {}

    public NewsPageCacheEntry(List<NewsResponse> content, long totalElements) {
        this.content = content == null ? new ArrayList<>() : content;
        this.totalElements = totalElements;
    }

    public static NewsPageCacheEntry from(Page<NewsResponse> page) {
        return new NewsPageCacheEntry(page.getContent(), page.getTotalElements());
    }

    public List<NewsResponse> getContent() {
        return content;
    }

    public void setContent(List<NewsResponse> content) {
        this.content = content;
    }

    public long getTotalElements() {
        return totalElements;
    }

    public void setTotalElements(long totalElements) {
        this.totalElements = totalElements;
    }
}
