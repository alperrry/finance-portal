package com.alper.backend.news.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "news.api")
public class NewsApiProperties {

    private String key;
    private String baseUrl;
    private String country;
    private String category;


}
