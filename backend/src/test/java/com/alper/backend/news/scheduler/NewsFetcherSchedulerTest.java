package com.alper.backend.news.scheduler;

import com.alper.backend.news.config.NewsFetcherProperties;
import com.alper.backend.news.model.News;
import com.alper.backend.news.model.Source;
import com.alper.backend.news.repository.NewsRepository;
import com.alper.backend.news.repository.SourceRepository;
import com.alper.backend.news.service.AiCategorizerService;
import com.alper.backend.news.service.CategoryService;
import com.alper.backend.news.service.NewsApiService;
import com.alper.backend.news.service.RssFeedService;
import com.rometools.rome.feed.synd.SyndContentImpl;
import com.rometools.rome.feed.synd.SyndEntry;
import com.rometools.rome.feed.synd.SyndEntryImpl;
import org.jdom2.Element;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.CacheManager;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.PlatformTransactionManager;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NewsFetcherSchedulerTest {

    @Mock
    private SourceRepository sourceRepository;

    @Mock
    private NewsRepository newsRepository;

    @Mock
    private NewsApiService newsApiService;

    @Mock
    private RssFeedService rssFeedService;

    @Mock
    private AiCategorizerService aiCategorizerService;

    @Mock
    private CategoryService categoryService;

    @Mock
    private CacheManager cacheManager;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private PlatformTransactionManager transactionManager;

    private NewsFetcherScheduler scheduler;
    private Source source;

    @BeforeEach
    void setUp() {
        NewsFetcherProperties properties = new NewsFetcherProperties();
        properties.setEnabled(true);
        properties.setFilterNonFinance(false);
        properties.setAiMaxCallsPerRun(0);

        scheduler = new NewsFetcherScheduler(
                sourceRepository,
                newsRepository,
                newsApiService,
                rssFeedService,
                aiCategorizerService,
                categoryService,
                properties,
                cacheManager,
                eventPublisher,
                transactionManager
        );

        source = new Source();
        source.setId(1L);
        source.setName("Bloomberght");
        source.setSourceUrl("https://www.bloomberght.com/rss");
        source.setActive(true);
    }

    @Test
    void fetchForSourceStoresPlainRssImageElementForNewNews() {
        SyndEntry entry = rssEntry(
                "UBS de Fed beklentisini oteledi",
                "https://www.bloomberght.com/ubs-de-fed-beklentisini-oteledi-3777477",
                "https://geoim.bloomberght.com/2026/05/13/ver1778660430/3777477_kutu.jpg"
        );

        when(sourceRepository.findById(1L)).thenReturn(Optional.of(source));
        when(rssFeedService.fetchRssFeed(source.getSourceUrl())).thenReturn(List.of(entry));
        when(newsRepository.findByCanonicalUrl(entry.getLink())).thenReturn(Optional.empty());
        when(categoryService.getActiveCategoriesCached()).thenReturn(List.of());
        when(aiCategorizerService.getFallbackCategoryFromCache()).thenReturn(null);
        when(newsRepository.save(any(News.class))).thenAnswer(invocation -> invocation.getArgument(0));

        scheduler.fetchForSource(1L);

        ArgumentCaptor<News> newsCaptor = ArgumentCaptor.forClass(News.class);
        verify(newsRepository).save(newsCaptor.capture());
        assertThat(newsCaptor.getValue().getImageUrl())
                .isEqualTo("https://geoim.bloomberght.com/2026/05/13/ver1778660430/3777477_kutu.jpg");
    }

    @Test
    void fetchForSourceBackfillsMissingImageForExistingNews() {
        SyndEntry entry = rssEntry(
                "QNB Turkiye yeni finansman sagladi",
                "https://www.bloomberght.com/qnb-turkiye-yeni-finansman-sagladi-3777470",
                "https://geoim.bloomberght.com/2026/05/13/ver1778658189/3777470_kutu.jpg"
        );
        News existing = new News();
        existing.setCanonicalUrl(entry.getLink());

        when(sourceRepository.findById(1L)).thenReturn(Optional.of(source));
        when(rssFeedService.fetchRssFeed(source.getSourceUrl())).thenReturn(List.of(entry));
        when(newsRepository.findByCanonicalUrl(entry.getLink())).thenReturn(Optional.of(existing));
        when(newsRepository.save(existing)).thenReturn(existing);

        scheduler.fetchForSource(1L);

        verify(newsRepository).save(existing);
        assertThat(existing.getImageUrl())
                .isEqualTo("https://geoim.bloomberght.com/2026/05/13/ver1778658189/3777470_kutu.jpg");
    }

    @Test
    void fetchForSourceDoesNotOverwriteExistingImage() {
        SyndEntry entry = rssEntry(
                "Bakir rekor seviyeye yakin seyrediyor",
                "https://www.bloomberght.com/bakir-rekor-seviyeye-yakin-3777444",
                "https://geoim.bloomberght.com/2026/05/13/ver1778649097/3777444_kutu.jpg"
        );
        News existing = new News();
        existing.setCanonicalUrl(entry.getLink());
        existing.setPublishedAt(OffsetDateTime.now());
        existing.setImageUrl("https://cdn.example.com/current.jpg");

        when(sourceRepository.findById(1L)).thenReturn(Optional.of(source));
        when(rssFeedService.fetchRssFeed(source.getSourceUrl())).thenReturn(List.of(entry));
        when(newsRepository.findByCanonicalUrl(entry.getLink())).thenReturn(Optional.of(existing));

        scheduler.fetchForSource(1L);

        verify(newsRepository, never()).save(existing);
        assertThat(existing.getImageUrl()).isEqualTo("https://cdn.example.com/current.jpg");
    }

    @Test
    void fetchForSourceIgnoresInvalidPlainRssImageUrl() {
        SyndEntry entry = rssEntry(
                "MSCI Turkiye endeksinde guncelleme",
                "https://www.bloomberght.com/msci-turkiye-endeksinde-guncelleme-3777443",
                "/relative-image.jpg"
        );

        when(sourceRepository.findById(1L)).thenReturn(Optional.of(source));
        when(rssFeedService.fetchRssFeed(source.getSourceUrl())).thenReturn(List.of(entry));
        when(newsRepository.findByCanonicalUrl(entry.getLink())).thenReturn(Optional.empty());
        when(categoryService.getActiveCategoriesCached()).thenReturn(List.of());
        when(aiCategorizerService.getFallbackCategoryFromCache()).thenReturn(null);
        when(newsRepository.save(any(News.class))).thenAnswer(invocation -> invocation.getArgument(0));

        scheduler.fetchForSource(1L);

        ArgumentCaptor<News> newsCaptor = ArgumentCaptor.forClass(News.class);
        verify(newsRepository).save(newsCaptor.capture());
        assertThat(newsCaptor.getValue().getImageUrl()).isNull();
    }

    private static SyndEntry rssEntry(String title, String link, String imageUrl) {
        SyndContentImpl description = new SyndContentImpl();
        description.setValue("Finans haber ozeti");

        SyndEntryImpl entry = new SyndEntryImpl();
        entry.setTitle(title);
        entry.setLink(link);
        entry.setDescription(description);
        entry.setForeignMarkup(List.of(new Element("image").setText(imageUrl)));
        return entry;
    }
}
