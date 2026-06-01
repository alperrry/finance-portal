package com.alper.backend.admin.service;

import com.alper.backend.admin.dto.CategoryRequest;
import com.alper.backend.admin.dto.CategoryResponse;
import com.alper.backend.common.exception.ConflictException;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.news.model.Category;
import com.alper.backend.news.repository.CategoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminCategoryService Testleri")
class AdminCategoryServiceTest {

    @Mock private CategoryRepository categoryRepository;

    private AdminCategoryService service;

    @BeforeEach
    void setUp() {
        service = new AdminCategoryService(categoryRepository);
    }

    private Category buildCategory(Long id, String name) {
        return Category.builder().id(id).name(name).isActive(true).build();
    }

    private CategoryRequest buildRequest(String name) {
        CategoryRequest req = new CategoryRequest();
        req.setName(name);
        return req;
    }

    @Nested
    @DisplayName("Başarılı Senaryolar")
    class HappyPath {

        @Test
        @DisplayName("listCategories — tüm kategorileri döner")
        void listCategories_returnsAll() {
            when(categoryRepository.findAll())
                    .thenReturn(List.of(buildCategory(1L, "Ekonomi"), buildCategory(2L, "Borsa")));

            List<CategoryResponse> result = service.listCategories();

            assertThat(result).hasSize(2);
            assertThat(result).extracting(CategoryResponse::getName)
                    .containsExactly("Ekonomi", "Borsa");
        }

        @Test
        @DisplayName("getCategory — mevcut kategori döner")
        void getCategory_whenExists_returnsResponse() {
            when(categoryRepository.findById(1L))
                    .thenReturn(Optional.of(buildCategory(1L, "Ekonomi")));

            CategoryResponse result = service.getCategory(1L);

            assertThat(result.getId()).isEqualTo(1L);
            assertThat(result.getName()).isEqualTo("Ekonomi");
        }

        @Test
        @DisplayName("createCategory — yeni isim ile kaydedilir ve döner")
        void createCategory_savesAndReturnsDto() {
            CategoryRequest req = buildRequest("Ekonomi");
            Category saved = buildCategory(5L, "Ekonomi");

            when(categoryRepository.existsByName("Ekonomi")).thenReturn(false);
            when(categoryRepository.save(any(Category.class))).thenReturn(saved);

            CategoryResponse result = service.createCategory(req);

            assertThat(result.getId()).isEqualTo(5L);
            assertThat(result.getName()).isEqualTo("Ekonomi");
            verify(categoryRepository).save(any(Category.class));
        }

        @Test
        @DisplayName("updateCategory — isim ve aktiflik güncellenir")
        void updateCategory_updatesAndReturnsDto() {
            Category existing = buildCategory(1L, "Eski");
            CategoryRequest req = buildRequest("Yeni");
            req.setIsActive(false);
            Category saved = Category.builder().id(1L).name("Yeni").isActive(false).build();

            when(categoryRepository.findById(1L)).thenReturn(Optional.of(existing));
            when(categoryRepository.existsByName("Yeni")).thenReturn(false);
            when(categoryRepository.save(any(Category.class))).thenReturn(saved);

            CategoryResponse result = service.updateCategory(1L, req);

            assertThat(result.getName()).isEqualTo("Yeni");
            assertThat(result.isActive()).isFalse();
        }

        @Test
        @DisplayName("deleteCategory — var olan kategori silinir")
        void deleteCategory_deletesById() {
            Category existing = buildCategory(3L, "Silinecek");
            when(categoryRepository.findById(3L)).thenReturn(Optional.of(existing));

            service.deleteCategory(3L);

            verify(categoryRepository).delete(existing);
        }
    }

    @Nested
    @DisplayName("Hata Senaryoları")
    class ErrorCases {

        @Test
        @DisplayName("createCategory — isim zaten varsa ConflictException fırlar")
        void createCategory_whenNameExists_throwsConflict() {
            CategoryRequest req = buildRequest("Ekonomi");
            when(categoryRepository.existsByName("Ekonomi")).thenReturn(true);

            assertThatThrownBy(() -> service.createCategory(req))
                    .isInstanceOf(ConflictException.class)
                    .hasMessageContaining("Ekonomi");
        }

        @Test
        @DisplayName("getCategory — bulunamazsa NotFoundException fırlar")
        void getCategory_whenNotFound_throwsNotFound() {
            when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.getCategory(99L))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessageContaining("99");
        }

        @Test
        @DisplayName("deleteCategory — bulunamazsa NotFoundException fırlar")
        void deleteCategory_whenNotFound_throwsNotFound() {
            when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.deleteCategory(99L))
                    .isInstanceOf(NotFoundException.class);
        }

        @Test
        @DisplayName("updateCategory — yeni isim başkasına aitse ConflictException fırlar")
        void updateCategory_whenNameExists_throwsConflict() {
            Category existing = buildCategory(1L, "Eski");
            CategoryRequest req = buildRequest("Mevcut");

            when(categoryRepository.findById(1L)).thenReturn(Optional.of(existing));
            when(categoryRepository.existsByName("Mevcut")).thenReturn(true);

            assertThatThrownBy(() -> service.updateCategory(1L, req))
                    .isInstanceOf(ConflictException.class)
                    .hasMessageContaining("Mevcut");
        }
    }

    @Nested
    @DisplayName("Güncelleme Sınır Durumları")
    class UpdateEdgeCases {

        @Test
        @DisplayName("updateCategory — isim değişmemişse çakışma kontrolü atlanır")
        void updateCategory_sameNameNoConflictCheck() {
            Category existing = buildCategory(1L, "Ekonomi");
            CategoryRequest req = buildRequest("Ekonomi");
            when(categoryRepository.findById(1L)).thenReturn(Optional.of(existing));
            when(categoryRepository.save(any(Category.class))).thenReturn(existing);

            CategoryResponse result = service.updateCategory(1L, req);

            assertThat(result.getName()).isEqualTo("Ekonomi");
        }

        @Test
        @DisplayName("updateCategory — isim null ise isim değiştirilmez")
        void updateCategory_nullNameSkipsNameUpdate() {
            Category existing = buildCategory(1L, "Ekonomi");
            CategoryRequest req = new CategoryRequest();
            req.setIsActive(false);
            Category saved = Category.builder().id(1L).name("Ekonomi").isActive(false).build();
            when(categoryRepository.findById(1L)).thenReturn(Optional.of(existing));
            when(categoryRepository.save(any(Category.class))).thenReturn(saved);

            CategoryResponse result = service.updateCategory(1L, req);

            assertThat(result.getName()).isEqualTo("Ekonomi");
        }
    }
}
