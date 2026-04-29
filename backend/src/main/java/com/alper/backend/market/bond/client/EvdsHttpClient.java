package com.alper.backend.market.bond.client;

import com.alper.backend.common.exception.ServiceType;
import com.alper.backend.market.common.BaseHttpClient;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

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