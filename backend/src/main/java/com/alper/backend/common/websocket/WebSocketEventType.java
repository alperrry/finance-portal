package com.alper.backend.common.websocket;

/**
 * WebSocketEnvelope.type alanında kullanılan tüm event tiplerinin merkezi enum'u.
 * Frontend bu değerlere göre payload'u parse eder ve UI güncellemesini yönlendirir.
 */
public enum WebSocketEventType {

    // ---- Portfolio (kullanıcıya özel) ----
    TRADE_APPROVED,
    TRADE_REJECTED,
    TRADE_CANCELLED,
    PORTFOLIO_UPDATED,
    USER_BALANCE_UPDATED,

    // ---- Market (broadcast) ----
    STOCK_PRICES_UPDATED,
    FX_RATES_UPDATED,

    // ---- News (broadcast) ----
    NEWS_PUBLISHED
}
