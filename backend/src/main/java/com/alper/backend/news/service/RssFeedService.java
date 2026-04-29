package com.alper.backend.news.service;

import com.rometools.rome.feed.synd.SyndEntry;
import com.rometools.rome.feed.synd.SyndFeed;
import com.rometools.rome.io.ParsingFeedException;
import com.rometools.rome.io.SyndFeedInput;
import com.rometools.rome.io.XmlReader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;

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
                return entries;
            }
        } catch (ParsingFeedException e) {
            log.warn("RSS parse error for {}: {}", feedUrl, e.getMessage());
            log.debug("RSS parse stacktrace for {}", feedUrl, e);
            return List.of();
        } catch (Exception e) {
            log.error("Error fetching RSS feed: {}", feedUrl, e);
            return List.of();
        }
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
