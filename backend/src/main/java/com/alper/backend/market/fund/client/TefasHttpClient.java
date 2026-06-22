package com.alper.backend.market.fund.client;

import com.alper.backend.common.exception.ExternalApiException;
import com.alper.backend.common.exception.ServiceType;
import com.alper.backend.market.common.BaseHttpClient;
import okhttp3.OkHttpClient;

/**
 * Eski TEFAS HTTP istemcisi — devre dışı.
 *
 * <p>Yeni TEFAS veri akışı {@code TefasService} içinde gerçekleştirilir;
 * bu sınıfın {@link #fetch} metodu çağrılırsa hata fırlatır.</p>
 *
 * @deprecated yerine {@code TefasService} kullanın
 */
@Deprecated
public class TefasHttpClient extends BaseHttpClient {

    public TefasHttpClient(OkHttpClient okHttpClient) {
        super(okHttpClient);
    }

    @Override
    protected ServiceType getServiceType() {
        return ServiceType.TEFAS;
    }

    public String fetch(String endpoint, String fundCode, String start, String end) {
        throw new ExternalApiException("Eski TEFAS HTTP client devre dışı. Yeni API akışı TefasService içindedir.",
                ServiceType.TEFAS);
    }
}
