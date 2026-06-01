package com.alper.backend.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJacksonJsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import tools.jackson.databind.json.JsonMapper;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * Redis cache yapılandırması: cache adı bazlı TTL haritası ve JSON serializer ayarları.
 *
 * <p>Haber listeleri, history serileri, indikatörler, piyasa modülleri ve portföy
 * değerlemesi için ayrı TTL'ler tanımlanır; null değerler cache'lenmez. {@code spring.cache.type}
 * varsayılan olarak {@code redis} kabul edilir, başka değer verilirse bu yapılandırma
 * devreye girmez.</p>
 */
@Configuration
@EnableCaching
@ConditionalOnProperty(name = "spring.cache.type", havingValue = "redis", matchIfMissing = true)
public class RedisConfig {

    @Value("${portfolio.valuation-cache.ttl-seconds:60}")
    private long portfolioValuationCacheTtlSeconds;

    @Bean
    @ConditionalOnBean(RedisConnectionFactory.class)
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        GenericJacksonJsonRedisSerializer serializer =
                new GenericJacksonJsonRedisSerializer(JsonMapper.builder().build());

        RedisCacheConfiguration baseConfig = RedisCacheConfiguration.defaultCacheConfig()
                .serializeKeysWith(
                        RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer())
                )
                .serializeValuesWith(
                        RedisSerializationContext.SerializationPair.fromSerializer(serializer)
                )
                .disableCachingNullValues();

        Map<String, RedisCacheConfiguration> cacheConfigs = new HashMap<>();

        // News
        cacheConfigs.put("newsListV2",       baseConfig.entryTtl(Duration.ofSeconds(90)));
        cacheConfigs.put("newsListV3",       baseConfig.entryTtl(Duration.ofSeconds(90)));
        cacheConfigs.put("activeCategories", baseConfig.entryTtl(Duration.ofMinutes(30)));
// History — günlük kapanışta bir kez güncelleniyor
        cacheConfigs.put("history",         baseConfig.entryTtl(Duration.ofHours(1)));
        cacheConfigs.put("history-compare", baseConfig.entryTtl(Duration.ofHours(1)));
        // Stock Indicators — scheduler 18:35'te günde bir kez günceller
        cacheConfigs.put("stock-indicator-latest",  baseConfig.entryTtl(Duration.ofHours(1)));
        cacheConfigs.put("stock-indicator-history", baseConfig.entryTtl(Duration.ofHours(1)));// Market — TCMB 15:35, EVDS 16:00'da bir kez güncelleniyor
        cacheConfigs.put("bonds", baseConfig.entryTtl(Duration.ofHours(24)));

        // Market — günlük veri modeli
        cacheConfigs.put("stocks", baseConfig.entryTtl(Duration.ofHours(24)));
        cacheConfigs.put("fx",     baseConfig.entryTtl(Duration.ofHours(24)));
        cacheConfigs.put("funds",  baseConfig.entryTtl(Duration.ofHours(24)));
        cacheConfigs.put("macro",  baseConfig.entryTtl(Duration.ofHours(24)));
        cacheConfigs.put("viop",   baseConfig.entryTtl(Duration.ofHours(24)));

        // Portfolio
        cacheConfigs.put("portfolioValuation", baseConfig.entryTtl(Duration.ofSeconds(portfolioValuationCacheTtlSeconds)));

        // Simulation — geçmiş kurlar immutable, 7 günlük TTL
        cacheConfigs.put("historicalRates", baseConfig.entryTtl(Duration.ofDays(7)));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(baseConfig.entryTtl(Duration.ofMinutes(10)))
                .withInitialCacheConfigurations(cacheConfigs)
                .build();
    }
}
