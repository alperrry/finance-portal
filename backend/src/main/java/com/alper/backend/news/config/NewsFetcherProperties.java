package com.alper.backend.news.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "news.fetcher")
public class NewsFetcherProperties {

    private boolean enabled;
    private long fixedDelay;
    private long initialDelay;
    private int aiMaxCallsPerRun = 30;
    private boolean filterNonFinance = true;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public long getFixedDelay() {
        return fixedDelay;
    }

    public void setFixedDelay(long fixedDelay) {
        this.fixedDelay = fixedDelay;
    }

    public long getInitialDelay() {
        return initialDelay;
    }

    public void setInitialDelay(long initialDelay) {
        this.initialDelay = initialDelay;
    }

    public int getAiMaxCallsPerRun() {
        return aiMaxCallsPerRun;
    }

    public void setAiMaxCallsPerRun(int aiMaxCallsPerRun) {
        this.aiMaxCallsPerRun = aiMaxCallsPerRun;
    }

    public boolean isFilterNonFinance() {
        return filterNonFinance;
    }

    public void setFilterNonFinance(boolean filterNonFinance) {
        this.filterNonFinance = filterNonFinance;
    }
}
