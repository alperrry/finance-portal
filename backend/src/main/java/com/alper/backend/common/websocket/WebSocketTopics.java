package com.alper.backend.common.websocket;

/**
 * WebSocket topic ve queue sabitlerini merkezileştiren yardımcı sınıf.
 *
 * <p>Spring STOMP'un /user prefix routing'i sayesinde /queue/* destinasyonları otomatik olarak
 * principal'a göre hedeflenir; broadcaster'larda convertAndSendToUser ile çağrılır ve
 * SimpMessagingTemplate başına /user prefix'ini kendi ekler.</p>
 */
public final class WebSocketTopics {

    private WebSocketTopics() {
        // utility class
    }

    // ---- Kullanıcıya özel queue'lar (SimpMessagingTemplate.convertAndSendToUser ile) ----

    /** Kullanıcının trade event'leri (TRADE_APPROVED/REJECTED/CANCELLED). */
    public static final String USER_TRADES = "/queue/trades";

    /** Kullanıcının portföy update sinyalleri (PORTFOLIO_UPDATED — thin push). */
    public static final String USER_PORTFOLIO = "/queue/portfolio";

    // ---- Broadcast topic'ler (SimpMessagingTemplate.convertAndSend ile) ----

    /** Tüm aboneler: hisse fiyatı güncellemeleri (full push). */
    public static final String STOCKS_PRICES = "/topic/market/stocks/prices";

    /** Tüm aboneler: TCMB döviz kuru güncellemeleri (full push). */
    public static final String FX_RATES = "/topic/market/fx/rates";

    /** Tüm aboneler: yeni haber sinyali (thin push). */
    public static final String NEWS = "/topic/news";
}
