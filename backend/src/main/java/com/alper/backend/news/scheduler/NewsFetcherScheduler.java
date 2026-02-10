package com.alper.backend.news.scheduler;

import com.alper.backend.news.config.NewsFetcherProperties;
import com.alper.backend.news.model.News;
import com.alper.backend.news.model.Source;
import com.alper.backend.news.repository.NewsRepository;
import com.alper.backend.news.repository.SourceRepository;
import com.alper.backend.news.service.NewsApiService;
import com.alper.backend.news.service.RssFeedService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rometools.rome.feed.synd.SyndEntry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.List;

@Component
@ConditionalOnProperty(name = "news.fetcher.enabled", havingValue = "true", matchIfMissing = true)
public class NewsFetcherScheduler {

    private static final Logger log = LoggerFactory.getLogger(NewsFetcherScheduler.class);

    private final SourceRepository sourceRepository;
    private final NewsRepository newsRepository;
    private final NewsApiService newsApiService;
    private final RssFeedService rssFeedService;
    private final NewsFetcherProperties fetcherProperties;
    private final ObjectMapper objectMapper;

    public NewsFetcherScheduler(SourceRepository sourceRepository,
                               NewsRepository newsRepository,
                               NewsApiService newsApiService,
                               RssFeedService rssFeedService,
                               NewsFetcherProperties fetcherProperties) {
        this.sourceRepository = sourceRepository;
        this.newsRepository = newsRepository;
        this.newsApiService = newsApiService;
        this.rssFeedService = rssFeedService;
        this.fetcherProperties = fetcherProperties;
        this.objectMapper = new ObjectMapper();
    }

    @Scheduled(
            initialDelayString = "${news.fetcher.initial-delay}",
            fixedDelayString = "${news.fetcher.fixed-delay}"
    )
    public void fetchNews() {
        if (!fetcherProperties.isEnabled()) {
            log.debug("News fetcher is disabled");
            return;
        }

        log.info("Starting news fetch job");

        // Get all active sources
        List<Source> activeSources = sourceRepository.findByIsActiveTrue();
        log.info("Found {} active sources", activeSources.size());

        for (Source source : activeSources) {
            try {
                fetchNewsFromSource(source);
            } catch (Exception e) {
                log.error("Error fetching news from source: {}", source.getName(), e);
            }
        }

        log.info("News fetch job completed");
    }

    private void fetchNewsFromSource(Source source) {
        String sourceUrl = source.getSourceUrl();

        // Check if it's an RSS feed or API source
        if (sourceUrl.startsWith("http://") || sourceUrl.startsWith("https://")) {
            // Assume RSS feed
            fetchFromRss(source);
        } else {
            // Assume API source identifier
            fetchFromApi(source);
        }
    }

    private void fetchFromRss(Source source) {
        log.info("Fetching RSS from: {}", source.getName());
        List<SyndEntry> entries = rssFeedService.fetchRssFeed(source.getSourceUrl());

        for (SyndEntry entry : entries) {
            try {
                String link = entry.getLink();

                // Skip if already exists
                if (newsRepository.existsByCanonicalUrl(link)) {
                    log.debug("News already exists: {}", link);
                    continue;
                }

                News news = new News();
                news.setTitle(entry.getTitle());
                news.setContext(entry.getDescription() != null ? entry.getDescription().getValue() : null);
                news.setCanonicalUrl(link);
                news.setExternalId(entry.getUri());
                news.setSource(source);

                // Convert published date
                Date publishedDate = entry.getPublishedDate();
                if (publishedDate != null) {
                    news.setPublishedAt(OffsetDateTime.ofInstant(publishedDate.toInstant(), ZoneId.systemDefault()));
                }

                newsRepository.save(news);
                log.info("Saved news from RSS: {}", news.getTitle());
            } catch (Exception e) {
                log.error("Error processing RSS entry: {}", entry.getTitle(), e);
            }
        }
    }

    private void fetchFromApi(Source source) {
        log.info("Fetching from Marketaux API: {}", source.getName());

        try {
            // sourceUrl can be:
            // - "all" for all news
            // - "symbols:TSLA,AAPL" for specific symbols
            // - "entities:Tesla,Apple" for specific entities
            // - "industries:Technology" for specific industries
            String response = null;
            String sourceUrl = source.getSourceUrl();

            if (sourceUrl.equals("all")) {
                response = newsApiService.fetchAllNews();
            } else if (sourceUrl.startsWith("symbols:")) {
                String symbols = sourceUrl.substring("symbols:".length());
                response = newsApiService.fetchNewsBySymbols(symbols);
            } else if (sourceUrl.startsWith("entities:")) {
                String entities = sourceUrl.substring("entities:".length());
                response = newsApiService.fetchNewsByEntities(entities);
            } else if (sourceUrl.startsWith("industries:")) {
                String industries = sourceUrl.substring("industries:".length());
                response = newsApiService.fetchNewsByIndustries(industries);
            } else {
                // Default: treat as symbols
                response = newsApiService.fetchNewsBySymbols(sourceUrl);
            }

            if (response == null) {
                return;
            }

            // Parse JSON response from Marketaux API
            JsonNode root = objectMapper.readTree(response);
            JsonNode data = root.get("data");

            if (data == null || !data.isArray()) {
                log.warn("No data found in Marketaux API response");
                return;
            }

            for (JsonNode article : data) {
                try {
                    String url = article.get("url").asText();

                    // Skip if already exists
                    if (newsRepository.existsByCanonicalUrl(url)) {
                        log.debug("News already exists: {}", url);
                        continue;
                    }

                    News news = new News();
                    news.setTitle(article.get("title").asText());
                    news.setContext(article.has("description") ? article.get("description").asText() : null);
                    news.setCanonicalUrl(url);
                    news.setSource(source);

                    // Marketaux uses uuid as identifier
                    if (article.has("uuid")) {
                        news.setExternalId(article.get("uuid").asText());
                    }

                    // Parse published date (Marketaux uses 'published_at')
                    if (article.has("published_at")) {
                        String publishedAt = article.get("published_at").asText();
                        news.setPublishedAt(OffsetDateTime.parse(publishedAt));
                    }

                    newsRepository.save(news);
                    log.info("Saved news from Marketaux API: {}", news.getTitle());
                } catch (Exception e) {
                    log.error("Error processing Marketaux article", e);
                }
            }
        } catch (Exception e) {
            log.error("Error fetching from Marketaux API: {}", source.getName(), e);
        }
    }
}
