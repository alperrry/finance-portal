package com.alper.backend.market.fund.service;

import com.alper.backend.common.exception.ExternalApiException;
import com.alper.backend.common.exception.ServiceType;
import lombok.extern.log4j.Log4j2;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * TEFAS site oturumu için cookie/session jar'ı yöneten servis.
 *
 * <p>İlk istekte ana sayfayı ziyaret edip session cookie'lerini alır ve sonraki TEFAS
 * isteklerinde tekrar gönderir; gerçek tarayıcı User-Agent'ı kullanır.</p>
 */
@Log4j2
@Service
public class TefasCookieService {

    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    @Value("${fund.home-url:https://www.tefas.gov.tr/tr/fon-verileri}")
    private String tefasHomeUrl;

    private final OkHttpClient okHttpClient;

    private volatile String cachedCookie = null;

    public TefasCookieService(OkHttpClient okHttpClient) {
        this.okHttpClient = okHttpClient;
    }

    public String getCookie() {
        if (cachedCookie == null) refresh();
        return cachedCookie;
    }

    public void invalidate() {
        cachedCookie = null;
        log.info("TEFAS cookie cache temizlendi, yenileniyor...");
        refresh();
    }

    private synchronized void refresh() {
        if (cachedCookie != null) return;
        try {
            this.cachedCookie = fetchCookies();
            log.info("TEFAS cookie başarıyla alındı.");
        } catch (ExternalApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ExternalApiException("TEFAS oturum başlatılamadı.", e, ServiceType.TEFAS);
        }
    }

    private String fetchCookies() throws Exception {
        Request request = new Request.Builder()
                .url(tefasHomeUrl)
                .header("User-Agent", USER_AGENT)
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .header("Accept-Language", "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7")
                .build();

        try (Response response = okHttpClient.newCall(request).execute()) {
            List<String> cookies = response.headers("Set-Cookie");
            if (cookies.isEmpty()) {
                log.warn("TEFAS'tan cookie alınamadı (HTTP {}), cookie'siz deneniyor.", response.code());
                return "";
            }
            return cookies.stream()
                    .map(c -> c.split(";")[0].trim())
                    .collect(Collectors.joining("; "));
        }
    }
}
