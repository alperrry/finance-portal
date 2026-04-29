package com.alper.backend.market.fund.client;

import com.alper.backend.common.exception.ExternalApiException;
import com.alper.backend.common.exception.ServiceType;
import com.alper.backend.market.common.BaseHttpClient;
import com.alper.backend.market.fund.service.TefasCookieService;
import lombok.extern.log4j.Log4j2;
import okhttp3.FormBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Log4j2
@Component
public class TefasHttpClient extends BaseHttpClient {

    private static final String REFERER    = "https://www.tefas.gov.tr/FonAnaliz.aspx";
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    private static final String FUND_TYPE  = "YAT";

    @Value("${fund.base-url}")
    private String baseUrl;

    private final TefasCookieService tefasCookieService;

    public TefasHttpClient(OkHttpClient okHttpClient, TefasCookieService tefasCookieService) {
        super(okHttpClient);
        this.tefasCookieService = tefasCookieService;
    }

    @Override
    protected ServiceType getServiceType() {
        return ServiceType.TEFAS;
    }

    public String fetch(String endpoint, String fundCode, String start, String end) {
        return doFetch(endpoint, fundCode, start, end, false);
    }

    private String doFetch(String endpoint, String fundCode, String start, String end, boolean isRetry) {
        RequestBody body = new FormBody.Builder()
                .add("fontip", FUND_TYPE)
                .add("sfonkod", fundCode)
                .add("fonkod", fundCode)
                .add("bastarih", start)
                .add("bittarih", end)
                .build();

        Request request = new Request.Builder()
                .url(baseUrl + endpoint)
                .post(body)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .header("X-Requested-With", "XMLHttpRequest")
                .header("Referer", REFERER)
                .header("User-Agent", USER_AGENT)
                .header("Accept", "application/json, text/javascript, */*; q=0.01")
                .header("Accept-Language", "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7")
                .header("Origin", "https://www.tefas.gov.tr")
                .header("Cookie", tefasCookieService.getCookie())
                .build();

        String json = execute(request);

        if (json.startsWith("<") && !isRetry) {
            log.warn("TEFAS WAF engeli tespit edildi, cookie yenileniyor...");
            tefasCookieService.invalidate();
            return doFetch(endpoint, fundCode, start, end, true);
        }

        if (json.startsWith("<")) {
            throw new ExternalApiException("TEFAS WAF engeli aşılamadı. Endpoint: " + endpoint, ServiceType.TEFAS);
        }

        return json;
    }
}