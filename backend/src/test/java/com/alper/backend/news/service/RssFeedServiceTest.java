package com.alper.backend.news.service;

import com.rometools.rome.feed.synd.SyndEntry;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RssFeedServiceTest {

    private final RssFeedService service = new RssFeedService();

    @Test
    void fetchRssFeedKeepsPlainItemImageAsForeignMarkup() throws Exception {
        try (MockWebServer server = new MockWebServer()) {
            server.enqueue(new MockResponse()
                    .setHeader("Content-Type", "application/rss+xml; charset=utf-8")
                    .setBody("""
                            <?xml version="1.0" encoding="utf-8"?>
                            <rss version="2.0">
                              <channel>
                                <title>BloombergHT.COM</title>
                                <item>
                                  <title><![CDATA[UBS de Fed beklentisini oteledi]]></title>
                                  <description><![CDATA[Finans haber ozeti]]></description>
                                  <pubDate><![CDATA[Wed, 13 May 2026 08:20:30 +0000]]></pubDate>
                                  <image><![CDATA[https://geoim.bloomberght.com/2026/05/13/ver1778660430/3777477_kutu.jpg]]></image>
                                  <link><![CDATA[https://www.bloomberght.com/ubs-de-fed-beklentisini-oteledi-3777477]]></link>
                                  <guid><![CDATA[https://www.bloomberght.com/ubs-de-fed-beklentisini-oteledi-3777477]]></guid>
                                </item>
                              </channel>
                            </rss>
                            """));

            List<SyndEntry> entries = service.fetchRssFeed(server.url("/rss").toString());

            assertThat(entries).hasSize(1);
            assertThat(entries.getFirst().getForeignMarkup())
                    .anySatisfy(element -> {
                        assertThat(element.getName()).isEqualTo("image");
                        assertThat(element.getTextNormalize())
                                .isEqualTo("https://geoim.bloomberght.com/2026/05/13/ver1778660430/3777477_kutu.jpg");
                    });
        }
    }

    @Test
    void fetchRssFeedTreatsNotFoundAsEmptyFeed() throws Exception {
        try (MockWebServer server = new MockWebServer()) {
            server.enqueue(new MockResponse().setResponseCode(404));

            List<SyndEntry> entries = service.fetchRssFeed(server.url("/missing").toString());

            assertThat(entries).isEmpty();
        }
    }
}
