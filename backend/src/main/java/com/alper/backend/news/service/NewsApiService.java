package com.alper.backend.news.service;

import com.alper.backend.news.config.NewsApiProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Üçüncü parti haber API'sinden ({@code newsapi.org} stilinde) içerik çeken servis.
 *
 * <p>Yapılandırma {@code NewsApiProperties} üzerinden okunur; sonuçlar
 * {@link NewsService} tarafından merge edilip persist edilir.</p>
 */
@Service
public class NewsApiService {

    private static final Logger log = LoggerFactory.getLogger(NewsApiService.class);

    private final NewsApiProperties newsApiProperties;
    private final RestTemplate restTemplate;

    public NewsApiService(NewsApiProperties newsApiProperties) {
        this.newsApiProperties = newsApiProperties;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5000);
        requestFactory.setReadTimeout(10000);
        this.restTemplate = new RestTemplate(requestFactory);
    }


    public String fetchNews() {
        try {
            String baseUrl = trimToEmpty(newsApiProperties.getBaseUrl());
            String apiKey = trimToEmpty(newsApiProperties.getKey());
            String country = trimToNull(newsApiProperties.getCountry());
            String category = trimToNull(newsApiProperties.getCategory());

            if (baseUrl.isEmpty()) {
                log.warn("Skipping news fetch: news.api.base-url is not configured");
                return null;
            }
            if (apiKey.isEmpty()) {
                log.warn("Skipping news fetch: NEWS_API_KEY is empty");
                return null;
            }

            UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(resolveEndpoint(baseUrl));
            addQueryParam(builder, "country", country);
            addQueryParam(builder, "category", category);
            builder.queryParam("apiKey", apiKey);

            String url = builder.toUriString();
            log.info("Fetching news from NewsAPI.org: {}", maskApiKey(url, apiKey));
            return restTemplate.getForObject(url, String.class);
        } catch (Exception e) {
            log.error("Error fetching news from API provider", e);
            return null;
        }
    }

    /**
     * Fetch all news without filters
     */
    public String fetchAllNews() {
        return fetchNews();
    }

    private String resolveEndpoint(String baseUrl) {
        String trimmed = trimTrailingSlash(baseUrl);
        if (trimmed.endsWith("/top-headlines")) {
            return trimmed;
        }
        if (trimmed.endsWith("/v2")) {
            return trimmed + "/top-headlines";
        }
        return trimmed + "/v2/top-headlines";
    }

    private void addQueryParam(UriComponentsBuilder builder, String name, String value) {
        if (value != null && !value.isBlank()) {
            builder.queryParam(name, value);
        }
    }

    private String trimToEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String trimmed = value.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }

    private String maskApiKey(String value, String apiKey) {
        if (value == null || value.isBlank() || apiKey == null || apiKey.isBlank()) {
            return value;
        }
        return value.replace(apiKey, "***");
    }

}
