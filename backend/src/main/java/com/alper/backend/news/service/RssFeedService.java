package com.alper.backend.news.service;

import com.rometools.rome.feed.synd.SyndEntry;
import com.rometools.rome.feed.synd.SyndFeed;
import com.rometools.rome.io.SyndFeedInput;
import com.rometools.rome.io.XmlReader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URL;
import java.util.List;

@Service
public class RssFeedService {

    private static final Logger log = LoggerFactory.getLogger(RssFeedService.class);

    public List<SyndEntry> fetchRssFeed(String feedUrl) {
        try {
            log.info("Fetching RSS feed: {}", feedUrl);
            URL url = new URL(feedUrl);
            SyndFeedInput input = new SyndFeedInput();
            SyndFeed feed = input.build(new XmlReader(url));
            return feed.getEntries();
        } catch (Exception e) {
            log.error("Error fetching RSS feed: {}", feedUrl, e);
            return List.of();
        }
    }
}
