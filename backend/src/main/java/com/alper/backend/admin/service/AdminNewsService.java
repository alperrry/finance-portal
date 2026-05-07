package com.alper.backend.admin.service;

import com.alper.backend.admin.audit.AdminAudited;
import com.alper.backend.admin.dto.AdminNewsCategoryRequest;
import com.alper.backend.admin.dto.AdminNewsStatusRequest;
import com.alper.backend.admin.dto.FetchResponse;
import com.alper.backend.admin.dto.SourceRequest;
import com.alper.backend.admin.dto.SourceResponse;
import com.alper.backend.admin.model.AuditAction;
import com.alper.backend.common.exception.ErrorCode;
import com.alper.backend.common.exception.ConflictException;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.news.dto.NewsResponse;
import com.alper.backend.news.model.Category;
import com.alper.backend.news.model.News;
import com.alper.backend.news.model.NewsStatus;
import com.alper.backend.news.model.Source;
import com.alper.backend.news.repository.CategoryRepository;
import com.alper.backend.news.repository.NewsRepository;
import com.alper.backend.news.repository.SourceRepository;
import com.alper.backend.news.scheduler.NewsFetcherScheduler;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
@RequiredArgsConstructor
@Log4j2
public class AdminNewsService {

    private static final String NEWS_LIST_CACHE = "newsListV3";

    private final SourceRepository sourceRepository;
    private final NewsRepository newsRepository;
    private final CategoryRepository categoryRepository;
    private final ObjectProvider<NewsFetcherScheduler> newsFetcherSchedulerProvider;

    private final AtomicBoolean allFetchRunning = new AtomicBoolean(false);
    private final Map<Long, AtomicBoolean> sourceFetchFlags = new ConcurrentHashMap<>();

    // =========================================================================
    // Kaynak Yönetimi (CRUD)
    // =========================================================================

    @Transactional(readOnly = true)
    public List<SourceResponse> listSources() {
        return sourceRepository.findAll().stream()
                .map(this::toSourceResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public SourceResponse getSource(Long id) {
        Source source = sourceRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(ErrorCode.NOT_FOUND, "Kaynak bulunamadı: " + id));
        return toSourceResponse(source);
    }

    @Transactional
    @AdminAudited(action = AuditAction.SOURCE_CREATED, targetType = "source")
    public SourceResponse createSource(SourceRequest request) {
        if (sourceRepository.existsBySourceUrl(request.sourceUrl())) {
            throw new ConflictException(ErrorCode.CONFLICT, "Bu URL ile kaynak zaten mevcut: " + request.sourceUrl());
        }
        Source source = new Source();
        source.setName(request.name());
        source.setSourceUrl(request.sourceUrl());
        Source saved = sourceRepository.save(source);
        log.info("RSS kaynağı oluşturuldu | id={}, url={}", saved.getId(), saved.getSourceUrl());
        return toSourceResponse(saved);
    }

    @Transactional
    @AdminAudited(action = AuditAction.SOURCE_UPDATED, targetType = "source")
    public SourceResponse updateSource(Long id, SourceRequest request) {
        Source source = sourceRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(ErrorCode.NOT_FOUND, "Kaynak bulunamadı: " + id));
        boolean urlChanged = !source.getSourceUrl().equals(request.sourceUrl());
        if (urlChanged && sourceRepository.existsBySourceUrl(request.sourceUrl())) {
            throw new ConflictException(ErrorCode.CONFLICT, "Bu URL ile kaynak zaten mevcut: " + request.sourceUrl());
        }
        source.setName(request.name());
        source.setSourceUrl(request.sourceUrl());
        Source saved = sourceRepository.save(source);
        log.info("RSS kaynağı güncellendi | id={}", saved.getId());
        return toSourceResponse(saved);
    }

    @Transactional
    @AdminAudited(action = AuditAction.SOURCE_DELETED, targetType = "source")
    public void deleteSource(Long id) {
        Source source = sourceRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(ErrorCode.NOT_FOUND, "Kaynak bulunamadı: " + id));
        sourceRepository.delete(source);
        log.info("RSS kaynağı silindi | id={}", id);
    }

    // =========================================================================
    // Haber Yönetimi
    // =========================================================================

    @Transactional(readOnly = true)
    public Page<NewsResponse> listNews(String search, NewsStatus status, Long sourceId, Long categoryId, Pageable pageable) {
        String normalizedSearch = search == null || search.isBlank() ? null : search.trim().toLowerCase();
        return newsRepository.searchAdminNews(normalizedSearch, status, sourceId, categoryId, pageable)
                .map(NewsResponse::new);
    }

    @Transactional(readOnly = true)
    public NewsResponse getNews(Long id) {
        News news = resolveNews(id);
        return new NewsResponse(news);
    }

    @Transactional
    @CacheEvict(value = NEWS_LIST_CACHE, allEntries = true)
    @AdminAudited(action = AuditAction.NEWS_STATUS_CHANGED, targetType = "news")
    public NewsResponse updateNewsStatus(Long id, AdminNewsStatusRequest request) {
        News news = resolveNews(id);
        news.setStatus(request.status());
        News saved = newsRepository.save(news);
        log.info("Haber durumu güncellendi | id={}, status={}", id, request.status());
        return new NewsResponse(saved);
    }

    @Transactional
    @CacheEvict(value = NEWS_LIST_CACHE, allEntries = true)
    @AdminAudited(action = AuditAction.NEWS_CATEGORY_OVERRIDDEN, targetType = "news")
    public NewsResponse updateNewsCategories(Long id, AdminNewsCategoryRequest request) {
        News news = resolveNews(id);
        Set<Category> categories = new HashSet<>();
        for (Long categoryId : request.categoryIds()) {
            Category category = categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new NotFoundException(ErrorCode.NOT_FOUND, "Kategori bulunamadı: " + categoryId));
            categories.add(category);
        }
        news.setCategories(categories);
        News saved = newsRepository.save(news);
        log.info("Haber kategorileri güncellendi | id={}, categories={}", id, request.categoryIds());
        return new NewsResponse(saved);
    }

    // =========================================================================
    // Manuel Haber Çekimi
    // =========================================================================

    @AdminAudited(action = AuditAction.NEWS_FETCH_TRIGGERED, targetType = "news")
    public FetchResponse triggerFetchAll() {
        if (!allFetchRunning.compareAndSet(false, true)) {
            log.warn("Haber çekimi zaten çalışıyor: tüm kaynaklar");
            return FetchResponse.alreadyRunning("all");
        }
        runFetchAllAsync(allFetchRunning);
        return FetchResponse.triggered("all");
    }

    @AdminAudited(action = AuditAction.NEWS_FETCH_TRIGGERED, targetType = "news")
    public FetchResponse triggerFetchBySource(Long sourceId) {
        if (!sourceRepository.existsById(sourceId)) {
            throw new NotFoundException(ErrorCode.NOT_FOUND, "Kaynak bulunamadı: " + sourceId);
        }
        AtomicBoolean flag = sourceFetchFlags.computeIfAbsent(sourceId, k -> new AtomicBoolean(false));
        if (!flag.compareAndSet(false, true)) {
            log.warn("Haber çekimi zaten çalışıyor | sourceId={}", sourceId);
            return FetchResponse.alreadyRunning("source-" + sourceId);
        }
        runFetchBySourceAsync(sourceId, flag);
        return FetchResponse.triggered("source-" + sourceId);
    }

    @Async
    public void runFetchAllAsync(AtomicBoolean flag) {
        try {
            log.info("Manuel haber çekimi başladı: tüm kaynaklar");
            NewsFetcherScheduler newsFetcherScheduler = newsFetcherSchedulerProvider.getIfAvailable();
            if (newsFetcherScheduler == null) {
                log.warn("Manuel haber çekimi atlandı: NewsFetcherScheduler aktif değil");
                return;
            }
            newsFetcherScheduler.fetchAllSources();
            log.info("Manuel haber çekimi tamamlandı: tüm kaynaklar");
        } catch (Exception e) {
            log.error("Manuel haber çekimi hatası: all → {}", e.getMessage(), e);
        } finally {
            flag.set(false);
        }
    }

    @Async
    public void runFetchBySourceAsync(Long sourceId, AtomicBoolean flag) {
        try {
            log.info("Manuel haber çekimi başladı | sourceId={}", sourceId);
            NewsFetcherScheduler newsFetcherScheduler = newsFetcherSchedulerProvider.getIfAvailable();
            if (newsFetcherScheduler == null) {
                log.warn("Manuel haber çekimi atlandı: NewsFetcherScheduler aktif değil | sourceId={}", sourceId);
                return;
            }
            newsFetcherScheduler.fetchForSource(sourceId);
            log.info("Manuel haber çekimi tamamlandı | sourceId={}", sourceId);
        } catch (Exception e) {
            log.error("Manuel haber çekimi hatası | sourceId={} → {}", sourceId, e.getMessage(), e);
        } finally {
            flag.set(false);
        }
    }

    // =========================================================================
    // Yardımcı metodlar
    // =========================================================================

    private News resolveNews(Long id) {
        return newsRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(ErrorCode.NOT_FOUND, "Haber bulunamadı: " + id));
    }

    private SourceResponse toSourceResponse(Source source) {
        return SourceResponse.builder()
                .id(source.getId())
                .name(source.getName())
                .sourceUrl(source.getSourceUrl())
                .active(source.isActive())
                .createdAt(source.getCreatedAt() != null ? source.getCreatedAt().toInstant() : null)
                .updatedAt(source.getUpdatedAt() != null ? source.getUpdatedAt().toInstant() : null)
                .build();
    }
}
