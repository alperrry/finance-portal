package com.alper.backend.news.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

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

    // Getters & Setters
    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public int getTimeout() { return timeout; }
    public void setTimeout(int timeout) { this.timeout = timeout; }
}