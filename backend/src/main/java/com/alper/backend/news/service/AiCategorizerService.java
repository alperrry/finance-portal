package com.alper.backend.news.service;

import com.alper.backend.news.model.Category;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Haber başlık/içeriklerini LLM (Groq) yardımıyla kategorilendiren servis.
 *
 * <p>Önce regex tabanlı hızlı eşleştirme dener; eşleşme bulunamazsa
 * {@link GroqApiService} üzerinden modelden kategori adı alır ve mevcut kategori
 * kümesine en yakın olanı seçer.</p>
 */
@Service
public class AiCategorizerService {

    private static final Logger log = LoggerFactory.getLogger(AiCategorizerService.class);
    private static final Pattern COMBINING_MARKS_PATTERN = Pattern.compile("\\p{M}+");
    private static final Pattern MULTI_SPACE_PATTERN = Pattern.compile("\\s+");

    private static final Map<String, String> CATEGORY_ALIASES = new LinkedHashMap<>();


    static {
        CATEGORY_ALIASES.put("enerji", "Emtia");
        CATEGORY_ALIASES.put("petrol", "Emtia");
        CATEGORY_ALIASES.put("dogalgaz", "Emtia");
        CATEGORY_ALIASES.put("commodities", "Emtia");
        CATEGORY_ALIASES.put("commodity", "Emtia");
        CATEGORY_ALIASES.put("emtia", "Emtia");

        CATEGORY_ALIASES.put("borsa", "Hisse");
        CATEGORY_ALIASES.put("hisse", "Hisse");
        CATEGORY_ALIASES.put("halka arz", "Hisse");
        CATEGORY_ALIASES.put("stock", "Hisse");
        CATEGORY_ALIASES.put("stocks", "Hisse");
        CATEGORY_ALIASES.put("equity", "Hisse");

        CATEGORY_ALIASES.put("doviz", "Döviz");
        CATEGORY_ALIASES.put("forex", "Döviz");
        CATEGORY_ALIASES.put("currency", "Döviz");
        CATEGORY_ALIASES.put("kur", "Döviz");

        CATEGORY_ALIASES.put("gold", "Altın");
        CATEGORY_ALIASES.put("silver", "Altın");
        CATEGORY_ALIASES.put("altin", "Altın");

        CATEGORY_ALIASES.put("kripto", "Kripto Para");
        CATEGORY_ALIASES.put("crypto", "Kripto Para");
        CATEGORY_ALIASES.put("cryptocurrency", "Kripto Para");
        CATEGORY_ALIASES.put("bitcoin", "Kripto Para");
        CATEGORY_ALIASES.put("ethereum", "Kripto Para");

        CATEGORY_ALIASES.put("tcmb", "TCMB");
        CATEGORY_ALIASES.put("central bank", "TCMB");
        CATEGORY_ALIASES.put("merkez bankasi", "TCMB");

        CATEGORY_ALIASES.put("tahvil", "Tahvil/Bono");
        CATEGORY_ALIASES.put("bono", "Tahvil/Bono");
        CATEGORY_ALIASES.put("bond", "Tahvil/Bono");
        CATEGORY_ALIASES.put("bonds", "Tahvil/Bono");
        CATEGORY_ALIASES.put("eurobond", "Tahvil/Bono");

        CATEGORY_ALIASES.put("politika", "Politika");
        CATEGORY_ALIASES.put("politics", "Politika");
        CATEGORY_ALIASES.put("siyaset", "Politika");

        CATEGORY_ALIASES.put("economy", "Genel Ekonomi");
        CATEGORY_ALIASES.put("macro", "Genel Ekonomi");
        CATEGORY_ALIASES.put("ekonomi", "Genel Ekonomi");
        CATEGORY_ALIASES.put("makro", "Genel Ekonomi");


    }

    private final GroqApiService groqApiService;
    private final CategoryService categoryService;

    public AiCategorizerService(GroqApiService groqApiService,
                                CategoryService categoryService) {
        this.groqApiService = groqApiService;
        this.categoryService = categoryService;
    }

    /**
     * Haber başlığı ve içeriğine göre kategori döner.
     * Aktif kategori listesi Redis cache üzerinden alınır.
     */
    public Category categorize(String title, String content) {
        List<Category> activeCategories = categoryService.getActiveCategoriesCached();
        if (activeCategories.isEmpty()) {
            log.warn("No active category found, AI categorization skipped");
            return null;
        }

        Optional<Category> rulesCategory = classifyWithoutAi(title, content, activeCategories);
        if (rulesCategory.isPresent()) {
            return rulesCategory.get();
        }

        List<String> categoryNames = activeCategories.stream()
                .map(Category::getName)
                .toList();

        String systemPrompt = buildSystemPrompt(categoryNames);
        String userMessage = buildUserMessage(title, content);

        String aiResponse = groqApiService.complete(systemPrompt, userMessage);

        if (aiResponse == null) {
            log.warn("AI cevabı boş geldi, fallback kategori kullanılıyor. title={}", title);
            return getFallbackCategory(activeCategories);
        }

        return matchCategory(aiResponse, activeCategories)
                .orElseGet(() -> {
                    log.warn("AI cevabı kategorilere eşleşmedi: '{}', title={}", aiResponse, title);
                    return getFallbackCategory(activeCategories);
                });
    }

    public Optional<Category> matchCategoryLabel(String categoryText, List<Category> categories) {
        if (categories == null || categories.isEmpty()) {
            return Optional.empty();
        }
        return matchCategory(categoryText, categories);
    }

    public Optional<Category> classifyWithoutAi(String title, String content, List<Category> categories) {
        if (categories == null || categories.isEmpty()) {
            return Optional.empty();
        }

        String normalizedText = normalize(joinNonBlank(title, content));
        if (normalizedText.isBlank()) {
            return Optional.empty();
        }

        Map<String, Category> categoriesByNormalizedName = buildCategoryIndex(categories);
        Optional<Category> aliasCategory = matchAliases(normalizedText, categoriesByNormalizedName);
        if (aliasCategory.isPresent()) {
            return aliasCategory;
        }

        return Optional.empty(); // ← bunu koy
    }

    public Category getFallbackCategoryFromCache() {
        return getFallbackCategory(categoryService.getActiveCategoriesCached());
    }

    /**
     * AI cevabını DB'deki kategorilerle eşleştirir.
     * Büyük/küçük harf, Türkçe karakter ve temel alias farklarını tolere eder.
     */
    private Optional<Category> matchCategory(String aiResponse, List<Category> categories) {
        String normalizedResponse = normalize(aiResponse);
        if (normalizedResponse.isEmpty()) {
            return Optional.empty();
        }

        Map<String, Category> categoriesByNormalizedName = buildCategoryIndex(categories);

        Category exactMatch = categoriesByNormalizedName.get(normalizedResponse);
        if (exactMatch != null) {
            return Optional.of(exactMatch);
        }

        Optional<Category> aliased = matchAliases(normalizedResponse, categoriesByNormalizedName);
        if (aliased.isPresent()) {
            return aliased;
        }

        for (Map.Entry<String, Category> categoryEntry : categoriesByNormalizedName.entrySet()) {
            String normalizedCategoryName = categoryEntry.getKey();
            if (!normalizedCategoryName.isEmpty() && normalizedResponse.contains(normalizedCategoryName)) {
                return Optional.of(categoryEntry.getValue());
            }
        }

        return Optional.empty();
    }

    private String buildSystemPrompt(List<String> categoryNames) {
        return """
            Sen bir Türk finans haberleri sınıflandırma asistanısın.
            Sana verilen haber başlığı ve özetini analiz et.
            Aşağıdaki kategorilerden SADECE BİRİNİ seç.
            Cevabında sadece kategori adını yaz.
            Kategori adı listede yoksa en yakın olanı seç.
            Başka hiçbir şey yazma, açıklama yapma.

            Kategoriler: %s
            """.formatted(String.join(", ", categoryNames));
    }

    private String buildUserMessage(String title, String content) {
        String trimmedContent = content != null && content.length() > 300
                ? content.substring(0, 300)
                : (content != null ? content : "");

        return "Başlık: %s\nİçerik: %s".formatted(title, trimmedContent);
    }

    private Category getFallbackCategory(List<Category> categories) {
        return categories.stream()
                .filter(c -> c.getName().equalsIgnoreCase("Diğer"))
                .findFirst()
                .orElseGet(() -> {
                    if (!categories.isEmpty()) {
                        log.warn("Fallback category 'Diğer' not found, using first active category");
                        return categories.getFirst();
                    }
                    log.warn("No active category found, AI categorization fallback is null");
                    return null;
                });
    }

    private Map<String, Category> buildCategoryIndex(List<Category> categories) {
        Map<String, Category> categoriesByNormalizedName = new LinkedHashMap<>();
        for (Category category : categories) {
            categoriesByNormalizedName.putIfAbsent(normalize(category.getName()), category);
        }
        return categoriesByNormalizedName;
    }

    private Optional<Category> matchAliases(String normalizedText, Map<String, Category> categoriesByNormalizedName) {
        for (Map.Entry<String, String> aliasEntry : CATEGORY_ALIASES.entrySet()) {
            String alias = normalize(aliasEntry.getKey());
            if (!alias.isEmpty() && containsToken(normalizedText, alias)) {
                Category aliasedCategory = categoriesByNormalizedName.get(normalize(aliasEntry.getValue()));
                if (aliasedCategory != null) {
                    return Optional.of(aliasedCategory);
                }
            }
        }
        return Optional.empty();
    }



    private boolean containsToken(String normalizedText, String normalizedKeyword) {
        if (normalizedText == null || normalizedText.isBlank() || normalizedKeyword == null || normalizedKeyword.isBlank()) {
            return false;
        }

        if (normalizedKeyword.contains(" ")) {
            return normalizedText.contains(normalizedKeyword);
        }

        Pattern tokenPattern = Pattern.compile("\\b" + Pattern.quote(normalizedKeyword) + "\\b");
        return tokenPattern.matcher(normalizedText).find();
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

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        String lowered = value.toLowerCase(Locale.ROOT)
                .replace('ı', 'i')
                .replace('İ', 'i');
        String decomposed = Normalizer.normalize(lowered, Normalizer.Form.NFKD);
        String withoutMarks = COMBINING_MARKS_PATTERN.matcher(decomposed).replaceAll("");
        return MULTI_SPACE_PATTERN.matcher(withoutMarks).replaceAll(" ").trim();
    }
}
