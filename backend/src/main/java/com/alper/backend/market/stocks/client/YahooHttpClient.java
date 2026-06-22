package com.alper.backend.market.stocks.client;

import com.alper.backend.common.exception.ServiceType;
import com.alper.backend.market.common.BaseHttpClient;
import com.alper.backend.market.stocks.service.YahooCrumbService;
import lombok.extern.log4j.Log4j2;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Yahoo Finance'tan anlık fiyat ve geçmiş veri çeken HTTP istemcisi.
 *
 * <p>Quote istekleri Yahoo'nun crumb/cookie doğrulamasını gerektirir; 401 alınırsa
 * crumb bir kez yenilenip istek tekrarlanır. Hata yönetimi {@link BaseHttpClient}
 * üzerinden ortaktır.</p>
 */
@Log4j2
@Component
public class YahooHttpClient extends BaseHttpClient {

    @Value("${stock.quote-url}")
    private String quoteUrl;

    @Value("${stock.history-url}")
    private String historyUrl;

    private final YahooCrumbService yahooCrumbService;

    public YahooHttpClient(OkHttpClient okHttpClient, YahooCrumbService yahooCrumbService) {
        super(okHttpClient);
        this.yahooCrumbService = yahooCrumbService;
    }

    @Override
    protected ServiceType getServiceType() {
        return ServiceType.YAHOO;
    }

    /**
     * Verilen sembollerin anlık fiyat bilgisini çeker.
     *
     * @param symbols virgülle ayrılmış sembol listesi (örn. {@code THYAO.IS,GARAN.IS})
     * @return API'nin ham JSON yanıtı
     */
    public String fetchQuote(String symbols) {
        return doFetchQuote(symbols, false);
    }

    /**
     * Tek bir sembolün geçmiş fiyat verisini çeker.
     *
     * @param symbol Yahoo sembolü
     * @return API'nin ham JSON yanıtı
     */
    public String fetchHistory(String symbol) {
        String url = String.format(historyUrl, symbol);
        Request request = new Request.Builder()
                .url(url)
                .header("User-Agent", "Mozilla/5.0")
                .build();
        return execute(request);
    }

    private String doFetchQuote(String symbols, boolean isRetry) {
        String crumb  = yahooCrumbService.getCrumb();
        String cookie = yahooCrumbService.getCookie();
        String url    = String.format(quoteUrl, symbols) + "&crumb=" + crumb;

        Request request = new Request.Builder()
                .url(url)
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
                .header("Cookie", cookie)
                .build();

        try {
            return execute(request);
        } catch (Exception e) {
            if (!isRetry) {
                log.warn("Yahoo Finance 401 döndü, crumb yenileniyor...");
                yahooCrumbService.invalidate();
                return doFetchQuote(symbols, true);
            }
            throw e;
        }
    }
}