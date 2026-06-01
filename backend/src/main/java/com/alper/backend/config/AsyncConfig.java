package com.alper.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Spring {@code @Async} desteğini etkinleştirir. Backfill ve haber çekme gibi uzun süren
 * görevler asenkron çalıştırılır.
 */
@Configuration
@EnableAsync
public class AsyncConfig {
}