package com.alper.backend.news.service;

import com.alper.backend.news.model.Category;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AiCategorizerService Testleri")
class AiCategorizerServiceTest {

    @Mock private GroqApiService groqApiService;
    @Mock private CategoryService categoryService;

    private AiCategorizerService service;

    @BeforeEach
    void setUp() {
        service = new AiCategorizerService(groqApiService, categoryService);
    }

    private Category buildCategory(Long id, String name) {
        return Category.builder().id(id).name(name).build();
    }

    private List<Category> buildCategories() {
        return List.of(
                buildCategory(1L, "Hisse"),
                buildCategory(2L, "Döviz"),
                buildCategory(3L, "Kripto Para"),
                buildCategory(4L, "Emtia"),
                buildCategory(5L, "Genel Ekonomi"),
                buildCategory(6L, "Diğer")
        );
    }

    @Nested
    @DisplayName("AI Olmadan Sınıflandırma")
    class ClassifyWithoutAi {

        @Test
        @DisplayName("Bitcoin kelimesi içeren başlık 'Kripto Para' kategorisini eşleştirir")
        void classifyWithoutAi_withBitcoinKeyword_matchesKriptoPara() {
            List<Category> categories = buildCategories();

            Optional<Category> result = service.classifyWithoutAi(
                    "Bitcoin yeni rekor kırdı", null, categories);

            assertThat(result).isPresent();
            assertThat(result.get().getName()).isEqualTo("Kripto Para");
        }

        @Test
        @DisplayName("'borsa' kelimesi içeren içerik 'Hisse' kategorisiyle eşleşir")
        void classifyWithoutAi_withBorsaKeyword_matchesHisse() {
            List<Category> categories = buildCategories();

            Optional<Category> result = service.classifyWithoutAi(
                    null, "Borsa bugün rekorla kapandı", categories);

            assertThat(result).isPresent();
            assertThat(result.get().getName()).isEqualTo("Hisse");
        }

        @Test
        @DisplayName("Bilinmeyen içerik boş döner")
        void classifyWithoutAi_withUnknownContent_returnsEmpty() {
            List<Category> categories = buildCategories();

            Optional<Category> result = service.classifyWithoutAi(
                    "Hava bugün güneşli", "Yağmur bekleniyor", categories);

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Kategori listesi boşsa boş döner")
        void classifyWithoutAi_whenEmptyCategories_returnsEmpty() {
            Optional<Category> result = service.classifyWithoutAi(
                    "bitcoin fiyatı", "kripto piyasası", List.of());

            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("AI Destekli Sınıflandırma")
    class CategorizeWithAi {

        @Test
        @DisplayName("AI geçerli kategori döndürdüğünde eşleşen kategori seçilir")
        void categorize_whenAiReturnsValidCategory_returnsMatch() {
            List<Category> categories = buildCategories();
            when(categoryService.getActiveCategoriesCached()).thenReturn(categories);
            when(groqApiService.complete(any(), any())).thenReturn("Döviz");

            Category result = service.categorize("Dolar kuru yükseliyor", "USD/TRY artışı devam ediyor");

            assertThat(result).isNotNull();
            assertThat(result.getName()).isEqualTo("Döviz");
        }

        @Test
        @DisplayName("AI null döndürdüğünde fallback kategori ('Diğer') kullanılır")
        void categorize_whenAiReturnsNull_returnsFallback() {
            List<Category> categories = buildCategories();
            when(categoryService.getActiveCategoriesCached()).thenReturn(categories);
            when(groqApiService.complete(any(), any())).thenReturn(null);

            Category result = service.categorize("Tanımsız bir haber", "");

            assertThat(result).isNotNull();
            assertThat(result.getName()).isEqualTo("Diğer");
        }

        @Test
        @DisplayName("Aktif kategori listesi boşken null döner")
        void categorize_whenNoActiveCategories_returnsNull() {
            when(categoryService.getActiveCategoriesCached()).thenReturn(List.of());

            Category result = service.categorize("Herhangi bir haber", "içerik");

            assertThat(result).isNull();
        }

        @Test
        @DisplayName("AI eşleşmeyen cevap döndürdüğünde fallback kullanılır")
        void categorize_whenAiReturnsUnknownLabel_usesFallback() {
            List<Category> categories = buildCategories();
            when(categoryService.getActiveCategoriesCached()).thenReturn(categories);
            when(groqApiService.complete(any(), any())).thenReturn("XYZ_UNKNOWN");

            Category result = service.categorize("Belirsiz haber", "içerik");

            assertThat(result).isNotNull();
            assertThat(result.getName()).isEqualTo("Diğer");
        }
    }

    @Nested
    @DisplayName("Türkçe Metin Normalizasyonu")
    class TurkishNormalization {

        @Test
        @DisplayName("Türkçe harfler normalize edilerek kategori eşleştirilir")
        void matchCategoryLabel_withTurkishChars_normalizesCorrectly() {
            List<Category> categories = buildCategories();

            // "Döviz" normalized is "doviz", alias "doviz" maps to "Döviz"
            Optional<Category> result = service.matchCategoryLabel("Döviz", categories);

            assertThat(result).isPresent();
            assertThat(result.get().getName()).isEqualTo("Döviz");
        }

        @Test
        @DisplayName("Büyük/küçük harf farkı gözetilmeksizin eşleşme yapılır")
        void matchCategoryLabel_caseInsensitive_matches() {
            List<Category> categories = buildCategories();

            Optional<Category> result = service.matchCategoryLabel("HISSE", categories);

            assertThat(result).isPresent();
            assertThat(result.get().getName()).isEqualTo("Hisse");
        }

        @Test
        @DisplayName("Boş kategori listesinde boş döner")
        void matchCategoryLabel_whenEmptyList_returnsEmpty() {
            Optional<Category> result = service.matchCategoryLabel("Hisse", List.of());

            assertThat(result).isEmpty();
        }
    }
}
