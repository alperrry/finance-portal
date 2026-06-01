package com.alper.backend.news.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Haber çekme zamanlayıcısının etkinlik, gecikme ve AI kategorizasyon sınır ayarlarını tutar.
 */
@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "news.fetcher")
public class NewsFetcherProperties {

    private boolean enabled;
    private long fixedDelay;
    private long initialDelay;
    private int aiMaxCallsPerRun = 30;
    private boolean filterNonFinance = true;

}
