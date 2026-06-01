package com.alper.backend.config;

import okhttp3.OkHttpClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Tüm dış HTTP çağrıları için paylaşılan {@link OkHttpClient} bean'ini sağlar.
 *
 * <p>Timeout değerleri ({@code connect/read/write}) {@code http.client.*-timeout-seconds}
 * konfigürasyonu üzerinden ayarlanır; varsayılan 10 saniyedir.</p>
 */
@Configuration
public class OkHttpConfig {

    @Value("${http.client.connect-timeout-seconds:10}")
    private long connectTimeoutSeconds;

    @Value("${http.client.read-timeout-seconds:10}")
    private long readTimeoutSeconds;

    @Value("${http.client.write-timeout-seconds:10}")
    private long writeTimeoutSeconds;

    @Bean
    public OkHttpClient okHttpClient() {
        return new OkHttpClient.Builder()
                .connectTimeout(connectTimeoutSeconds, TimeUnit.SECONDS)
                .readTimeout(readTimeoutSeconds, TimeUnit.SECONDS)
                .writeTimeout(writeTimeoutSeconds, TimeUnit.SECONDS)
                .build();
    }
}
