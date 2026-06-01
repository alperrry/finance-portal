package com.alper.backend.news.service;

import com.alper.backend.news.config.GroqConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Groq Cloud LLM API'sini saran düşük seviyeli istemci.
 *
 * <p>{@code groq.api.url} ve API key konfigürasyonu ile chat completion isteği gönderir;
 * rate-limit hatalarında {@value #DEFAULT_RATE_LIMIT_COOLDOWN_MS} ms cooldown uygular.
 * {@link AiCategorizerService} tarafından haber kategorilendirme için kullanılır.</p>
 */
@Service
public class GroqApiService {

    private static final Logger log = LoggerFactory.getLogger(GroqApiService.class);
    private static final long DEFAULT_RATE_LIMIT_COOLDOWN_MS = 60_000L;

    private final RestClient groqRestClient;
    private final GroqConfig groqConfig;
    private final AtomicLong rateLimitedUntilEpochMs = new AtomicLong(0L);

    public GroqApiService(RestClient groqRestClient, GroqConfig groqConfig) {
        this.groqRestClient = groqRestClient;
        this.groqConfig = groqConfig;
    }

    /**
     * Groq API'ye istek gönderir ve ham metin cevabı döner.
     */
    public String complete(String systemPrompt, String userMessage) {
        if (groqConfig.getKey() == null || groqConfig.getKey().isBlank()) {
            log.warn("Groq API key is missing, skipping AI categorization call");
            return null;
        }
        long now = System.currentTimeMillis();
        long rateLimitedUntil = rateLimitedUntilEpochMs.get();
        if (now < rateLimitedUntil) {
            return null;
        }

        Map<String, Object> requestBody = Map.of(
                "model", groqConfig.getModel(),
                "max_tokens", 20,        // Kategori adı için fazlasıyla yeterli
                "temperature", 0.1,      // Tutarlı sonuç için düşük tutuyoruz
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userMessage)
                )
        );

        try {
            Map response = groqRestClient.post()
                    .uri("/chat/completions")
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            // Response parse: choices[0].message.content
            List choices = (List) response.get("choices");
            Map firstChoice = (Map) choices.get(0);
            Map message = (Map) firstChoice.get("message");
            return message.get("content").toString().trim();

        } catch (RestClientResponseException e) {
            if (isLimitExceeded(e.getStatusCode().value(), e.getResponseBodyAsString())) {
                long cooldownMs = resolveRetryAfterMs(e);
                rateLimitedUntilEpochMs.set(System.currentTimeMillis() + cooldownMs);
                log.warn("Kategori işlemi tamamlanamadı: AI limiti bitti (status={}), {} saniye boyunca istek atılmayacak",
                    e.getStatusCode().value(), cooldownMs / 1000);
                return null;
            }
            log.error("Groq API isteği başarısız: status={}, body={}", e.getStatusCode().value(), e.getResponseBodyAsString());
            return null;
        } catch (Exception e) {
            log.error("Groq API isteği başarısız: {}", e.getMessage());
            return null;
        }
    }

    private boolean isLimitExceeded(int statusCode, String responseBody) {
        if (statusCode == 429) {
            return true;
        }

        String body = responseBody == null ? "" : responseBody.toLowerCase(Locale.ROOT);
        return body.contains("rate limit")
                || body.contains("quota")
                || body.contains("insufficient_quota")
                || body.contains("limit exceeded");
    }

    private long resolveRetryAfterMs(RestClientResponseException exception) {
        HttpHeaders headers = exception.getResponseHeaders();
        if (headers != null) {
            String retryAfter = headers.getFirst("Retry-After");
            if (retryAfter != null && !retryAfter.isBlank()) {
                try {
                    long retryAfterSeconds = Long.parseLong(retryAfter.trim());
                    if (retryAfterSeconds > 0) {
                        return retryAfterSeconds * 1000L;
                    }
                } catch (NumberFormatException ignored) {
                    // Ignore malformed Retry-After header and fall back to default.
                }
            }
        }
        return DEFAULT_RATE_LIMIT_COOLDOWN_MS;
    }
}
