package com.alper.backend.news.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Haber modülüne ait scheduled görevler ({@code @Scheduled} ile işaretli) için
 * {@code @EnableScheduling} aktivasyonu.
 */
@Configuration("newsSchedulerConfig")
@EnableScheduling
public class SchedulerConfig {
}
