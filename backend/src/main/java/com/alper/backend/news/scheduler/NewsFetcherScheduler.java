package com.alper.backend.news.scheduler;

import com.alper.backend.common.exception.ErrorCode;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.news.config.NewsFetcherProperties;
import com.alper.backend.news.event.NewsPublishedEvent;
import com.alper.backend.news.model.Category;
import com.alper.backend.news.model.News;
import com.alper.backend.news.model.Source;
import com.alper.backend.news.repository.NewsRepository;
import com.alper.backend.news.repository.SourceRepository;
import com.alper.backend.news.service.AiCategorizerService;
import com.alper.backend.news.service.CategoryService;
import com.alper.backend.news.service.NewsApiService;
import com.alper.backend.news.service.RssFeedService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rometools.rome.feed.synd.SyndEnclosure;
import com.rometools.rome.feed.synd.SyndEntry;
import org.jdom2.Element;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

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
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Haberleri NewsAPI ve RSS kaynaklarından periyodik olarak çekip kaydeden zamanlayıcı.
 *
 * <p>Çekilen içerikler anahtar kelime filtresinden geçirilir, gerekirse yapay zeka
 * destekli kategorizasyona ({@link AiCategorizerService}) gönderilir; AI çağrıları
 * koşu başına bütçeyle sınırlandırılır. Yeni kayıt oluştuğunda haber önbelleği
 * temizlenir ve {@link com.alper.backend.news.event.NewsPublishedEvent} yayınlanır.
 * Admin panelinden manuel tetikleme de desteklenir.</p>
 *
 * <p>{@code news.fetcher.enabled=false} ile bileşen tamamen devre dışı bırakılabilir.</p>
 */
@Component
@ConditionalOnProperty(name = "news.fetcher.enabled", havingValue = "true", matchIfMissing = true)
public class NewsFetcherScheduler {

    private static final Logger log = LoggerFactory.getLogger(NewsFetcherScheduler.class);
    private static final String DEFAULT_API_SOURCE_NAME = "NewsAPI.org API";
    private static final String DEFAULT_API_SOURCE_URL = "newsapi-org-api";
    private static final DateTimeFormatter[] LOCAL_DATE_TIME_FORMATTERS = new DateTimeFormatter[]{
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
    };
    private static final Pattern COMBINING_MARKS_PATTERN = Pattern.compile("\\p{M}+");
    private static final Pattern IMG_SRC_PATTERN = Pattern.compile(
            "<img\\b[^>]*\\bsrc\\s*=\\s*([\"'])(.*?)\\1",
            Pattern.CASE_INSENSITIVE | Pattern.DOTALL
    );
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
    private final NewsRepository newsRepository;
    private final NewsApiService newsApiService;
    private final RssFeedService rssFeedService;
    private final AiCategorizerService aiCategorizerService;
    private final CategoryService categoryService;
    private final NewsFetcherProperties fetcherProperties;
    private final CacheManager cacheManager;
    private final ApplicationEventPublisher eventPublisher;
    private final TransactionTemplate transactionTemplate;
    private final ObjectMapper objectMapper;

    public NewsFetcherScheduler(SourceRepository sourceRepository,
                                NewsRepository newsRepository,
                                NewsApiService newsApiService,
                                RssFeedService rssFeedService,
                                AiCategorizerService aiCategorizerService,
                                CategoryService categoryService,
                                NewsFetcherProperties fetcherProperties,
                                CacheManager cacheManager,
                                ApplicationEventPublisher eventPublisher,
                                PlatformTransactionManager transactionManager) {
        this.sourceRepository = sourceRepository;
        this.newsRepository = newsRepository;
        this.newsApiService = newsApiService;
        this.rssFeedService = rssFeedService;
        this.aiCategorizerService = aiCategorizerService;
        this.categoryService = categoryService;
        this.fetcherProperties = fetcherProperties;
        this.cacheManager = cacheManager;
        this.eventPublisher = eventPublisher;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.objectMapper = new ObjectMapper();
    }

    // =========================================================================
    // Scheduled
    // =========================================================================

    /**
     * Tüm aktif kaynaklardan (API + RSS) haberleri çeker, kaydeder ve yayın
     * olayını fırlatır. Tek bir kaynaktaki hata diğer kaynakları engellemez.
     */
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

        // 1) Yavaş uzak kaynak çağrıları (API + RSS) transaction DIŞINDA yapılır;
        //    böylece HTTP I/O boyunca bir DB bağlantısı havuzdan tutulmaz.
        String apiResponse = fetchApiResponseSafely();
        List<SourceFeed> sourceFeeds = fetchActiveSourceFeeds();

        // 2) Çekilen içerik kısa ömürlü tek bir transaction içinde kalıcılaştırılır.
        transactionTemplate.executeWithoutResult(status ->
                persistFetchedNews(apiResponse, sourceFeeds));

        log.info("News fetch job completed");
    }

    // =========================================================================
    // Manuel tetikleme (Admin tarafından çağrılır)
    // =========================================================================

    /** Admin tarafından manuel tetikleme: tüm kaynaklardan haber çeker. */
    public void fetchAllSources() {
        log.info("Manuel haber çekimi tetiklendi: tüm kaynaklar");
        fetchNews();
    }

    /**
     * Admin tarafından manuel tetikleme: tek bir kaynaktan haber çeker.
     *
     * @param sourceId haber kaynağının kimliği
     * @throws com.alper.backend.common.exception.NotFoundException kaynak bulunamazsa
     */
    public void fetchForSource(Long sourceId) {
        Source source = sourceRepository.findById(sourceId)
                .orElseThrow(() -> new NotFoundException(ErrorCode.NOT_FOUND, "Kaynak bulunamadı: " + sourceId));

        log.info("Manuel haber çekimi tetiklendi | sourceId={}, name={}", sourceId, source.getName());

        // RSS/HTTP çekimi transaction dışında yapılır.
        List<SyndEntry> entries = fetchSourceEntries(source);

        transactionTemplate.executeWithoutResult(status -> {
            AiCallBudget aiCallBudget = new AiCallBudget(Math.max(0, fetcherProperties.getAiMaxCallsPerRun()));
            List<News> savedNewsList = new ArrayList<>();

            int savedCount = persistRssEntries(source, entries, aiCallBudget, savedNewsList);

            if (savedCount > 0) {
                evictNewsListCache();
                publishNewsPublishedEvent(savedNewsList);
                log.info("Manuel haber çekimi tamamlandı | sourceId={}, kayıt={}", sourceId, savedCount);
            } else {
                log.info("Manuel haber çekimi tamamlandı, yeni kayıt yok | sourceId={}", sourceId);
            }
        });
    }

    // =========================================================================
    // Private metodlar
    // =========================================================================

    /** API sağlayıcısından ham yanıtı çeker; hata olursa null döner (transaction dışı). */
    private String fetchApiResponseSafely() {
        try {
            log.info("Fetching news directly from API provider");
            return newsApiService.fetchAllNews();
        } catch (Exception e) {
            log.error("Error fetching from API provider", e);
            return null;
        }
    }

    /** Aktif kaynakların RSS içeriklerini transaction dışında çeker. */
    private List<SourceFeed> fetchActiveSourceFeeds() {
        List<Source> activeSources = sourceRepository.findByIsActiveTrue();
        if (activeSources.isEmpty()) {
            return List.of();
        }
        log.info("Found {} active sources", activeSources.size());
        List<SourceFeed> feeds = new ArrayList<>();
        for (Source source : activeSources) {
            try {
                feeds.add(new SourceFeed(source, fetchSourceEntries(source)));
            } catch (Exception e) {
                log.error("Error fetching news from source: {}", source.getName(), e);
            }
        }
        return feeds;
    }

    /** Tek bir kaynağın RSS girdilerini döner; kalıcılaştırma yapmaz (transaction dışı). */
    private List<SyndEntry> fetchSourceEntries(Source source) {
        String sourceUrl = source.getSourceUrl();
        if (sourceUrl.startsWith("http://") || sourceUrl.startsWith("https://")) {
            log.info("Fetching RSS from: {}", source.getName());
            return rssFeedService.fetchRssFeed(source.getSourceUrl());
        }
        log.warn("Unknown source type: {}, skipping", sourceUrl);
        return List.of();
    }

    /** Önceden çekilmiş API + RSS içeriğini tek bir transaction içinde kalıcılaştırır. */
    private void persistFetchedNews(String apiResponse, List<SourceFeed> sourceFeeds) {
        int savedNewsCount = 0;
        List<News> savedNewsList = new ArrayList<>();
        AiCallBudget aiCallBudget = new AiCallBudget(Math.max(0, fetcherProperties.getAiMaxCallsPerRun()));

        try {
            savedNewsCount += persistApiArticles(apiResponse, aiCallBudget, savedNewsList);
        } catch (Exception e) {
            log.error("Error processing API provider response", e);
        }

        for (SourceFeed feed : sourceFeeds) {
            try {
                savedNewsCount += persistRssEntries(feed.source(), feed.entries(), aiCallBudget, savedNewsList);
            } catch (Exception e) {
                log.error("Error processing news from source: {}", feed.source().getName(), e);
            }
        }

        if (savedNewsCount > 0) {
            evictNewsListCache();
            publishNewsPublishedEvent(savedNewsList);
            log.info("News cache evicted after {} new/updated records", savedNewsCount);
        }
    }

    private int persistApiArticles(String response, AiCallBudget aiCallBudget, List<News> savedNewsList) {
        if (response == null) {
            log.warn("No response from API provider");
            return 0;
        }
        try {
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
                    if (url == null || url.isBlank()) continue;
                    String title = readTextField(article, "title");
                    if (title == null || title.isBlank()) continue;
                    String context = readTextField(article, "description", "content");
                    Set<String> incomingCategoryLabels = extractApiCategoryLabels(article);
                    if (shouldSkipAsNonFinance(title, context, incomingCategoryLabels)) continue;
                    String externalId = normalizeExternalId(readNestedTextField(article));
                    if (externalId == null) externalId = normalizeExternalId(url);
                    if (isDuplicate(defaultSource.getId(), url, externalId)) continue;
                    News news = new News();
                    news.setTitle(title);
                    news.setContext(context);
                    news.setCanonicalUrl(url);
                    news.setSource(defaultSource);
                    news.setExternalId(externalId);
                    news.setImageUrl(resolveApiImageUrl(article));
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
            log.error("Error processing API provider response", e);
            return 0;
        }
    }

    private int persistRssEntries(Source source, List<SyndEntry> entries, AiCallBudget aiCallBudget, List<News> savedNewsList) {
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
                if (link == null || link.isBlank()) continue;
                if (title == null || title.isBlank()) continue;
                String context = entry.getDescription() != null ? entry.getDescription().getValue() : null;
                Set<String> incomingCategoryLabels = extractRssCategoryLabels(entry);
                if (shouldSkipAsNonFinance(title, context, incomingCategoryLabels)) continue;
                var existingByUrl = newsRepository.findByCanonicalUrl(link);
                if (existingByUrl.isPresent()) {
                    News existing = existingByUrl.get();
                    if (updateExistingRssNews(existing, publishedDate, entry, context)) {
                        News savedExisting = newsRepository.save(existing);
                        savedNewsList.add(savedExisting);
                        savedCount++;
                    }
                    continue;
                }
                // URL'in mevcut olmadığı yukarıda doğrulandı; sadece external-id ile tekillik kontrolü yeterli.
                if (isDuplicateByExternalId(source.getId(), normalizeExternalId(uri))) continue;
                News news = new News();
                news.setTitle(title);
                news.setContext(context);
                news.setCanonicalUrl(link);
                news.setExternalId(normalizeExternalId(uri));
                news.setImageUrl(resolveRssImageUrl(entry, context));
                news.setSource(source);
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

    private boolean updateExistingRssNews(News existing, Date publishedDate, SyndEntry entry, String context) {
        boolean changed = false;
        if (existing.getPublishedAt() == null && publishedDate != null) {
            existing.setPublishedAt(OffsetDateTime.ofInstant(publishedDate.toInstant(), ZoneId.systemDefault()));
            changed = true;
        }
        if ((existing.getImageUrl() == null || existing.getImageUrl().isBlank())) {
            String imageUrl = resolveRssImageUrl(entry, context);
            if (imageUrl != null) {
                existing.setImageUrl(imageUrl);
                changed = true;
            }
        }
        return changed;
    }

    private boolean isDuplicate(Long sourceId, String canonicalUrl, String externalId) {
        if (newsRepository.existsByCanonicalUrl(canonicalUrl)) return true;
        return isDuplicateByExternalId(sourceId, externalId);
    }

    private boolean isDuplicateByExternalId(Long sourceId, String externalId) {
        return sourceId != null && externalId != null
                && newsRepository.findBySourceIdAndExternalId(sourceId, externalId).isPresent();
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
        if (root == null || root.isNull()) return null;
        JsonNode newsApiArticles = root.get("articles");
        if (newsApiArticles != null && newsApiArticles.isArray()) return newsApiArticles;
        return null;
    }

    private String readTextField(JsonNode node, String... fieldNames) {
        if (node == null || fieldNames == null) return null;
        for (String fieldName : fieldNames) {
            JsonNode valueNode = node.get(fieldName);
            if (valueNode != null && valueNode.isTextual()) {
                String value = valueNode.asText();
                if (value != null && !value.isBlank()) return value.trim();
            }
        }
        return null;
    }

    private String readNestedTextField(JsonNode node) {
        if (node == null) return null;
        JsonNode parentNode = node.get("source");
        if (parentNode == null || parentNode.isNull()) return null;
        return readTextField(parentNode, "id");
    }

    private String resolveApiImageUrl(JsonNode article) {
        return normalizeImageUrl(readTextField(article, "urlToImage", "imageUrl", "image"));
    }

    private String resolveRssImageUrl(SyndEntry entry, String context) {
        String fromForeignMarkup = resolveRssMediaImageUrl(entry);
        if (fromForeignMarkup != null) return fromForeignMarkup;

        String fromItemImage = resolveRssItemImageUrl(entry);
        if (fromItemImage != null) return fromItemImage;

        String fromEnclosure = resolveRssEnclosureImageUrl(entry);
        if (fromEnclosure != null) return fromEnclosure;

        return extractImageFromHtml(context);
    }

    private String resolveRssMediaImageUrl(SyndEntry entry) {
        if (entry == null || entry.getForeignMarkup() == null) return null;
        for (Element element : entry.getForeignMarkup()) {
            String imageUrl = resolveMediaElementImageUrl(element);
            if (imageUrl != null) return imageUrl;
        }
        return null;
    }

    private String resolveMediaElementImageUrl(Element element) {
        if (element == null) return null;
        String name = element.getName();
        String namespaceUri = element.getNamespaceURI();
        boolean mediaElement = "http://search.yahoo.com/mrss/".equals(namespaceUri)
                && ("content".equalsIgnoreCase(name) || "thumbnail".equalsIgnoreCase(name));
        if (mediaElement) {
            String imageUrl = normalizeImageUrl(element.getAttributeValue("url"));
            if (imageUrl != null) return imageUrl;
        }
        for (Element child : element.getChildren()) {
            String imageUrl = resolveMediaElementImageUrl(child);
            if (imageUrl != null) return imageUrl;
        }
        return null;
    }

    private String resolveRssItemImageUrl(SyndEntry entry) {
        if (entry == null || entry.getForeignMarkup() == null) return null;
        for (Element element : entry.getForeignMarkup()) {
            String imageUrl = resolveItemImageElementUrl(element);
            if (imageUrl != null) return imageUrl;
        }
        return null;
    }

    private String resolveItemImageElementUrl(Element element) {
        if (element == null) return null;
        if ("image".equalsIgnoreCase(element.getName())) {
            String imageUrl = normalizeImageUrl(element.getTextNormalize());
            if (imageUrl != null) return imageUrl;
        }
        for (Element child : element.getChildren()) {
            String imageUrl = resolveItemImageElementUrl(child);
            if (imageUrl != null) return imageUrl;
        }
        return null;
    }

    private String resolveRssEnclosureImageUrl(SyndEntry entry) {
        if (entry == null || entry.getEnclosures() == null) return null;
        for (SyndEnclosure enclosure : entry.getEnclosures()) {
            String type = enclosure.getType();
            if (type != null && type.toLowerCase(Locale.ROOT).startsWith("image/")) {
                String imageUrl = normalizeImageUrl(enclosure.getUrl());
                if (imageUrl != null) return imageUrl;
            }
        }
        return null;
    }

    private String extractImageFromHtml(String html) {
        if (html == null || html.isBlank()) return null;
        Matcher matcher = IMG_SRC_PATTERN.matcher(html);
        if (!matcher.find()) return null;
        return normalizeImageUrl(matcher.group(2));
    }

    private String normalizeImageUrl(String value) {
        if (value == null || value.isBlank()) return null;
        String trimmed = value.trim();
        if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return null;
        return trimmed;
    }

    private OffsetDateTime parsePublishedAt(JsonNode article) {
        String publishedAt = readTextField(article, "publishedAt", "published_at", "pubDate");
        if (publishedAt == null) return null;
        try {
            return OffsetDateTime.parse(publishedAt);
        } catch (DateTimeParseException ignored) {
        }
        String timeZone = readTextField(article, "pubDateTZ");
        ZoneId zoneId = parseZoneId(timeZone);
        for (DateTimeFormatter formatter : LOCAL_DATE_TIME_FORMATTERS) {
            try {
                return LocalDateTime.parse(publishedAt, formatter).atZone(zoneId).toOffsetDateTime();
            } catch (DateTimeParseException ignored) {
            }
        }
        log.debug("Unable to parse published date from provider: {}", publishedAt);
        return null;
    }

    private ZoneId parseZoneId(String zoneText) {
        if (zoneText == null || zoneText.isBlank()) return ZoneId.systemDefault();
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
        if (externalId == null) return null;
        String trimmed = externalId.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Set<Category> enrichNews(News news, Set<String> incomingCategoryLabels, AiCallBudget aiCallBudget) {
        Set<Category> matchedCategories = mapIncomingCategories(incomingCategoryLabels);
        if (matchedCategories.isEmpty()) {
            List<Category> activeCategories = categoryService.getActiveCategoriesCached();
            Optional<Category> localCategory = aiCategorizerService.classifyWithoutAi(news.getTitle(), news.getContext(), activeCategories);
            if (localCategory.isPresent()) {
                matchedCategories = new LinkedHashSet<>();
                matchedCategories.add(localCategory.get());
            }
        }
        if (matchedCategories.isEmpty()) {
            if (aiCallBudget.consumeOne()) {
                Category aiCategory = aiCategorizerService.categorize(news.getTitle(), news.getContext());
                if (aiCategory != null && aiCategory.getId() != null) {
                    matchedCategories = new LinkedHashSet<>();
                    matchedCategories.add(aiCategory);
                }
            } else {
                if (aiCallBudget.logExhaustedOnce()) {
                    log.warn("AI categorization budget exhausted for this job (max {})", aiCallBudget.initialBudget());
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
        if (incomingCategoryLabels == null || incomingCategoryLabels.isEmpty()) return Set.of();
        List<Category> activeCategories = categoryService.getActiveCategoriesCached();
        if (activeCategories.isEmpty()) return Set.of();
        Set<Category> matched = new LinkedHashSet<>();
        for (String label : incomingCategoryLabels) {
            if (label == null || label.isBlank()) continue;
            aiCategorizerService.matchCategoryLabel(label, activeCategories).ifPresent(matched::add);
        }
        return matched;
    }

    private boolean shouldSkipAsNonFinance(String title, String context, Set<String> incomingCategoryLabels) {
        if (!fetcherProperties.isFilterNonFinance()) return false;
        return !isFinanceRelated(title, context, incomingCategoryLabels);
    }

    private boolean isFinanceRelated(String title, String context, Set<String> incomingCategoryLabels) {
        String normalizedText = normalize(joinNonBlank(title, context));
        if (normalizedText.isBlank()) return false;
        if (containsAnyKeyword(normalizedText, FINANCE_KEYWORDS)) return true;
        if (incomingCategoryLabels != null && !incomingCategoryLabels.isEmpty()) {
            for (String label : incomingCategoryLabels) {
                if (containsAnyKeyword(normalize(label), FINANCE_KEYWORDS)) return true;
            }
        }
        if (containsAnyKeyword(normalizedText, NON_FINANCE_KEYWORDS)) return false;
        return false;

    }

    private boolean containsAnyKeyword(String text, Set<String> keywords) {
        if (text == null || text.isBlank() || keywords == null || keywords.isEmpty()) return false;
        for (String keyword : keywords) {
            if (keyword != null && !keyword.isBlank() && text.contains(keyword)) return true;
        }
        return false;
    }

    private String joinNonBlank(String first, String second) {
        String f = first == null ? "" : first.trim();
        String s = second == null ? "" : second.trim();
        if (f.isEmpty()) return s;
        if (s.isEmpty()) return f;
        return f + " " + s;
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
        if (entry.getCategories() == null) return labels;
        for (var category : entry.getCategories()) {
            if (category != null) addRawLabel(labels, category.getName());
        }
        return labels;
    }

    private void addNodeLabels(Set<String> labels, JsonNode node) {
        if (node == null || node.isNull()) return;
        if (node.isArray()) {
            for (JsonNode element : node) addNodeLabels(labels, element);
            return;
        }
        if (node.isTextual()) addRawLabel(labels, node.asText());
    }

    private void addRawLabel(Set<String> labels, String rawValue) {
        if (rawValue == null || rawValue.isBlank()) return;
        for (String part : rawValue.split("[,;/|]")) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) labels.add(trimmed);
        }
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) return "";
        String lowered = value.toLowerCase(Locale.ROOT).replace('ı', 'i');
        String decomposed = Normalizer.normalize(lowered, Normalizer.Form.NFKD);
        return COMBINING_MARKS_PATTERN.matcher(decomposed).replaceAll("").replaceAll("\\s+", " ").trim();
    }

    private void logSaved(String sourceLabel, News news, Set<Category> matchedCategories) {
        log.debug("Saved news from {}: {} (Categories: {})",
                sourceLabel, news.getTitle(),
                matchedCategories.stream().map(Category::getName).toList());
    }

    private void evictNewsListCache() {
        clearCache("newsList");
        clearCache("newsListV2");
        clearCache("newsListV3");
    }

    private void publishNewsPublishedEvent(List<News> savedNewsList) {
        List<Long> publishedNewsIds = savedNewsList.stream()
                .map(News::getId).filter(Objects::nonNull).toList();
        List<Long> affectedCategoryIds = savedNewsList.stream()
                .flatMap(news -> news.getCategories().stream())
                .map(Category::getId).filter(Objects::nonNull).distinct().toList();
        if (!publishedNewsIds.isEmpty()) {
            eventPublisher.publishEvent(NewsPublishedEvent.of(publishedNewsIds, affectedCategoryIds));
        }
    }

    private void clearCache(String cacheName) {
        Cache cache = cacheManager.getCache(cacheName);
        if (cache != null) cache.clear();
    }

    /** Bir kaynak ile o kaynaktan transaction dışında çekilmiş RSS girdilerini taşır. */
    private record SourceFeed(Source source, List<SyndEntry> entries) {}

    private static final class AiCallBudget {
        private final int initialBudget;
        private int remaining;
        private boolean exhaustedLogged;

        private AiCallBudget(int initialBudget) {
            this.initialBudget = Math.max(0, initialBudget);
            this.remaining = this.initialBudget;
        }

        private boolean consumeOne() {
            if (remaining <= 0) return false;
            remaining--;
            return true;
        }

        private int initialBudget() {
            return initialBudget;
        }

        private boolean logExhaustedOnce() {
            if (exhaustedLogged) return false;
            exhaustedLogged = true;
            return true;
        }
    }
}
