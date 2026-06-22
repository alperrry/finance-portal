package com.alper.backend.market.fx.client;

import com.alper.backend.common.exception.ServiceType;
import com.alper.backend.market.common.BaseHttpClient;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import org.springframework.stereotype.Component;

/**
 * TCMB'nin günlük kur XML servisinden veri çeken HTTP istemcisi.
 *
 * <p>Hata yönetimi {@link BaseHttpClient} üzerinden ortaktır.</p>
 */
@Component
public class TcmbHttpClient extends BaseHttpClient {

    public TcmbHttpClient(OkHttpClient okHttpClient) {
        super(okHttpClient);
    }

    @Override
    protected ServiceType getServiceType() {
        return ServiceType.TCMB;
    }

    /**
     * Verilen adresten ham XML içeriğini çeker.
     *
     * @param url TCMB kur XML adresi
     * @return ham XML yanıtı
     */
    public String fetchXml(String url) {
        Request request = new Request.Builder()
                .url(url)
                .build();
        return execute(request);
    }
}