package com.alper.backend.news.scheduler;

import com.alper.backend.news.config.NewsFetcherProperties;
import com.alper.backend.news.event.NewsPublishedEvent;
import com.alper.backend.news.model.Category;
import com.alper.backend.news.model.News;
import com.alper.backend.news.model.Source;
import com.alper.backend.news.repository.CategoryRepository;
import com.alper.backend.news.repository.NewsRepository;
import com.alper.backend.news.repository.SourceRepository;
import com.alper.backend.news.service.AiCategorizerService;
import com.alper.backend.news.service.NewsApiService;
import com.alper.backend.news.service.RssFeedService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rometools.rome.feed.synd.SyndEntry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

@Component
@ConditionalOnProperty(name = "news.fetcher.enabled", havingValue = "true", matchIfMissing = true)
public class NewsFetcherScheduler {

    private static final Logger log = LoggerFactory.getLogger(NewsFetcherScheduler.class);
    private static final String DEFAULT_API_SOURCE_NAME = "NewsAPI.org API";
    private static final String DEFAULT_API_SOURCE_URL = "newsapi-org-api";
    private static final DateTimeFormatter[] LOCAL_DATE_TIME_FORMATTERS = new DateTimeFormatter[] {
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"),
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
    };
    private static final Pattern COMBINING_MARKS_PATTERN = Pattern.compile("\\p{M}+");
    private static final Set<String> FINANCE_KEYWORDS = Set.of(
        "ekonomi", "finans", "piyasa", "borsa", "bist", "hisse", "halka arz",
        "doviz", "kur", "dolar", "euro", "sterlin", "altin", "ons", "gram",
        "kripto", "bitcoin", "ethereum", "tcmb", "merkez bank", "faiz", "enflasyon",
        "tahvil", "bono", "bank", "kredi", "ihracat", "ithalat", "cari acik",
        "gsyh", "yatirim", "temettu", "petrol", "dogalgaz", "brent", "emtia",
        "vergi", "bilanco", "gelir", "kar ", "zarar", "likidite", "rezerv"
    );
    private static final Set<String> NON_FINANCE_KEYWORDS = Set.of(
        "deprem", "hava durumu", "mac", "spor", "futbol", "basketbol", "okul",
        "toki", "ramazan", "saganak", "kar yagisi", "magazin", "dizi", "sinema",
        "trafik", "saglik", "cinayet", "yarali", "oldu mu", "hangi kanalda"
    );

    private final SourceRepository sourceRepository;
    private final CategoryRepository categoryRepository;
    private final NewsRepository newsRepository;
    private final NewsApiService newsApiService;
    private final RssFeedService rssFeedService;
    private final AiCategorizerService aiCategorizerService;
    private final NewsFetcherProperties fetcherProperties;
    private final CacheManager cacheManager;
    private final ApplicationEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    public NewsFetcherScheduler(SourceRepository sourceRepository,
                               CategoryRepository categoryRepository,
                               NewsRepository newsRepository,
                               NewsApiService newsApiService,
                               RssFeedService rssFeedService,
                               AiCategorizerService aiCategorizerService,
                               NewsFetcherProperties fetcherProperties,
                               CacheManager cacheManager,
                               ApplicationEventPublisher eventPublisher) {
        this.sourceRepository = sourceRepository;
        this.categoryRepository = categoryRepository;
        this.newsRepository = newsRepository;
        this.newsApiService = newsApiService;
        this.rssFeedService = rssFeedService;
        this.aiCategorizerService = aiCategorizerService;
        this.fetcherProperties = fetcherProperties;
        this.cacheManager = cacheManager;
        this.eventPublisher = eventPublisher;
        this.objectMapper = new ObjectMapper();
    }

    @Scheduled(
            initialDelayString = "${news.fetcher.initial-delay}",
            fixedDelayString = "${news.fetcher.fixed-delay}"
    )
    @Transactional
    public void fetchNews() {
        if (!fetcherProperties.isEnabled()) {
            log.debug("News fetcher is disabled");
            return;
        }

        log.info("Starting news fetch job");
        int savedNewsCount = 0;
        List<News> savedNewsList = new ArrayList<>();
        AiCallBudget aiCallBudget = new AiCallBudget(Math.max(0, fetcherProperties.getAiMaxCallsPerRun()));

        // 1. Fetch from configured API provider directly (NewsAPI.org by default)
        try {
            savedNewsCount += fetchFromApi(aiCallBudget, savedNewsList);
        } catch (Exception e) {
            log.error("Error fetching news from API", e);
        }

        // 2. Additionally fetch from configured sources (RSS feeds, etc.)
        List<Source> activeSources = sourceRepository.findByIsActiveTrue();
        if (!activeSources.isEmpty()) {
            log.info("Found {} active sources", activeSources.size());
            for (Source source : activeSources) {
                try {
                    savedNewsCount += fetchNewsFromSource(source, aiCallBudget, savedNewsList);
                } catch (Exception e) {
                    log.error("Error fetching news from source: {}", source.getName(), e);
                }
            }
        }

        if (savedNewsCount > 0) {
            evictNewsListCache();
            publishNewsPublishedEvent(savedNewsList);
            log.info("News cache evicted after {} new/updated records", savedNewsCount);
        }

        log.info("News fetch job completed");
    }

    /**
     * Fetch from API provider directly without needing a source.
     */
    private int fetchFromApi(AiCallBudget aiCallBudget, List<News> savedNewsList) {
        log.info("Fetching news directly from API provider");

        try {
            String response = newsApiService.fetchAllNews();

            if (response == null) {
                log.warn("No response from API provider");
                return 0;
            }

            JsonNode root = objectMapper.readTree(response);
            JsonNode articles = extractApiArticles(root);

            if (articles == null || !articles.isArray()) {
                log.warn("No article array found in API response");
                return 0;
            }

            Source defaultSource = resolveOrCreateApiSource();
            int savedCount = 0;
            for (JsonNode article : articles) {
                try {
                    String url = readTextField(article, "url", "link");
                    if (url == null || url.isBlank()) {
                        log.debug("Skipping API article without URL");
                        continue;
                    }
                    String title = readTextField(article, "title");
                    if (title == null || title.isBlank()) {
                        log.debug("Skipping article without title: {}", url);
                        continue;
                    }
                    String context = readTextField(article, "description", "content");
                    Set<String> incomingCategoryLabels = extractApiCategoryLabels(article);

                    if (shouldSkipAsNonFinance(title, context, incomingCategoryLabels)) {
                        log.debug("Skipping non-finance API article: {}", title);
                        continue;
                    }

                    String externalId = normalizeExternalId(readNestedTextField(article, "source", "id"));
                    if (externalId == null) {
                        externalId = normalizeExternalId(url);
                    }

                    if (isDuplicate(defaultSource.getId(), url, externalId)) {
                        continue;
                    }

                    News news = new News();
                    news.setTitle(title);
                    news.setContext(context);
                    news.setCanonicalUrl(url);
                    news.setSource(defaultSource);
                    news.setExternalId(externalId);

                    news.setPublishedAt(parsePublishedAt(article));

                    Set<Category> matchedCategories = enrichNews(news, incomingCategoryLabels, aiCallBudget);

                    News savedNews = newsRepository.save(news);
                    savedNewsList.add(savedNews);
                    savedCount++;
                    logSaved("API", news, matchedCategories);
                } catch (Exception e) {
                    log.error("Error processing API article", e);
                }
            }

            log.info("Saved {} news from API provider", savedCount);
            return savedCount;
        } catch (Exception e) {
            log.error("Error fetching from API provider", e);
            return 0;
        }
    }

    private int fetchNewsFromSource(Source source, AiCallBudget aiCallBudget, List<News> savedNewsList) {
        String sourceUrl = source.getSourceUrl();


        if (sourceUrl.startsWith("http://") || sourceUrl.startsWith("https://")) {
            return fetchFromRss(source, aiCallBudget, savedNewsList);
        } else {
            log.warn("Unknown source type: {}, skipping", sourceUrl);
            return 0;
        }
    }

    private int fetchFromRss(Source source, AiCallBudget aiCallBudget, List<News> savedNewsList) {
        log.info("Fetching RSS from: {}", source.getName());
        List<SyndEntry> entries = rssFeedService.fetchRssFeed(source.getSourceUrl());
        if (entries.isEmpty()) {
            log.warn("No parsable news entries from source: {} ({})", source.getName(), source.getSourceUrl());
            return 0;
        }

        int savedCount = 0;
        for (SyndEntry entry : entries) {
            try {
                String link = entry.getLink();
                String uri = entry.getUri();
                String title = entry.getTitle();
                Date publishedDate = entry.getPublishedDate();

                if (link == null || link.isBlank()) {
                    log.debug("Skipping RSS entry without link: {}", title);
                    continue;
                }
                if (title == null || title.isBlank()) {
                    log.debug("Skipping RSS entry without title: {}", link);
                    continue;
                }
                String context = entry.getDescription() != null ? entry.getDescription().getValue() : null;
                Set<String> incomingCategoryLabels = extractRssCategoryLabels(entry);

                if (shouldSkipAsNonFinance(title, context, incomingCategoryLabels)) {
                    log.debug("Skipping non-finance RSS entry: {}", title);
                    continue;
                }

                var existingByUrl = newsRepository.findByCanonicalUrl(link);
                if (existingByUrl.isPresent()) {
                    News existing = existingByUrl.get();
                    if (existing.getPublishedAt() == null && publishedDate != null) {
                        existing.setPublishedAt(OffsetDateTime.ofInstant(publishedDate.toInstant(), ZoneId.systemDefault()));
                        newsRepository.save(existing);
                        savedCount++;
                        log.debug("Backfilled missing published_at for existing RSS news: {}", link);
                    }
                    continue;
                }

                if (isDuplicate(source.getId(), link, normalizeExternalId(uri))) {
                    continue;
                }

                News news = new News();
                news.setTitle(title);
                news.setContext(context);
                news.setCanonicalUrl(link);
                news.setExternalId(normalizeExternalId(uri));
                news.setSource(source);

                // Convert published date
                if (publishedDate != null) {
                    news.setPublishedAt(OffsetDateTime.ofInstant(publishedDate.toInstant(), ZoneId.systemDefault()));
                }

                Set<Category> matchedCategories = enrichNews(news, incomingCategoryLabels, aiCallBudget);

                News savedNews = newsRepository.save(news);
                savedNewsList.add(savedNews);
                logSaved("RSS", news, matchedCategories);
                savedCount++;
            } catch (Exception e) {
                log.error("Error processing RSS entry: {}", entry.getTitle(), e);
            }
        }
        return savedCount;
    }

    private boolean isDuplicate(Long sourceId, String canonicalUrl, String externalId) {
        if (newsRepository.existsByCanonicalUrl(canonicalUrl)) {
            log.debug("Skipping duplicate news: canonicalUrl={}", canonicalUrl);
            return true;
        }
        if (sourceId != null && externalId != null
            && newsRepository.findBySourceIdAndExternalId(sourceId, externalId).isPresent()) {
            log.debug("Skipping duplicate news: sourceId={}, externalId={}", sourceId, externalId);
            return true;
        }
        return false;
    }

    private Source resolveOrCreateApiSource() {
        return sourceRepository.findByName(DEFAULT_API_SOURCE_NAME)
            .orElseGet(() -> {
                Source newSource = new Source();
                newSource.setName(DEFAULT_API_SOURCE_NAME);
                newSource.setSourceUrl(DEFAULT_API_SOURCE_URL);
                newSource.setActive(false);
                return sourceRepository.save(newSource);
            });
    }

    private JsonNode extractApiArticles(JsonNode root) {
        if (root == null || root.isNull()) {
            return null;
        }

        JsonNode newsApiArticles = root.get("articles");
        if (newsApiArticles != null && newsApiArticles.isArray()) {
            return newsApiArticles;
        }

        return null;
    }

    private String readTextField(JsonNode node, String... fieldNames) {
        if (node == null || fieldNames == null) {
            return null;
        }

        for (String fieldName : fieldNames) {
            JsonNode valueNode = node.get(fieldName);
            if (valueNode != null && valueNode.isTextual()) {
                String value = valueNode.asText();
                if (value != null && !value.isBlank()) {
                    return value.trim();
                }
            }
        }
        return null;
    }

    private String readNestedTextField(JsonNode node, String parentFieldName, String childFieldName) {
        if (node == null || parentFieldName == null || childFieldName == null) {
            return null;
        }
        JsonNode parentNode = node.get(parentFieldName);
        if (parentNode == null || parentNode.isNull()) {
            return null;
        }
        return readTextField(parentNode, childFieldName);
    }

    private OffsetDateTime parsePublishedAt(JsonNode article) {
        String publishedAt = readTextField(article, "publishedAt", "published_at", "pubDate");
        if (publishedAt == null) {
            return null;
        }

        try {
            return OffsetDateTime.parse(publishedAt);
        } catch (DateTimeParseException ignored) {
            // Provider may return local datetime without offset; try fallback parsing below.
        }

        String timeZone = readTextField(article, "pubDateTZ");
        ZoneId zoneId = parseZoneId(timeZone);
        for (DateTimeFormatter formatter : LOCAL_DATE_TIME_FORMATTERS) {
            try {
                LocalDateTime parsed = LocalDateTime.parse(publishedAt, formatter);
                return parsed.atZone(zoneId).toOffsetDateTime();
            } catch (DateTimeParseException ignored) {
                // Try next formatter.
            }
        }

        log.debug("Unable to parse published date from provider: {}", publishedAt);
        return null;
    }

    private ZoneId parseZoneId(String zoneText) {
        if (zoneText == null || zoneText.isBlank()) {
            return ZoneId.systemDefault();
        }

        try {
            return ZoneId.of(zoneText.trim());
        } catch (Exception ignored) {
            try {
                return ZoneOffset.of(zoneText.trim());
            } catch (Exception ignoredAgain) {
                return ZoneId.systemDefault();
            }
        }
    }

    private String normalizeExternalId(String externalId) {
        if (externalId == null) {
            return null;
        }
        String trimmed = externalId.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Set<Category> enrichNews(News news, Set<String> incomingCategoryLabels, AiCallBudget aiCallBudget) {
        Set<Category> matchedCategories = mapIncomingCategories(incomingCategoryLabels);

        if (matchedCategories.isEmpty()) {
            List<Category> activeCategories = categoryRepository.findByIsActiveTrue();
            Optional<Category> localCategory = aiCategorizerService.classifyWithoutAi(news.getTitle(), news.getContext(), activeCategories);
            if (localCategory.isPresent()) {
                matchedCategories = new LinkedHashSet<>();
                matchedCategories.add(localCategory.get());
            }
        }

        if (matchedCategories.isEmpty()) {
            if (aiCallBudget.consumeOne()) {
                log.debug("Provider categories could not be mapped, using AI fallback. title={}", news.getTitle());
                Category aiCategory = aiCategorizerService.categorize(news.getTitle(), news.getContext());
                if (aiCategory != null && aiCategory.getId() != null) {
                    matchedCategories = new LinkedHashSet<>();
                    matchedCategories.add(aiCategory);
                } else {
                    log.debug("AI fallback did not return a category. title={}", news.getTitle());
                }
            } else {
                if (aiCallBudget.logExhaustedOnce()) {
                    log.warn("AI categorization budget exhausted for this job (max {}), remaining news will use fallback category",
                        aiCallBudget.initialBudget());
                }
                Category fallbackCategory = aiCategorizerService.getFallbackCategoryFromCache();
                if (fallbackCategory != null && fallbackCategory.getId() != null) {
                    matchedCategories = new LinkedHashSet<>();
                    matchedCategories.add(fallbackCategory);
                }
            }
        }

        news.setCategories(matchedCategories);
        return matchedCategories;
    }

    private Set<Category> mapIncomingCategories(Set<String> incomingCategoryLabels) {
        if (incomingCategoryLabels == null || incomingCategoryLabels.isEmpty()) {
            return Set.of();
        }

        List<Category> activeCategories = categoryRepository.findByIsActiveTrue();
        if (activeCategories.isEmpty()) {
            return Set.of();
        }

        Set<Category> matched = new LinkedHashSet<>();
        for (String label : incomingCategoryLabels) {
            if (label == null || label.isBlank()) {
                continue;
            }
            aiCategorizerService.matchCategoryLabel(label, activeCategories).ifPresent(matched::add);
        }
        return matched;
    }

    private boolean shouldSkipAsNonFinance(String title, String context, Set<String> incomingCategoryLabels) {
        if (!fetcherProperties.isFilterNonFinance()) {
            return false;
        }
        return !isFinanceRelated(title, context, incomingCategoryLabels);
    }

    private boolean isFinanceRelated(String title, String context, Set<String> incomingCategoryLabels) {
        String normalizedText = normalize(joinNonBlank(title, context));
        if (normalizedText.isBlank()) {
            return false;
        }

        boolean hasFinanceKeyword = containsAnyKeyword(normalizedText, FINANCE_KEYWORDS);
        if (hasFinanceKeyword) {
            return true;
        }

        if (incomingCategoryLabels != null && !incomingCategoryLabels.isEmpty()) {
            List<String> normalizedLabels = new ArrayList<>();
            for (String label : incomingCategoryLabels) {
                String normalizedLabel = normalize(label);
                if (!normalizedLabel.isBlank()) {
                    normalizedLabels.add(normalizedLabel);
                }
            }
            for (String normalizedLabel : normalizedLabels) {
                if (containsAnyKeyword(normalizedLabel, FINANCE_KEYWORDS)) {
                    return true;
                }
            }
        }

        if (containsAnyKeyword(normalizedText, NON_FINANCE_KEYWORDS)) {
            return false;
        }

        return false;
    }

    private boolean containsAnyKeyword(String text, Set<String> keywords) {
        if (text == null || text.isBlank() || keywords == null || keywords.isEmpty()) {
            return false;
        }
        for (String keyword : keywords) {
            if (keyword != null && !keyword.isBlank() && text.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    private String joinNonBlank(String first, String second) {
        String firstPart = first == null ? "" : first.trim();
        String secondPart = second == null ? "" : second.trim();
        if (firstPart.isEmpty()) {
            return secondPart;
        }
        if (secondPart.isEmpty()) {
            return firstPart;
        }
        return firstPart + " " + secondPart;
    }

    private Set<String> extractApiCategoryLabels(JsonNode article) {
        Set<String> labels = new LinkedHashSet<>();
        addNodeLabels(labels, article.get("category"));
        addNodeLabels(labels, article.get("author"));

        JsonNode source = article.get("source");
        if (source != null && source.isObject()) {
            addNodeLabels(labels, source.get("id"));
            addNodeLabels(labels, source.get("name"));
        }
        return labels;
    }

    private Set<String> extractRssCategoryLabels(SyndEntry entry) {
        Set<String> labels = new LinkedHashSet<>();
        if (entry.getCategories() == null) {
            return labels;
        }

        for (var category : entry.getCategories()) {
            if (category != null) {
                addRawLabel(labels, category.getName());
            }
        }
        return labels;
    }

    private void addNodeLabels(Set<String> labels, JsonNode node) {
        if (node == null || node.isNull()) {
            return;
        }

        if (node.isArray()) {
            for (JsonNode element : node) {
                addNodeLabels(labels, element);
            }
            return;
        }

        if (node.isTextual()) {
            addRawLabel(labels, node.asText());
        }
    }

    private void addRawLabel(Set<String> labels, String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return;
        }

        String[] parts = rawValue.split("[,;/|]");
        for (String part : parts) {
            String trimmed = part == null ? "" : part.trim();
            if (!trimmed.isEmpty()) {
                labels.add(trimmed);
            }
        }
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        String lowered = value.toLowerCase(Locale.ROOT).replace('ı', 'i');
        String decomposed = Normalizer.normalize(lowered, Normalizer.Form.NFKD);
        String withoutMarks = COMBINING_MARKS_PATTERN.matcher(decomposed).replaceAll("");
        return withoutMarks.replaceAll("\\s+", " ").trim();
    }

    private void logSaved(String sourceLabel, News news, Set<Category> matchedCategories) {
        log.debug("Saved news from {}: {} (Categories: {})",
            sourceLabel,
            news.getTitle(),
            matchedCategories.stream().map(Category::getName).toList());
    }

    private void evictNewsListCache() {
        clearCache("newsList");
        clearCache("newsListV2");
        clearCache("newsListV3");
    }

    private void publishNewsPublishedEvent(List<News> savedNewsList) {
        List<Long> publishedNewsIds = savedNewsList.stream()
                .map(News::getId)
                .filter(Objects::nonNull)
                .toList();

        List<Long> affectedCategoryIds = savedNewsList.stream()
                .flatMap(news -> news.getCategories().stream())
                .map(Category::getId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        if (!publishedNewsIds.isEmpty()) {
            eventPublisher.publishEvent(NewsPublishedEvent.of(publishedNewsIds, affectedCategoryIds));
        }
    }

    private void clearCache(String cacheName) {
        Cache cache = cacheManager.getCache(cacheName);
        if (cache != null) {
            cache.clear();
        }
    }

    private static final class AiCallBudget {
        private final int initialBudget;
        private int remaining;
        private boolean exhaustedLogged;

        private AiCallBudget(int initialBudget) {
            this.initialBudget = Math.max(0, initialBudget);
            this.remaining = this.initialBudget;
        }

        private boolean consumeOne() {
            if (remaining <= 0) {
                return false;
            }
            remaining--;
            return true;
        }

        private int initialBudget() {
            return initialBudget;
        }

        private boolean logExhaustedOnce() {
            if (exhaustedLogged) {
                return false;
            }
            exhaustedLogged = true;
            return true;
        }
    }

}
