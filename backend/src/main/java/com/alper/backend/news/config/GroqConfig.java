package com.alper.backend.news.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;
/**
 * Groq Cloud API entegrasyonu için yapılandırma: API key, model ve timeout.
 *
 * <p>{@code groq.api.*} property'lerini okur ve önceden authentication header'ı set edilmiş
 * bir {@link RestClient} bean'ini ({@code groqRestClient}) yayınlar.</p>
 */
@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "groq.api")
public class GroqConfig {

    private String key;
    private String model = "llama-3.3-70b-versatile";
    private int timeout = 30;

    @Bean
    public RestClient groqRestClient() {
        return RestClient.builder()
                .baseUrl("https://api.groq.com/openai/v1")
                .defaultHeader("Authorization", "Bearer " + key)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

}