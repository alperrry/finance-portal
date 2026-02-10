package com.alper.backend.news.service;

import com.alper.backend.news.config.NewsApiProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class NewsApiService {

    private static final Logger log = LoggerFactory.getLogger(NewsApiService.class);

    private final NewsApiProperties newsApiProperties;
    private final RestTemplate restTemplate;

    public NewsApiService(NewsApiProperties newsApiProperties) {
        this.newsApiProperties = newsApiProperties;
        this.restTemplate = new RestTemplate();
    }

    /**
     * Marketaux API - Fetch financial news
     * @param symbols Stock symbols (e.g., "TSLA,AAPL,MSFT")
     * @param entities Companies (e.g., "Tesla,Apple")
     * @param industries Industries (e.g., "Technology,Financials")
     * @return JSON response
     */
    public String fetchNews(String symbols, String entities, String industries) {
        try {
            UriComponentsBuilder builder = UriComponentsBuilder
                    .fromUriString(newsApiProperties.getBaseUrl() + "/news/all")
                    .queryParam("api_token", newsApiProperties.getKey())
                    .queryParam("language", "en")
                    .queryParam("limit", 50);

            if (symbols != null && !symbols.isEmpty()) {
                builder.queryParam("symbols", symbols);
            }

            if (entities != null && !entities.isEmpty()) {
                builder.queryParam("entities", entities);
            }

            if (industries != null && !industries.isEmpty()) {
                builder.queryParam("industries", industries);
            }

            String url = builder.toUriString();
            log.info("Fetching news from Marketaux API: {}", url.replace(newsApiProperties.getKey(), "***"));
            return restTemplate.getForObject(url, String.class);
        } catch (Exception e) {
            log.error("Error fetching news from Marketaux API", e);
            return null;
        }
    }

    /**
     * Fetch all news without filters
     */
    public String fetchAllNews() {
        return fetchNews(null, null, null);
    }

    /**
     * Fetch news by specific symbols
     */
    public String fetchNewsBySymbols(String symbols) {
        return fetchNews(symbols, null, null);
    }

    /**
     * Fetch news by entities (companies)
     */
    public String fetchNewsByEntities(String entities) {
        return fetchNews(null, entities, null);
    }

    /**
     * Fetch news by industries
     */
    public String fetchNewsByIndustries(String industries) {
        return fetchNews(null, null, industries);
    }
}
