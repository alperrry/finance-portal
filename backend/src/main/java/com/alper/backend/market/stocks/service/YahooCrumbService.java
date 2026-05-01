package com.alper.backend.market.stocks.service;

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

@Log4j2
@Service
public class YahooCrumbService {

    private static final String USER_AGENT  = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";

    @Value("${yahoo.consent-url:https://fc.yahoo.com}")
    private String consentUrl;

    @Value("${yahoo.crumb-url:https://query2.finance.yahoo.com/v1/test/getcrumb}")
    private String crumbUrl;

    private final OkHttpClient okHttpClient;

    private volatile String cachedCrumb  = null;
    private volatile String cachedCookie = null;

    public YahooCrumbService(OkHttpClient okHttpClient) {
        this.okHttpClient = okHttpClient;
    }

    public String getCrumb() {
        if (cachedCrumb == null) refresh();
        return cachedCrumb;
    }

    public String getCookie() {
        if (cachedCookie == null) refresh();
        return cachedCookie;
    }

    public void invalidate() {
        cachedCrumb  = null;
        cachedCookie = null;
        log.info("Yahoo crumb cache temizlendi, yenileniyor...");
        refresh();
    }

    private synchronized void refresh() {
        if (cachedCrumb != null) return;
        try {
            String cookie = fetchCookies();
            String crumb  = fetchCrumb(cookie);
            this.cachedCookie = cookie;
            this.cachedCrumb  = crumb;
            log.info("Yahoo crumb başarıyla alındı.");
        } catch (ExternalApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ExternalApiException("Yahoo Finance oturum başlatılamadı.", e, ServiceType.YAHOO);
        }
    }

    private String fetchCookies() throws Exception {
        Request request = new Request.Builder()
                .url(consentUrl)
                .header("User-Agent", USER_AGENT)
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .header("Accept-Language", "en-US,en;q=0.5")
                .header("Accept-Encoding", "gzip, deflate, br")
                .build();

        try (Response response = okHttpClient.newCall(request).execute()) {
            List<String> cookies = response.headers("Set-Cookie");
            if (cookies.isEmpty()) {
                log.warn("Yahoo'dan cookie alınamadı (HTTP {}), cookie'siz deneniyor.", response.code());
                return "";
            }
            return cookies.stream()
                    .map(c -> c.split(";")[0].trim())
                    .collect(Collectors.joining("; "));
        }
    }

    private String fetchCrumb(String cookie) throws Exception {
        Request request = new Request.Builder()
                .url(crumbUrl)
                .header("User-Agent", USER_AGENT)
                .header("Accept", "*/*")
                .header("Accept-Language", "en-US,en;q=0.5")
                .header("Cookie", cookie)
                .header("Referer", "https://finance.yahoo.com/")
                .build();

        try (Response response = okHttpClient.newCall(request).execute()) {
            if (!response.isSuccessful() || response.body() == null) {
                throw new ExternalApiException("Crumb alınamadı. HTTP: " + response.code(), ServiceType.YAHOO);
            }
            String crumb = response.body().string().trim();
            if (crumb.isEmpty() || crumb.startsWith("<")) {
                throw new ExternalApiException("Crumb yanıtı geçersiz — cookie çalışmıyor olabilir.", ServiceType.YAHOO);
            }
            return crumb;
        }
    }
}
