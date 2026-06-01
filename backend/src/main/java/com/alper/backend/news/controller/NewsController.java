package com.alper.backend.news.controller;

import com.alper.backend.common.exception.BadRequestException;
import com.alper.backend.news.dto.GoogleNewsRssItemResponse;
import com.alper.backend.news.dto.NewsRequest;
import com.alper.backend.news.dto.NewsPageCacheEntry;
import com.alper.backend.news.dto.NewsResponse;
import com.alper.backend.news.model.News;
import com.alper.backend.news.model.NewsStatus;
import com.alper.backend.news.service.GoogleNewsRssService;
import com.alper.backend.news.service.NewsService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


import java.util.List;
import java.util.Set;

/**
 * Haber listeleme, kategori filtreleme ve detay uç noktaları.
 *
 * <p>Read-only; veriyi {@link NewsService} üzerinden döner. İçeriği
 * {@code RssFeedService}, {@code GoogleNewsRssService} ve {@code NewsApiService}
 * üzerinden çekilir ve {@code AiCategorizerService} ile kategorize edilir.</p>
 */
@RestController
@RequestMapping("/api/news")
public class NewsController {

    private final NewsService newsService;
    private final GoogleNewsRssService googleNewsRssService;
    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
        "publishedAt",
        "createdAt",
        "updatedAt",
        "title",
        "id"
    );

    public NewsController(NewsService newsService, GoogleNewsRssService googleNewsRssService) {
        this.newsService = newsService;
        this.googleNewsRssService = googleNewsRssService;
    }

    @GetMapping
    public ResponseEntity<Page<NewsResponse>> getAllNews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") Sort.Direction direction,
            @RequestParam(required = false) Long categoryId
    ) {
        if (page < 0) {
            throw new BadRequestException("Page must be greater than or equal to 0");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new BadRequestException("Size must be between 1 and " + MAX_PAGE_SIZE);
        }
        if (categoryId != null && categoryId <= 0) {
            throw new BadRequestException("Category id must be greater than 0");
        }

        String safeSortBy = ALLOWED_SORT_FIELDS.contains(sortBy) ? sortBy : "createdAt";
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, safeSortBy));
        NewsPageCacheEntry cachedPage = newsService.getNewsResponses(pageable, categoryId);
        Page<NewsResponse> response = new PageImpl<>(cachedPage.getContent(), pageable, cachedPage.getTotalElements());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/google-rss/search")
    public ResponseEntity<List<GoogleNewsRssItemResponse>> getGoogleRssNews(
            @RequestParam("q") String query,
            @RequestParam(defaultValue = "tr") String hl,
            @RequestParam(defaultValue = "TR") String gl,
            @RequestParam(defaultValue = "TR:tr") String ceid,
            @RequestParam(defaultValue = "8") int limit
    ) {
        if (query == null || query.isBlank()) {
            throw new BadRequestException("Query must not be blank");
        }
        if (limit < 1 || limit > 20) {
            throw new BadRequestException("Limit must be between 1 and 20");
        }

        List<GoogleNewsRssItemResponse> items = googleNewsRssService.search(query.trim(), hl, gl, ceid, limit);
        return ResponseEntity.ok(items);
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
