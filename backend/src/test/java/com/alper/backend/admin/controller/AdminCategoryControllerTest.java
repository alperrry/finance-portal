package com.alper.backend.admin.controller;

import com.alper.backend.admin.dto.CategoryRequest;
import com.alper.backend.admin.dto.CategoryResponse;
import com.alper.backend.admin.service.AdminCategoryService;
import com.alper.backend.common.exception.ConflictException;
import com.alper.backend.common.exception.ErrorCode;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.common.web.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminCategoryController Testleri")
class AdminCategoryControllerTest {

    @Mock private AdminCategoryService adminCategoryService;

    @InjectMocks private AdminCategoryController controller;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private CategoryResponse buildResponse(Long id, String name) {
        CategoryResponse resp = new CategoryResponse();
        resp.setId(id);
        resp.setName(name);
        resp.setActive(true);
        return resp;
    }

    @Nested
    @DisplayName("GET /api/v1/admin/categories")
    class ListCategories {

        @Test
        @DisplayName("200 — kategori listesi döner")
        void listCategories_returns200WithList() throws Exception {
            when(adminCategoryService.listCategories())
                    .thenReturn(List.of(buildResponse(1L, "Ekonomi"), buildResponse(2L, "Borsa")));

            mockMvc.perform(get("/api/v1/admin/categories"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.length()").value(2))
                    .andExpect(jsonPath("$.data[0].name").value("Ekonomi"));
        }

        @Test
        @DisplayName("200 — boş liste döner")
        void listCategories_whenEmpty_returns200WithEmptyList() throws Exception {
            when(adminCategoryService.listCategories()).thenReturn(List.of());

            mockMvc.perform(get("/api/v1/admin/categories"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.length()").value(0));
        }
    }

    @Nested
    @DisplayName("POST /api/v1/admin/categories")
    class CreateCategory {

        @Test
        @DisplayName("201 — geçerli istek ile kategori oluşturulur")
        void createCategory_validRequest_returns201() throws Exception {
            CategoryRequest req = new CategoryRequest();
            req.setName("Yeni Kategori");
            CategoryResponse resp = buildResponse(5L, "Yeni Kategori");

            when(adminCategoryService.createCategory(any(CategoryRequest.class))).thenReturn(resp);

            mockMvc.perform(post("/api/v1/admin/categories")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.id").value(5))
                    .andExpect(jsonPath("$.data.name").value("Yeni Kategori"));
        }

        @Test
        @DisplayName("409 — aynı isim varsa ConflictException → 409")
        void createCategory_duplicateName_returns409() throws Exception {
            CategoryRequest req = new CategoryRequest();
            req.setName("Mevcut");

            when(adminCategoryService.createCategory(any(CategoryRequest.class)))
                    .thenThrow(new ConflictException(ErrorCode.CONFLICT, "Bu isimde kategori zaten mevcut"));

            mockMvc.perform(post("/api/v1/admin/categories")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isConflict());
        }
    }

    @Nested
    @DisplayName("PUT /api/v1/admin/categories/{id}")
    class UpdateCategory {

        @Test
        @DisplayName("200 — kategori güncellenir")
        void updateCategory_validRequest_returns200() throws Exception {
            CategoryRequest req = new CategoryRequest();
            req.setName("Güncellendi");
            CategoryResponse resp = buildResponse(1L, "Güncellendi");

            when(adminCategoryService.updateCategory(eq(1L), any(CategoryRequest.class))).thenReturn(resp);

            mockMvc.perform(put("/api/v1/admin/categories/1")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.name").value("Güncellendi"));
        }
    }

    @Nested
    @DisplayName("DELETE /api/v1/admin/categories/{id}")
    class DeleteCategory {

        @Test
        @DisplayName("200 — kategori silinir")
        void deleteCategory_returns200() throws Exception {
            doNothing().when(adminCategoryService).deleteCategory(3L);

            mockMvc.perform(delete("/api/v1/admin/categories/3"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("404 — bulunamazsa 404")
        void deleteCategory_whenNotFound_returns404() throws Exception {
            doThrow(new NotFoundException(ErrorCode.NOT_FOUND, "Kategori bulunamadı: 99"))
                    .when(adminCategoryService).deleteCategory(99L);

            mockMvc.perform(delete("/api/v1/admin/categories/99"))
                    .andExpect(status().isNotFound());
        }
    }
}
