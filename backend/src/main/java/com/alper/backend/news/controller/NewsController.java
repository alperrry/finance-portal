package com.alper.backend.news.controller;

import com.alper.backend.news.dto.NewsRequest;
import com.alper.backend.news.dto.NewsResponse;
import com.alper.backend.news.model.News;
import com.alper.backend.news.model.NewsStatus;
import com.alper.backend.news.service.NewsService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;

@RestController
@RequestMapping("/api/news")
public class NewsController {

    private final NewsService newsService;

    public NewsController(NewsService newsService) {
        this.newsService = newsService;
    }

    @GetMapping
    public ResponseEntity<Page<NewsResponse>> getAllNews(
            @RequestParam(required = false) Long sourceId,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) NewsStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "publishedAt") String sortBy,
            @RequestParam(defaultValue = "DESC") Sort.Direction direction
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        Page<News> newsPage = newsService.getAllNews(sourceId, categoryId, status, startDate, endDate, pageable);
        Page<NewsResponse> response = newsPage.map(NewsResponse::new);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<NewsResponse> getNewsById(@PathVariable Long id) {
        News news = newsService.getNewsById(id);
        return ResponseEntity.ok(new NewsResponse(news));
    }

    @PostMapping
    public ResponseEntity<NewsResponse> createNews(@Valid @RequestBody NewsRequest request) {
        News news = newsService.createNews(
                request.getTitle(),
                request.getContext(),
                request.getPublishedAt(),
                request.getCanonicalUrl(),
                request.getExternalId(),
                request.getSourceId(),
                request.getCategoryIds()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(new NewsResponse(news));
    }

    @PutMapping("/{id}")
    public ResponseEntity<NewsResponse> updateNews(
            @PathVariable Long id,
            @Valid @RequestBody NewsRequest request
    ) {
        News news = newsService.updateNews(
                id,
                request.getTitle(),
                request.getContext(),
                request.getPublishedAt(),
                request.getCanonicalUrl(),
                request.getExternalId(),
                request.getSourceId(),
                request.getCategoryIds(),
                request.getStatus()
        );
        return ResponseEntity.ok(new NewsResponse(news));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNews(@PathVariable Long id) {
        newsService.deleteNews(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<NewsResponse> updateStatus(
            @PathVariable Long id,
            @RequestParam NewsStatus status
    ) {
        News news = newsService.updateStatus(id, status);
        return ResponseEntity.ok(new NewsResponse(news));
    }

    @PatchMapping("/{id}/archive")
    public ResponseEntity<NewsResponse> archiveNews(@PathVariable Long id) {
        News news = newsService.archiveNews(id);
        return ResponseEntity.ok(new NewsResponse(news));
    }

    @PatchMapping("/{id}/remove")
    public ResponseEntity<NewsResponse> removeNews(@PathVariable Long id) {
        News news = newsService.removeNews(id);
        return ResponseEntity.ok(new NewsResponse(news));
    }

    @PatchMapping("/{id}/publish")
    public ResponseEntity<NewsResponse> publishNews(@PathVariable Long id) {
        News news = newsService.publishNews(id);
        return ResponseEntity.ok(new NewsResponse(news));
    }
}
