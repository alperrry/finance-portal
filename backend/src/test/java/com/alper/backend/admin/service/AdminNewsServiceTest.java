package com.alper.backend.admin.service;

import com.alper.backend.admin.dto.AdminNewsCategoryRequest;
import com.alper.backend.admin.dto.AdminNewsStatusRequest;
import com.alper.backend.admin.dto.FetchResponse;
import com.alper.backend.admin.dto.SourceRequest;
import com.alper.backend.admin.dto.SourceResponse;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminNewsService Testleri")
class AdminNewsServiceTest {

    @Mock private SourceRepository sourceRepository;
    @Mock private NewsRepository newsRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private ObjectProvider<NewsFetcherScheduler> newsFetcherSchedulerProvider;

    private AdminNewsService service;

    @BeforeEach
    void setUp() {
        service = new AdminNewsService(
                sourceRepository,
                newsRepository,
                categoryRepository,
                newsFetcherSchedulerProvider
        );
    }

    private Source buildSource(Long id, String url) {
        return Source.builder().id(id).name("Test Kaynak").sourceUrl(url).isActive(true).build();
    }

    private News buildNews(Long id, NewsStatus status) {
        return News.builder()
                .id(id)
                .title("Test Haber")
                .status(status)
                .categories(new HashSet<>())
                .build();
    }

    @Nested
    @DisplayName("Kaynak Yönetimi")
    class SourceManagement {

        @Test
        @DisplayName("createSource — URL benzersiz ise kaynak kaydedilir")
        void createSource_whenUrlUnique_saves() {
            SourceRequest req = new SourceRequest("Test", "http://test.com/rss");
            Source saved = buildSource(1L, "http://test.com/rss");

            when(sourceRepository.existsBySourceUrl("http://test.com/rss")).thenReturn(false);
            when(sourceRepository.save(any(Source.class))).thenReturn(saved);

            SourceResponse result = service.createSource(req);

            assertThat(result.id()).isEqualTo(1L);
            assertThat(result.sourceUrl()).isEqualTo("http://test.com/rss");
        }

        @Test
        @DisplayName("createSource — URL zaten varsa ConflictException fırlar")
        void createSource_whenUrlDuplicate_throwsConflict() {
            SourceRequest req = new SourceRequest("Test", "http://test.com/rss");
            when(sourceRepository.existsBySourceUrl("http://test.com/rss")).thenReturn(true);

            assertThatThrownBy(() -> service.createSource(req))
                    .isInstanceOf(ConflictException.class)
                    .hasMessageContaining("http://test.com/rss");
        }

        @Test
        @DisplayName("updateSource — alanlar güncellenir")
        void updateSource_updatesFields() {
            Source existing = buildSource(1L, "http://eski.com/rss");
            SourceRequest req = new SourceRequest("Yeni İsim", "http://yeni.com/rss");
            Source saved = buildSource(1L, "http://yeni.com/rss");
            saved.setName("Yeni İsim");

            when(sourceRepository.findById(1L)).thenReturn(Optional.of(existing));
            when(sourceRepository.existsBySourceUrl("http://yeni.com/rss")).thenReturn(false);
            when(sourceRepository.save(any(Source.class))).thenReturn(saved);

            SourceResponse result = service.updateSource(1L, req);

            assertThat(result.sourceUrl()).isEqualTo("http://yeni.com/rss");
        }

        @Test
        @DisplayName("deleteSource — var olan kaynak silinir")
        void deleteSource_deletesById() {
            Source existing = buildSource(2L, "http://test.com/rss");
            when(sourceRepository.findById(2L)).thenReturn(Optional.of(existing));

            service.deleteSource(2L);

            verify(sourceRepository).delete(existing);
        }

        @Test
        @DisplayName("deleteSource — bulunamazsa NotFoundException fırlar")
        void deleteSource_whenNotFound_throwsNotFound() {
            when(sourceRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.deleteSource(99L))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessageContaining("99");
        }
    }

    @Nested
    @DisplayName("Haber Yönetimi")
    class NewsManagement {

        @Test
        @DisplayName("updateNewsStatus — durum güncellenir ve döner")
        void updateNewsStatus_changesStatus() {
            News existing = buildNews(1L, NewsStatus.published);
            News saved = buildNews(1L, NewsStatus.published);
            AdminNewsStatusRequest req = new AdminNewsStatusRequest(NewsStatus.published);

            when(newsRepository.findById(1L)).thenReturn(Optional.of(existing));
            when(newsRepository.save(any(News.class))).thenReturn(saved);

            NewsResponse result = service.updateNewsStatus(1L, req);

            assertThat(result.getStatus()).isEqualTo(NewsStatus.published);
        }

        @Test
        @DisplayName("updateNewsStatus — haber bulunamazsa NotFoundException fırlar")
        void updateNewsStatus_whenNotFound_throwsNotFound() {
            when(newsRepository.findById(99L)).thenReturn(Optional.empty());
            AdminNewsStatusRequest req = new AdminNewsStatusRequest(NewsStatus.published);

            assertThatThrownBy(() -> service.updateNewsStatus(99L, req))
                    .isInstanceOf(NotFoundException.class);
        }

        @Test
        @DisplayName("updateNewsCategories — kategoriler değiştirilir")
        void updateNewsCategories_replacesCategories() {
            News existing = buildNews(1L, NewsStatus.published);
            Category cat = Category.builder().id(5L).name("Ekonomi").build();
            AdminNewsCategoryRequest req = new AdminNewsCategoryRequest(Set.of(5L));
            News saved = buildNews(1L, NewsStatus.published);
            saved.setCategories(Set.of(cat));

            when(newsRepository.findById(1L)).thenReturn(Optional.of(existing));
            when(categoryRepository.findById(5L)).thenReturn(Optional.of(cat));
            when(newsRepository.save(any(News.class))).thenReturn(saved);

            NewsResponse result = service.updateNewsCategories(1L, req);

            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("updateNewsCategories — kategori bulunamazsa NotFoundException fırlar")
        void updateNewsCategories_whenCategoryNotFound_throwsNotFound() {
            News existing = buildNews(1L, NewsStatus.published);
            AdminNewsCategoryRequest req = new AdminNewsCategoryRequest(Set.of(999L));

            when(newsRepository.findById(1L)).thenReturn(Optional.of(existing));
            when(categoryRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.updateNewsCategories(1L, req))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessageContaining("999");
        }
    }

    @Nested
    @DisplayName("Manuel Haber Çekimi")
    class ManualFetch {

        @Test
        @DisplayName("triggerFetchAll — idle iken TRIGGERED döner")
        void triggerFetchAll_whenIdle_startsFetch() {
            FetchResponse result = service.triggerFetchAll();

            assertThat(result.status()).isEqualTo("TRIGGERED");
            assertThat(result.source()).isEqualTo("all");
        }

        @Test
        @DisplayName("triggerFetchAll — bayrak zaten true iken ALREADY_RUNNING döner")
        void triggerFetchAll_whenRunning_returnsAlreadyRunning() throws Exception {
            java.lang.reflect.Field field = AdminNewsService.class.getDeclaredField("allFetchRunning");
            field.setAccessible(true);
            ((java.util.concurrent.atomic.AtomicBoolean) field.get(service)).set(true);

            FetchResponse result = service.triggerFetchAll();

            assertThat(result.status()).isEqualTo("ALREADY_RUNNING");
        }

        @Test
        @DisplayName("triggerFetchBySource — kaynak bulunamazsa NotFoundException fırlar")
        void triggerFetchBySource_whenSourceNotFound_throwsNotFound() {
            when(sourceRepository.existsById(99L)).thenReturn(false);

            assertThatThrownBy(() -> service.triggerFetchBySource(99L))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessageContaining("99");
        }

        @Test
        @DisplayName("triggerFetchBySource — kaynak mevcutsa TRIGGERED döner")
        void triggerFetchBySource_whenSourceExists_returnsTriggered() {
            when(sourceRepository.existsById(1L)).thenReturn(true);

            FetchResponse result = service.triggerFetchBySource(1L);

            assertThat(result.status()).isEqualTo("TRIGGERED");
        }

        @Test
        @DisplayName("runFetchAllAsync — NewsFetcherScheduler yoksa sessizce döner")
        void runFetchAllAsync_whenSchedulerNull_skips() {
            when(newsFetcherSchedulerProvider.getIfAvailable()).thenReturn(null);
            java.util.concurrent.atomic.AtomicBoolean flag = new java.util.concurrent.atomic.AtomicBoolean(true);

            service.runFetchAllAsync(flag);

            assertThat(flag.get()).isFalse();
        }

        @Test
        @DisplayName("runFetchAllAsync — NewsFetcherScheduler varsa fetchAllSources çağrılır")
        void runFetchAllAsync_whenSchedulerAvailable_callsFetchAll() {
            NewsFetcherScheduler scheduler = mock(NewsFetcherScheduler.class);
            when(newsFetcherSchedulerProvider.getIfAvailable()).thenReturn(scheduler);
            java.util.concurrent.atomic.AtomicBoolean flag = new java.util.concurrent.atomic.AtomicBoolean(true);

            service.runFetchAllAsync(flag);

            verify(scheduler).fetchAllSources();
            assertThat(flag.get()).isFalse();
        }
    }
}
