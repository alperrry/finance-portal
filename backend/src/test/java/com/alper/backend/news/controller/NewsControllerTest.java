package com.alper.backend.news.controller;

import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.news.dto.NewsPageCacheEntry;
import com.alper.backend.news.dto.NewsResponse;
import com.alper.backend.news.model.News;
import com.alper.backend.news.model.NewsStatus;
import com.alper.backend.news.model.Source;
import com.alper.backend.news.service.GoogleNewsRssService;
import com.alper.backend.news.service.NewsService;
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

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("NewsController Testleri")
class NewsControllerTest {

    @Mock private NewsService newsService;
    @Mock private GoogleNewsRssService googleNewsRssService;

    @InjectMocks private NewsController controller;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private News buildNews(Long id, NewsStatus status) {
        Source source = Source.builder().id(1L).name("Test Kaynak").sourceUrl("http://test.com/rss").build();
        News news = new News();
        news.setId(id);
        news.setTitle("Test Haber " + id);
        news.setCanonicalUrl("http://test.com/news/" + id);
        news.setStatus(status);
        news.setSource(source);
        news.setPublishedAt(OffsetDateTime.now());
        return news;
    }

    @Nested
    @DisplayName("GET /api/news")
    class GetAllNews {

        @Test
        @DisplayName("200 — haber listesi sayfalı olarak döner")
        void getAllNews_returns200() throws Exception {
            NewsResponse newsResp = new NewsResponse(buildNews(1L, NewsStatus.published));
            NewsPageCacheEntry cacheEntry = new NewsPageCacheEntry(List.of(newsResp), 1L);

            when(newsService.getNewsResponses(any(), any())).thenReturn(cacheEntry);

            mockMvc.perform(get("/api/news"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("200 — boş liste döner")
        void getAllNews_empty_returns200() throws Exception {
            when(newsService.getNewsResponses(any(), any()))
                    .thenReturn(new NewsPageCacheEntry(List.of(), 0L));

            mockMvc.perform(get("/api/news"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("400 — negatif sayfa numarası 400 döner")
        void getAllNews_negativePage_returns400() throws Exception {
            mockMvc.perform(get("/api/news").param("page", "-1"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 — sıfır boyutlu sayfa 400 döner")
        void getAllNews_zeroSize_returns400() throws Exception {
            mockMvc.perform(get("/api/news").param("size", "0"))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("GET /api/news/{id}")
    class GetNewsById {

        @Test
        @DisplayName("200 — mevcut haber döner")
        void getNewsById_returns200() throws Exception {
            News news = buildNews(1L, NewsStatus.published);
            when(newsService.getNewsById(1L)).thenReturn(news);

            mockMvc.perform(get("/api/news/1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(1))
                    .andExpect(jsonPath("$.title").value("Test Haber 1"));
        }

        @Test
        @DisplayName("404 — bulunamayan haber 404 döner")
        void getNewsById_whenNotFound_returns404() throws Exception {
            when(newsService.getNewsById(99L))
                    .thenThrow(new NotFoundException("News not found with id: 99"));

            mockMvc.perform(get("/api/news/99"))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("PATCH /api/news/{id}/status")
    class UpdateStatus {

        @Test
        @DisplayName("200 — haber durumu güncellenir")
        void updateStatus_returns200() throws Exception {
            News news = buildNews(1L, NewsStatus.archived);
            when(newsService.updateStatus(eq(1L), eq(NewsStatus.archived))).thenReturn(news);

            mockMvc.perform(patch("/api/news/1/status")
                            .param("status", "archived"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("archived"));
        }
    }
}
