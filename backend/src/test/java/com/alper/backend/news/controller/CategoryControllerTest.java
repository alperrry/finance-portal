package com.alper.backend.news.controller;

import com.alper.backend.news.model.Category;
import com.alper.backend.news.service.CategoryService;
import com.alper.backend.common.web.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("CategoryController Testleri")
class CategoryControllerTest {

    @Mock private CategoryService categoryService;

    @InjectMocks private CategoryController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private Category buildCategory(Long id, String name) {
        return Category.builder().id(id).name(name).build();
    }

    @Nested
    @DisplayName("GET /api/categories")
    class ListCategories {

        @Test
        @DisplayName("200 — aktif kategori listesi döner")
        void listCategories_activeOnly_returns200() throws Exception {
            when(categoryService.getAllCategories(true))
                    .thenReturn(List.of(
                            buildCategory(1L, "Ekonomi"),
                            buildCategory(2L, "Borsa")
                    ));

            mockMvc.perform(get("/api/categories"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(2))
                    .andExpect(jsonPath("$[0].name").value("Ekonomi"));
        }

        @Test
        @DisplayName("200 — boş liste 200 döner")
        void listCategories_empty_returns200() throws Exception {
            when(categoryService.getAllCategories(true)).thenReturn(List.of());

            mockMvc.perform(get("/api/categories"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(0));
        }

        @Test
        @DisplayName("200 — activeOnly=false ile tüm kategoriler döner")
        void listCategories_allIncluded_returns200() throws Exception {
            when(categoryService.getAllCategories(false))
                    .thenReturn(List.of(
                            buildCategory(1L, "Ekonomi"),
                            buildCategory(3L, "Pasif Kategori")
                    ));

            mockMvc.perform(get("/api/categories").param("activeOnly", "false"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(2));
        }

        @Test
        @DisplayName("200 — kategori ID ve adı JSON alanlarında döner")
        void listCategories_fieldsPresent_inResponse() throws Exception {
            when(categoryService.getAllCategories(true))
                    .thenReturn(List.of(buildCategory(5L, "Kripto Para")));

            mockMvc.perform(get("/api/categories"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].id").value(5))
                    .andExpect(jsonPath("$[0].name").value("Kripto Para"));
        }
    }
}
