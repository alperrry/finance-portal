package com.alper.backend.news.service;

import com.alper.backend.common.exception.ConflictException;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.news.dto.NewsPageCacheEntry;
import com.alper.backend.news.dto.NewsResponse;
import com.alper.backend.news.model.Category;
import com.alper.backend.news.model.News;
import com.alper.backend.news.model.NewsStatus;
import com.alper.backend.news.model.Source;
import com.alper.backend.news.repository.CategoryRepository;
import com.alper.backend.news.repository.NewsRepository;
import com.alper.backend.news.repository.SourceRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

@Service
@Transactional
public class NewsService {

    private static final String NEWS_LIST_CACHE = "newsListV3";

    private final NewsRepository newsRepository;
    private final SourceRepository sourceRepository;
    private final CategoryRepository categoryRepository;

    public NewsService(NewsRepository newsRepository,
                      SourceRepository sourceRepository,
                      CategoryRepository categoryRepository) {
        this.newsRepository = newsRepository;
        this.sourceRepository = sourceRepository;
        this.categoryRepository = categoryRepository;
    }

    public Page<News> getAllNews(Pageable pageable, Long categoryId) {
        if (categoryId != null) {
            return newsRepository.findByCategoryIdAndStatus(categoryId, NewsStatus.published, pageable);
        }
        return newsRepository.findByStatus(NewsStatus.published, pageable);
    }

    public News getNewsById(Long id) {
        return newsRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("News not found with id: " + id));
    }

    @Transactional(readOnly = true)
    @Cacheable(
        value = NEWS_LIST_CACHE,
        key = "#pageable.pageNumber + ':' + #pageable.pageSize + ':' + #pageable.sort.toString() + ':' + (#categoryId == null ? 'all' : #categoryId)"
    )
    public NewsPageCacheEntry getNewsResponses(Pageable pageable, Long categoryId) {
        Page<NewsResponse> page = getAllNews(pageable, categoryId).map(NewsResponse::new);
        return NewsPageCacheEntry.from(page);
    }

    @CacheEvict(value = NEWS_LIST_CACHE, allEntries = true)
    public News createNews(String title, String context, OffsetDateTime publishedAt,
                          String canonicalUrl, String externalId, Long sourceId,
                          Set<Long> categoryIds) {

        if (newsRepository.existsByCanonicalUrl(canonicalUrl)) {
            throw new ConflictException("News already exists with canonical URL: " + canonicalUrl);
        }

        Source source = resolveSource(sourceId);
        String normalizedExternalId = normalizeExternalId(externalId);
        ensureExternalIdUnique(source.getId(), normalizedExternalId, null);

        News news = new News();
        news.setTitle(title);
        news.setContext(context);
        news.setPublishedAt(publishedAt);
        news.setCanonicalUrl(canonicalUrl);
        news.setExternalId(normalizedExternalId);
        news.setStatus(NewsStatus.published);
        news.setSource(source);

        if (categoryIds != null && !categoryIds.isEmpty()) {
            news.setCategories(resolveCategories(categoryIds));
        }

        return newsRepository.save(news);
    }

    @CacheEvict(value = NEWS_LIST_CACHE, allEntries = true)
    public News updateNews(Long id, String title, String context, OffsetDateTime publishedAt,
                          String canonicalUrl, String externalId, Long sourceId,
                          Set<Long> categoryIds, NewsStatus status) {

        News news = getNewsById(id);

        if (title != null) {
            news.setTitle(title);
        }

        if (context != null) {
            news.setContext(context);
        }

        if (publishedAt != null) {
            news.setPublishedAt(publishedAt);
        }

        if (canonicalUrl != null && !canonicalUrl.equals(news.getCanonicalUrl())) {
            if (newsRepository.existsByCanonicalUrl(canonicalUrl)) {
                throw new ConflictException("News already exists with canonical URL: " + canonicalUrl);
            }
            news.setCanonicalUrl(canonicalUrl);
        }

        Source targetSource = news.getSource();
        if (sourceId != null) {
            targetSource = resolveSource(sourceId);
            news.setSource(targetSource);
        }
        String targetExternalId = externalId != null ? normalizeExternalId(externalId) : news.getExternalId();
        ensureExternalIdUnique(targetSource.getId(), targetExternalId, news.getId());
        if (externalId != null) {
            news.setExternalId(targetExternalId);
        }

        if (categoryIds != null) {
            news.setCategories(resolveCategories(categoryIds));
        }

        if (status != null) {
            news.setStatus(status);
        }

        return newsRepository.save(news);
    }

    @CacheEvict(value = NEWS_LIST_CACHE, allEntries = true)
    public void deleteNews(Long id) {
        News news = getNewsById(id);
        newsRepository.delete(news);
    }

    @CacheEvict(value = NEWS_LIST_CACHE, allEntries = true)
    public News updateStatus(Long id, NewsStatus status) {
        News news = getNewsById(id);
        news.setStatus(status);
        return newsRepository.save(news);
    }

    @CacheEvict(value = NEWS_LIST_CACHE, allEntries = true)
    public News archiveNews(Long id) {
        return updateStatus(id, NewsStatus.archived);
    }

    @CacheEvict(value = NEWS_LIST_CACHE, allEntries = true)
    public News removeNews(Long id) {
        return updateStatus(id, NewsStatus.removed);
    }

    @CacheEvict(value = NEWS_LIST_CACHE, allEntries = true)
    public News publishNews(Long id) {
        return updateStatus(id, NewsStatus.published);
    }

    private Set<Category> resolveCategories(Set<Long> categoryIds) {
        Set<Category> categories = new HashSet<>();
        for (Long categoryId : categoryIds) {
            Category category = categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new NotFoundException("Category not found with id: " + categoryId));
            categories.add(category);
        }
        return categories;
    }

    private Source resolveSource(Long sourceId) {
        return sourceRepository.findById(sourceId)
            .orElseThrow(() -> new NotFoundException("Source not found with id: " + sourceId));
    }

    private String normalizeExternalId(String externalId) {
        if (externalId == null) {
            return null;
        }
        String trimmed = externalId.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void ensureExternalIdUnique(Long sourceId, String externalId, Long currentNewsId) {
        if (sourceId == null || externalId == null) {
            return;
        }

        Optional<News> existing = newsRepository.findBySourceIdAndExternalId(sourceId, externalId);
        if (existing.isPresent() && (currentNewsId == null || !existing.get().getId().equals(currentNewsId))) {
            throw new ConflictException(
                "News already exists for source " + sourceId + " with external ID: " + externalId
            );
        }
    }
}
