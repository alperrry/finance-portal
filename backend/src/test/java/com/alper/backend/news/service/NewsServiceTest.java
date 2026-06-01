package com.alper.backend.news.service;

import com.alper.backend.common.exception.ConflictException;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.news.model.Category;
import com.alper.backend.news.model.News;
import com.alper.backend.news.model.NewsStatus;
import com.alper.backend.news.model.Source;
import com.alper.backend.news.repository.CategoryRepository;
import com.alper.backend.news.repository.NewsRepository;
import com.alper.backend.news.repository.SourceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("NewsService Testleri")
class NewsServiceTest {

    @Mock private NewsRepository newsRepository;
    @Mock private SourceRepository sourceRepository;
    @Mock private CategoryRepository categoryRepository;

    private NewsService service;

    private final Pageable pageable = PageRequest.of(0, 10);

    @BeforeEach
    void setUp() {
        service = new NewsService(newsRepository, sourceRepository, categoryRepository);
    }

    private Source buildSource(Long id) {
        return Source.builder().id(id).name("Test Kaynak").sourceUrl("http://test.com/rss").build();
    }

    private News buildNews(Long id, NewsStatus status) {
        News news = new News();
        news.setId(id);
        news.setTitle("Test Haber");
        news.setCanonicalUrl("http://test.com/news/" + id);
        news.setStatus(status);
        news.setSource(buildSource(1L));
        return news;
    }

    @Nested
    @DisplayName("Haber Listeleme")
    class GetAllNews {

        @Test
        @DisplayName("Kategori filtresi olmadan yayımlanan haberler döner")
        void getAllNews_withoutCategory_returnsPublished() {
            when(newsRepository.findByStatus(eq(NewsStatus.published), eq(pageable)))
                    .thenReturn(new PageImpl<>(List.of(buildNews(1L, NewsStatus.published)), pageable, 1));

            Page<News> result = service.getAllNews(pageable, null);

            assertThat(result.getContent()).hasSize(1);
            verify(newsRepository).findByStatus(NewsStatus.published, pageable);
        }

        @Test
        @DisplayName("Kategori ID ile filtreli haberler döner")
        void getAllNews_withCategoryId_callsFilteredQuery() {
            when(newsRepository.findByCategoryIdAndStatus(eq(5L), eq(NewsStatus.published), eq(pageable)))
                    .thenReturn(new PageImpl<>(List.of(), pageable, 0));

            service.getAllNews(pageable, 5L);

            verify(newsRepository).findByCategoryIdAndStatus(5L, NewsStatus.published, pageable);
        }
    }

    @Nested
    @DisplayName("Haber Detay")
    class GetNewsById {

        @Test
        @DisplayName("Mevcut haber ID ile döner")
        void getNewsById_returnsNews() {
            News news = buildNews(1L, NewsStatus.published);
            when(newsRepository.findById(1L)).thenReturn(Optional.of(news));

            News result = service.getNewsById(1L);

            assertThat(result.getId()).isEqualTo(1L);
        }

        @Test
        @DisplayName("Bulunamayan haber NotFoundException fırlatır")
        void getNewsById_whenNotFound_throwsNotFoundException() {
            when(newsRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.getNewsById(99L))
                    .isInstanceOf(NotFoundException.class);
        }
    }

    @Nested
    @DisplayName("Haber Oluşturma")
    class CreateNews {

        @Test
        @DisplayName("Tekrar eden canonical URL → ConflictException")
        void createNews_whenCanonicalUrlDuplicate_throwsConflict() {
            when(newsRepository.existsByCanonicalUrl("http://dup.com")).thenReturn(true);

            assertThatThrownBy(() -> service.createNews(
                    "Title", "Content", OffsetDateTime.now(),
                    "http://dup.com", "ext-1", 1L, Set.of()))
                    .isInstanceOf(ConflictException.class);
        }

        @Test
        @DisplayName("Kaynak bulunamazsa NotFoundException fırlatılır")
        void createNews_whenSourceNotFound_throwsNotFoundException() {
            when(newsRepository.existsByCanonicalUrl(any())).thenReturn(false);
            when(sourceRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.createNews(
                    "Title", "Content", OffsetDateTime.now(),
                    "http://new.com", "ext-1", 99L, Set.of()))
                    .isInstanceOf(NotFoundException.class);
        }

        @Test
        @DisplayName("Aynı kaynakta tekrar eden externalId → ConflictException")
        void createNews_whenExternalIdDuplicate_throwsConflict() {
            Source source = buildSource(1L);
            when(newsRepository.existsByCanonicalUrl(any())).thenReturn(false);
            when(sourceRepository.findById(1L)).thenReturn(Optional.of(source));
            when(newsRepository.findBySourceIdAndExternalId(1L, "dup-ext"))
                    .thenReturn(Optional.of(buildNews(5L, NewsStatus.published)));

            assertThatThrownBy(() -> service.createNews(
                    "Title", "Content", OffsetDateTime.now(),
                    "http://unique.com", "dup-ext", 1L, Set.of()))
                    .isInstanceOf(ConflictException.class);
        }

        @Test
        @DisplayName("Geçerli istek ile haber kaydedilir ve döner")
        void createNews_validRequest_savesAndReturns() {
            Source source = buildSource(1L);
            News saved = buildNews(10L, NewsStatus.published);

            when(newsRepository.existsByCanonicalUrl("http://new.com")).thenReturn(false);
            when(sourceRepository.findById(1L)).thenReturn(Optional.of(source));
            when(newsRepository.findBySourceIdAndExternalId(1L, "ext-1")).thenReturn(Optional.empty());
            when(newsRepository.save(any())).thenReturn(saved);

            News result = service.createNews(
                    "Title", "Content", OffsetDateTime.now(),
                    "http://new.com", "ext-1", 1L, Set.of());

            assertThat(result.getId()).isEqualTo(10L);
            verify(newsRepository).save(any());
        }

        @Test
        @DisplayName("Kategori ID'leri ile haber oluşturulduğunda kategoriler atanır")
        void createNews_withCategories_savesWithCategories() {
            Source source = buildSource(1L);
            Category cat = Category.builder().id(2L).name("Ekonomi").build();
            News saved = buildNews(10L, NewsStatus.published);

            when(newsRepository.existsByCanonicalUrl(any())).thenReturn(false);
            when(sourceRepository.findById(1L)).thenReturn(Optional.of(source));
            when(newsRepository.findBySourceIdAndExternalId(any(), any())).thenReturn(Optional.empty());
            when(categoryRepository.findById(2L)).thenReturn(Optional.of(cat));
            when(newsRepository.save(any())).thenReturn(saved);

            service.createNews("Title", "Content", OffsetDateTime.now(),
                    "http://cat.com", "ext-cat", 1L, Set.of(2L));

            verify(categoryRepository).findById(2L);
            verify(newsRepository).save(any());
        }
    }

    @Nested
    @DisplayName("Durum Güncellemesi")
    class UpdateStatus {

        @Test
        @DisplayName("updateStatus ile haberin durumu değişir")
        void updateStatus_changesNewsStatus() {
            News news = buildNews(1L, NewsStatus.published);
            when(newsRepository.findById(1L)).thenReturn(Optional.of(news));
            when(newsRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            News result = service.updateStatus(1L, NewsStatus.archived);

            assertThat(result.getStatus()).isEqualTo(NewsStatus.archived);
        }
    }

    @Nested
    @DisplayName("Haber Silme")
    class DeleteNews {

        @Test
        @DisplayName("Mevcut haber silinir")
        void deleteNews_deletesNews() {
            News news = buildNews(1L, NewsStatus.published);
            when(newsRepository.findById(1L)).thenReturn(Optional.of(news));

            service.deleteNews(1L);

            verify(newsRepository).delete(news);
        }
    }
}
