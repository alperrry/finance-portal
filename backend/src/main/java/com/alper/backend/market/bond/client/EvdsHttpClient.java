package com.alper.backend.market.bond.client;

import com.alper.backend.common.exception.ServiceType;
import com.alper.backend.market.common.BaseHttpClient;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * TCMB EVDS (Elektronik Veri Dağıtım Sistemi) API'sinden seri verisi çeken HTTP istemcisi.
 *
 * <p>İstekler API anahtarıyla yetkilendirilir; hata yönetimi {@link BaseHttpClient}
 * üzerinden ortaktır.</p>
 */
@Component
public class EvdsHttpClient extends BaseHttpClient {

    @Value("${evds.base-url}")
    private String baseUrl;

    @Value("${evds.api-key}")
    private String apiKey;

    public EvdsHttpClient(OkHttpClient okHttpClient) {
        super(okHttpClient);
    }

    @Override
    protected ServiceType getServiceType() {
        return ServiceType.EVDS;
    }

    /**
     * Belirtilen EVDS serisini tarih aralığıyla JSON formatında çeker.
     *
     * @param seriesCode EVDS seri kodu (örn. {@code TP.DK.USD.S.YTL})
     * @param startDate  başlangıç tarihi ({@code dd-MM-yyyy})
     * @param endDate    bitiş tarihi ({@code dd-MM-yyyy})
     * @return API'nin ham JSON yanıtı
     */
    public String fetchSeries(String seriesCode, String startDate, String endDate) {
        String url = String.format("%s/series=%s&startDate=%s&endDate=%s&type=json",
                baseUrl, seriesCode, startDate, endDate);

        Request request = new Request.Builder()
                .url(url)
                .header("key", apiKey)
                .build();

        return execute(request);
    }
}