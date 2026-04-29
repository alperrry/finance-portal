package com.alper.backend.market.fx.client;

import com.alper.backend.common.exception.ServiceType;
import com.alper.backend.market.common.BaseHttpClient;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import org.springframework.stereotype.Component;

@Component
public class TcmbHttpClient extends BaseHttpClient {

    public TcmbHttpClient(OkHttpClient okHttpClient) {
        super(okHttpClient);
    }

    @Override
    protected ServiceType getServiceType() {
        return ServiceType.TCMB;
    }

    public String fetchXml(String url) {
        Request request = new Request.Builder()
                .url(url)
                .build();
        return execute(request);
    }
}