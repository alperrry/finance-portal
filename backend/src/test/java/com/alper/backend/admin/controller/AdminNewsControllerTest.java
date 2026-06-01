package com.alper.backend.admin.controller;

import com.alper.backend.admin.dto.AdminNewsCategoryRequest;
import com.alper.backend.admin.dto.AdminNewsStatusRequest;
import com.alper.backend.admin.dto.FetchResponse;
import com.alper.backend.admin.dto.SourceRequest;
import com.alper.backend.admin.dto.SourceResponse;
import com.alper.backend.admin.service.AdminNewsService;
import com.alper.backend.common.exception.ConflictException;
import com.alper.backend.common.exception.ErrorCode;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.common.web.GlobalExceptionHandler;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import com.alper.backend.news.dto.NewsResponse;
import com.alper.backend.news.model.NewsStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminNewsController Testleri")
class AdminNewsControllerTest {

    @Mock private AdminNewsService adminNewsService;

    @InjectMocks private AdminNewsController controller;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .build();
    }

    private SourceResponse buildSourceResponse(Long id, String url) {
        return SourceResponse.builder()
                .id(id)
                .name("Test Kaynak")
                .sourceUrl(url)
                .active(true)
                .createdAt(Instant.now())
                .build();
    }

    private NewsResponse buildNewsResponse(Long id, NewsStatus status) {
        NewsResponse nr = new NewsResponse();
        nr.setId(id);
        nr.setTitle("Test Haber");
        nr.setStatus(status);
        return nr;
    }

    @Nested
    @DisplayName("GET /api/v1/admin/news/sources")
    class ListSources {

        @Test
        @DisplayName("200 — kaynak listesi döner")
        void listSources_returns200() throws Exception {
            when(adminNewsService.listSources())
                    .thenReturn(List.of(buildSourceResponse(1L, "http://test.com/rss")));

            mockMvc.perform(get("/api/v1/admin/news/sources"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data[0].id").value(1))
                    .andExpect(jsonPath("$.data[0].sourceUrl").value("http://test.com/rss"));
        }
    }

    @Nested
    @DisplayName("POST /api/v1/admin/news/sources")
    class CreateSource {

        @Test
        @DisplayName("201 — geçerli kaynak oluşturulur")
        void createSource_validRequest_returns201() throws Exception {
            Map<String, String> body = Map.of("name", "Test", "sourceUrl", "http://new.com/rss");
            SourceResponse resp = buildSourceResponse(2L, "http://new.com/rss");

            when(adminNewsService.createSource(any(SourceRequest.class))).thenReturn(resp);

            mockMvc.perform(post("/api/v1/admin/news/sources")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.id").value(2));
        }

        @Test
        @DisplayName("409 — URL zaten varsa 409")
        void createSource_duplicateUrl_returns409() throws Exception {
            Map<String, String> body = Map.of("name", "Test", "sourceUrl", "http://dup.com/rss");

            when(adminNewsService.createSource(any(SourceRequest.class)))
                    .thenThrow(new ConflictException(ErrorCode.CONFLICT, "Bu URL ile kaynak zaten mevcut"));

            mockMvc.perform(post("/api/v1/admin/news/sources")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isConflict());
        }
    }

    @Nested
    @DisplayName("PUT /api/v1/admin/news/sources/{id}")
    class UpdateSource {

        @Test
        @DisplayName("200 — kaynak güncellenir")
        void updateSource_validRequest_returns200() throws Exception {
            Map<String, String> body = Map.of("name", "Yeni", "sourceUrl", "http://updated.com/rss");
            SourceResponse resp = buildSourceResponse(1L, "http://updated.com/rss");

            when(adminNewsService.updateSource(eq(1L), any(SourceRequest.class))).thenReturn(resp);

            mockMvc.perform(put("/api/v1/admin/news/sources/1")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.sourceUrl").value("http://updated.com/rss"));
        }
    }

    @Nested
    @DisplayName("DELETE /api/v1/admin/news/sources/{id}")
    class DeleteSource {

        @Test
        @DisplayName("200 — kaynak silinir")
        void deleteSource_returns200() throws Exception {
            doNothing().when(adminNewsService).deleteSource(1L);

            mockMvc.perform(delete("/api/v1/admin/news/sources/1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("404 — kaynak bulunamazsa 404")
        void deleteSource_whenNotFound_returns404() throws Exception {
            doThrow(new NotFoundException(ErrorCode.NOT_FOUND, "Kaynak bulunamadı: 99"))
                    .when(adminNewsService).deleteSource(99L);

            mockMvc.perform(delete("/api/v1/admin/news/sources/99"))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("GET /api/v1/admin/news")
    class ListNews {

        @Test
        @DisplayName("200 — haber listesi için servis çağrılır")
        void listNews_returns200() throws Exception {
            when(adminNewsService.listNews(any(), any(), any(), any(), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

            mockMvc.perform(get("/api/v1/admin/news"))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("PATCH /api/v1/admin/news/{id}/status")
    class UpdateNewsStatus {

        @Test
        @DisplayName("200 — haber durumu güncellenir")
        void updateNewsStatus_returns200() throws Exception {
            Map<String, String> body = Map.of("status", "published");
            NewsResponse resp = buildNewsResponse(1L, NewsStatus.published);

            when(adminNewsService.updateNewsStatus(eq(1L), any(AdminNewsStatusRequest.class))).thenReturn(resp);

            mockMvc.perform(patch("/api/v1/admin/news/1/status")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.status").value("published"));
        }

        @Test
        @DisplayName("404 — haber bulunamazsa 404")
        void updateNewsStatus_whenNotFound_returns404() throws Exception {
            Map<String, String> body = Map.of("status", "published");

            when(adminNewsService.updateNewsStatus(eq(99L), any(AdminNewsStatusRequest.class)))
                    .thenThrow(new NotFoundException(ErrorCode.NOT_FOUND, "Haber bulunamadı: 99"));

            mockMvc.perform(patch("/api/v1/admin/news/99/status")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("POST /api/v1/admin/news/fetch")
    class FetchNews {

        @Test
        @DisplayName("202 — tüm kaynaklar için haber çekimi tetiklenir")
        void fetchAll_returns202() throws Exception {
            when(adminNewsService.triggerFetchAll()).thenReturn(FetchResponse.triggered("all"));

            mockMvc.perform(post("/api/v1/admin/news/fetch"))
                    .andExpect(status().isAccepted())
                    .andExpect(jsonPath("$.data.status").value("TRIGGERED"));
        }
    }
}
