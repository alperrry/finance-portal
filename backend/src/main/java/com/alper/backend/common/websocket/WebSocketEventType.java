package com.alper.backend.common.websocket;

/**
 * WebSocket zarflarında ({@link WebSocketEnvelope}) taşınan event tipleri.
 *
 * <p>İşlem (trade), piyasa fiyat güncellemeleri, haber yayınları ve admin
 * paneli bildirimlerini kapsar.</p>
 */
public enum WebSocketEventType {
    TRADE_APPROVED,
    TRADE_REJECTED,
    TRADE_CANCELLED,
    PORTFOLIO_UPDATED,

    STOCK_PRICES_UPDATED,
    FX_RATES_UPDATED,
    FUND_PRICES_UPDATED,
    VIOP_PRICES_UPDATED,
    BOND_RATES_UPDATED,

    NEWS_PUBLISHED,

    ADMIN_AUDIT_LOGGED,
    ADMIN_USER_UPDATED,
    ADMIN_USER_ROLE_CHANGED,
    ADMIN_USER_STATUS_CHANGED,

    ADMIN_SOURCE_CREATED,
    ADMIN_SOURCE_UPDATED,
    ADMIN_SOURCE_DELETED,
    ADMIN_SOURCE_TOGGLED,
    ADMIN_CATEGORY_CREATED,
    ADMIN_CATEGORY_UPDATED,
    ADMIN_CATEGORY_DELETED,

    ADMIN_JOB_STARTED,
    ADMIN_JOB_COMPLETED,
    ADMIN_JOB_FAILED,
    ADMIN_JOB_TOGGLED,

    ADMIN_TRADE_PENDING,
    ADMIN_TRADE_APPROVED,
    ADMIN_TRADE_REJECTED,

    ADMIN_NOTIFICATION
}
