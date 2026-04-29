package com.alper.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class BackendApplicationTests {

    @Test
    void contextLoads() {
        // Spring context test profili ile yüklenebiliyor mu doğrular.
        // Tüm bean'ler dummy config ile başlatılabiliyorsa test geçer.
    }
}
