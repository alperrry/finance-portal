package com.alper.backend.news.service;

import com.alper.backend.news.dto.GoogleNewsRssItemResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.InputStream;
import java.net.URI;
import java.net.URLConnection;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Google News RSS arama uç noktasından sorgu bazlı haber listesi çeken servis.
 *
 * <p>{@code RssFeedService} ile aynı çıktıyı üretir ama kaynak olarak Google'ın
 * dinamik RSS aramasını kullanır; sorgular Rome kütüphanesi ile ayrıştırılır.</p>
 */
@Slf4j
@Service
public class GoogleNewsRssService {

    private static final String GOOGLE_NEWS_RSS_URL = "https://news.google.com/rss/search";
    private static final String RSS_ACCEPT_HEADER =
            "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.1";
    private static final String USER_AGENT = "finance-portal-google-news/1.0";
    private static final DateTimeFormatter PUB_DATE_FORMATTER = DateTimeFormatter.RFC_1123_DATE_TIME;

    public List<GoogleNewsRssItemResponse> search(String query, String hl, String gl, String ceid, int limit) {
        String url = UriComponentsBuilder.fromUriString(GOOGLE_NEWS_RSS_URL)
                .queryParam("q", query)
                .queryParam("hl", hl)
                .queryParam("gl", gl)
                .queryParam("ceid", ceid)
                .encode()
                .build()
                .toUriString();

        try {
            URLConnection connection = URI.create(url).toURL().openConnection();
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(10000);
            connection.setRequestProperty("Accept", RSS_ACCEPT_HEADER);
            connection.setRequestProperty("User-Agent", USER_AGENT);

            try (InputStream inputStream = connection.getInputStream()) {
                DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
                factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
                factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
                factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
                factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
                factory.setExpandEntityReferences(false);
                factory.setNamespaceAware(false);

                Document document = factory.newDocumentBuilder().parse(inputStream);
                document.getDocumentElement().normalize();

                NodeList itemNodes = document.getElementsByTagName("item");
                List<GoogleNewsRssItemResponse> items = new ArrayList<>();

                for (int index = 0; index < itemNodes.getLength() && items.size() < limit; index += 1) {
                    Node node = itemNodes.item(index);
                    if (!(node instanceof Element element)) {
                        continue;
                    }

                    String title = childText(element, "title");
                    String link = childText(element, "link");
                    OffsetDateTime publishedAt = parsePublishedAt(childText(element, "pubDate"));

                    Element sourceElement = childElement(element, "source");
                    String sourceName = sourceElement == null ? null : normalize(sourceElement.getTextContent());
                    String sourceUrl = sourceElement == null ? null : normalize(sourceElement.getAttribute("url"));

                    if (title == null || link == null) {
                        continue;
                    }

                    items.add(new GoogleNewsRssItemResponse(
                            title,
                            buildDescription(title, sourceName),
                            link,
                            publishedAt,
                            sourceName,
                            sourceUrl
                    ));
                }

                return items;
            }
        } catch (Exception exception) {
            log.warn("Google News RSS fetch failed for query '{}': {}", query, exception.getMessage());
            return List.of();
        }
    }

    private String buildDescription(String title, String sourceName) {
        if (sourceName == null || sourceName.isBlank()) {
            return title;
        }
        return sourceName + " kaynagi uzerinden listelendi.";
    }

    private OffsetDateTime parsePublishedAt(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        try {
            return OffsetDateTime.parse(value, PUB_DATE_FORMATTER).withOffsetSameInstant(ZoneOffset.UTC);
        } catch (Exception exception) {
            return null;
        }
    }

    private Element childElement(Element parent, String tagName) {
        NodeList children = parent.getElementsByTagName(tagName);
        if (children.getLength() == 0) {
            return null;
        }

        Node node = children.item(0);
        return node instanceof Element element ? element : null;
    }

    private String childText(Element parent, String tagName) {
        Element child = childElement(parent, tagName);
        return child == null ? null : normalize(child.getTextContent());
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
