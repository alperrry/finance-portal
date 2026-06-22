package com.alper.backend.market.macro.client;

import com.alper.backend.common.exception.ServiceType;
import com.alper.backend.market.common.BaseHttpClient;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Makro göstergeleri (enflasyon, mevduat faizi) TCMB EVDS API'sinden çeken HTTP istemcisi.
 *
 * <p>API anahtarı opsiyoneldir; tanımlıysa isteğe başlık olarak eklenir. Hata yönetimi
 * {@link BaseHttpClient} üzerinden ortaktır.</p>
 */
@Component
public class MacroEvdsClient extends BaseHttpClient {
    @Value("${evds.base-url}")
    private String baseUrl;

    @Value("${evds.api-key:}")
    private String apiKey;

    public MacroEvdsClient(OkHttpClient okHttpClient) {
        super(okHttpClient);
    }

    @Override
    protected ServiceType getServiceType() {
        return ServiceType.EVDS;
    }

    /**
     * Belirtilen EVDS serisini tarih aralığıyla JSON formatında çeker.
     *
     * @param seriesCode EVDS seri kodu
     * @param startDate  başlangıç tarihi ({@code dd-MM-yyyy})
     * @param endDate    bitiş tarihi ({@code dd-MM-yyyy})
     * @return API'nin ham JSON yanıtı
     */
    public String fetchSeries(String seriesCode, String startDate, String endDate) {
        String url = String.format("%s/series=%s&startDate=%s&endDate=%s&type=json",
                baseUrl, seriesCode, startDate, endDate);
        Request.Builder builder = new Request.Builder().url(url);
        if (apiKey != null && !apiKey.isBlank()) {
            builder.header("key", apiKey);
        }
        return execute(builder.build());
    }
}
