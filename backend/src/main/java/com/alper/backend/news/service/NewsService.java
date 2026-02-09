package com.alper.backend.news.service;

import com.alper.backend.news.model.Category;
import com.alper.backend.news.model.News;
import com.alper.backend.news.model.NewsStatus;
import com.alper.backend.news.model.Source;
import com.alper.backend.news.repository.CategoryRepository;
import com.alper.backend.news.repository.NewsRepository;
import com.alper.backend.news.repository.SourceRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;

@Service
@Transactional
public class NewsService {

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

    public Page<News> getAllNews(Long sourceId, Long categoryId, NewsStatus status,
                                  OffsetDateTime startDate, OffsetDateTime endDate,
                                  Pageable pageable) {
        // Filter by multiple criteria
        if (sourceId != null && status != null) {
            return newsRepository.findBySourceIdAndStatus(sourceId, status, pageable);
        } else if (sourceId != null) {
            return newsRepository.findBySourceId(sourceId, pageable);
        } else if (categoryId != null && status != null) {
            return newsRepository.findByCategoryIdAndStatus(categoryId, status, pageable);
        } else if (categoryId != null) {
            return newsRepository.findByCategoryId(categoryId, pageable);
        } else if (status != null && startDate != null && endDate != null) {
            return newsRepository.findByStatusAndPublishedAtBetween(status, startDate, endDate, pageable);
        } else if (startDate != null && endDate != null) {
            return newsRepository.findByPublishedAtBetween(startDate, endDate, pageable);
        } else if (status != null) {
            return newsRepository.findByStatus(status, pageable);
        }

        return newsRepository.findAll(pageable);
    }

    public News getNewsById(Long id) {
        return newsRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("News not found with id: " + id));
    }

    public News createNews(String title, String context, OffsetDateTime publishedAt,
                          String canonicalUrl, String externalId, Long sourceId,
                          Set<Long> categoryIds) {

        if (newsRepository.existsByCanonicalUrl(canonicalUrl)) {
            throw new RuntimeException("News already exists with canonical URL: " + canonicalUrl);
        }

        Source source = sourceRepository.findById(sourceId)
                .orElseThrow(() -> new RuntimeException("Source not found with id: " + sourceId));

        News news = new News();
        news.setTitle(title);
        news.setContext(context);
        news.setPublishedAt(publishedAt);
        news.setCanonicalUrl(canonicalUrl);
        news.setExternalId(externalId);
        news.setStatus(NewsStatus.published);
        news.setSource(source);

        if (categoryIds != null && !categoryIds.isEmpty()) {
            Set<Category> categories = new HashSet<>();
            for (Long categoryId : categoryIds) {
                Category category = categoryRepository.findById(categoryId)
                        .orElseThrow(() -> new RuntimeException("Category not found with id: " + categoryId));
                categories.add(category);
            }
            news.setCategories(categories);
        }

        return newsRepository.save(news);
    }

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
                throw new RuntimeException("News already exists with canonical URL: " + canonicalUrl);
            }
            news.setCanonicalUrl(canonicalUrl);
        }

        if (externalId != null) {
            news.setExternalId(externalId);
        }

        if (sourceId != null) {
            Source source = sourceRepository.findById(sourceId)
                    .orElseThrow(() -> new RuntimeException("Source not found with id: " + sourceId));
            news.setSource(source);
        }

        if (categoryIds != null) {
            Set<Category> categories = new HashSet<>();
            for (Long categoryId : categoryIds) {
                Category category = categoryRepository.findById(categoryId)
                        .orElseThrow(() -> new RuntimeException("Category not found with id: " + categoryId));
                categories.add(category);
            }
            news.setCategories(categories);
        }

        if (status != null) {
            news.setStatus(status);
        }

        return newsRepository.save(news);
    }

    public void deleteNews(Long id) {
        News news = getNewsById(id);
        newsRepository.delete(news);
    }

    public News updateStatus(Long id, NewsStatus status) {
        News news = getNewsById(id);
        news.setStatus(status);
        return newsRepository.save(news);
    }

    public News archiveNews(Long id) {
        return updateStatus(id, NewsStatus.archived);
    }

    public News removeNews(Long id) {
        return updateStatus(id, NewsStatus.removed);
    }

    public News publishNews(Long id) {
        return updateStatus(id, NewsStatus.published);
    }
}
