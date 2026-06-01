package com.alper.backend.news.service;

import com.rometools.rome.feed.synd.SyndEntry;
import com.rometools.rome.feed.synd.SyndFeed;
import com.rometools.rome.io.ParsingFeedException;
import com.rometools.rome.io.SyndFeedInput;
import com.rometools.rome.io.XmlReader;
import org.jdom2.Element;
import org.jdom2.input.SAXBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.FileNotFoundException;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Yapılandırılmış haber kaynakları için klasik RSS/Atom feed okuma servisi.
 *
 * <p>Rome kütüphanesi ile feed'leri ayrıştırır, başlık + {@value #PREVIEW_LENGTH}
 * karakterlik özetler üretir. {@link NewsService} tarafından toplama akışında çağrılır.</p>
 */
@Service
public class RssFeedService {

    private static final Logger log = LoggerFactory.getLogger(RssFeedService.class);
    private static final int PREVIEW_LENGTH = 180;
    private static final String RSS_ACCEPT_HEADER =
        "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.1";
    private static final String USER_AGENT = "finance-portal-rss-fetcher/1.0";

    public List<SyndEntry> fetchRssFeed(String feedUrl) {
        try {
            log.info("Fetching RSS feed: {}", feedUrl);
            URL url = URI.create(feedUrl).toURL();
            SyndFeedInput input = new SyndFeedInput();
            var connection = url.openConnection();
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(10000);
            connection.setRequestProperty("Accept", RSS_ACCEPT_HEADER);
            connection.setRequestProperty("User-Agent", USER_AGENT);

            String contentType = connection.getContentType();
            byte[] responseBody;
            try (var inputStream = connection.getInputStream()) {
                responseBody = inputStream.readAllBytes();
            }
            String preview = preview(responseBody);

            if (looksLikeHtml(contentType, preview)) {
                log.warn(
                    "Skipping non-RSS response from {} (contentType='{}', preview='{}')",
                    feedUrl, safe(contentType), preview
                );
                return List.of();
            }

            try (var reader = new XmlReader(new ByteArrayInputStream(responseBody))) {
                SyndFeed feed = input.build(reader);
                List<SyndEntry> entries = feed.getEntries();
                if (entries == null || entries.isEmpty()) {
                    log.warn("RSS parsed but no entries found: {} (contentType='{}')", feedUrl, safe(contentType));
                    return List.of();
                }
                enrichPlainItemImages(responseBody, entries);
                return entries;
            }
        } catch (ParsingFeedException e) {
            log.warn("RSS parse error for {}: {}", feedUrl, e.getMessage());
            log.debug("RSS parse stacktrace for {}", feedUrl, e);
            return List.of();
        } catch (FileNotFoundException e) {
            log.warn("RSS feed not found: {}", feedUrl);
            return List.of();
        } catch (Exception e) {
            log.error("Error fetching RSS feed: {}", feedUrl, e);
            return List.of();
        }
    }

    private void enrichPlainItemImages(byte[] responseBody, List<SyndEntry> entries) {
        Map<String, String> imagesByEntryKey = extractPlainItemImages(responseBody);
        if (imagesByEntryKey.isEmpty()) return;

        for (SyndEntry entry : entries) {
            String imageUrl = firstNonBlank(
                    imagesByEntryKey.get(key(entry.getLink())),
                    imagesByEntryKey.get(key(entry.getUri())),
                    imagesByEntryKey.get(key(entry.getTitle()))
            );
            if (imageUrl == null) continue;
            entry.getForeignMarkup().add(new Element("image").setText(imageUrl));
        }
    }

    private Map<String, String> extractPlainItemImages(byte[] responseBody) {
        try {
            SAXBuilder builder = safeSaxBuilder();
            var document = builder.build(new ByteArrayInputStream(responseBody));
            Element root = document.getRootElement();
            Element channel = root.getChild("channel");
            if (channel == null) return Map.of();

            Map<String, String> imagesByEntryKey = new HashMap<>();
            for (Element item : channel.getChildren("item")) {
                String imageUrl = text(item, "image");
                if (imageUrl == null) continue;
                putImage(imagesByEntryKey, item.getChildTextTrim("link"), imageUrl);
                putImage(imagesByEntryKey, item.getChildTextTrim("guid"), imageUrl);
                putImage(imagesByEntryKey, item.getChildTextTrim("title"), imageUrl);
            }
            return imagesByEntryKey;
        } catch (Exception e) {
            log.debug("Plain RSS item image extraction skipped: {}", e.getMessage());
            return Map.of();
        }
    }

    private SAXBuilder safeSaxBuilder() {
        SAXBuilder builder = new SAXBuilder();
        try {
            builder.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        } catch (Exception e) {
            log.debug("RSS parser secure doctype feature is not supported: {}", e.getMessage());
        }
        return builder;
    }

    private void putImage(Map<String, String> imagesByEntryKey, String key, String imageUrl) {
        String normalizedKey = key(key);
        if (normalizedKey != null) imagesByEntryKey.putIfAbsent(normalizedKey, imageUrl);
    }

    private String text(Element parent, String childName) {
        Element child = parent.getChild(childName);
        if (child == null) return null;
        String value = child.getTextNormalize();
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String key(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String firstNonBlank(String... values) {
        if (values == null) return null;
        for (String value : values) {
            if (value != null && !value.isBlank()) return value.trim();
        }
        return null;
    }

    private boolean looksLikeHtml(String contentType, String preview) {
        String contentTypeLower = safe(contentType).toLowerCase(Locale.ROOT);
        String previewLower = preview.toLowerCase(Locale.ROOT);
        if (contentTypeLower.contains("text/html")) {
            return true;
        }
        return previewLower.startsWith("<!doctype html")
            || previewLower.startsWith("<html")
            || previewLower.contains("<html");
    }

    private String preview(byte[] body) {
        if (body == null || body.length == 0) {
            return "";
        }
        String content = new String(body, StandardCharsets.UTF_8)
            .replaceAll("\\s+", " ")
            .trim();
        if (content.length() <= PREVIEW_LENGTH) {
            return content;
        }
        return content.substring(0, PREVIEW_LENGTH) + "...";
    }

    private String safe(String value) {
        return value == null ? "unknown" : value;
    }
}
