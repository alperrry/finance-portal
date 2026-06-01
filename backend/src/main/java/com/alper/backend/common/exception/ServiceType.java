package com.alper.backend.common.exception;

/**
 * Dış servis çağrılarında hata mesajlarını ve loglarını markalamak için kullanılan kaynak tipi.
 */
public enum ServiceType {
    /** TCMB Elektronik Veri Dağıtım Sistemi. */
    EVDS,
    /** Türkiye Cumhuriyet Merkez Bankası genel uç noktaları (örn. günlük kur). */
    TCMB,
    /** Türkiye Elektronik Fon Alım Satım Platformu. */
    TEFAS,
    /** Yahoo Finance API. */
    YAHOO,
    /** Borsa İstanbul VIOP sayfaları. */
    VIOP,
    /** Keycloak Admin REST API. */
    KEYCLOAK
}
