package com.alper.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.web.config.EnableSpringDataWebSupport;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Finans Portalı backend uygulamasının giriş noktası.
 *
 * <p>Zamanlanmış işler (scheduling), önbellekleme (caching) ve Spring Data
 * sayfalama DTO serileştirmesi uygulama genelinde burada etkinleştirilir.</p>
 */
@EnableScheduling
@EnableCaching
@SpringBootApplication
@EnableSpringDataWebSupport(pageSerializationMode = EnableSpringDataWebSupport.PageSerializationMode.VIA_DTO)
public class BackendApplication {

    /**
     * Uygulamayı başlatır.
     *
     * @param args komut satırı argümanları
     */
    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }

}
