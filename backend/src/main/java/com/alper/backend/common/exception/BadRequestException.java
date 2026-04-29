package com.alper.backend.common.exception;

import lombok.Getter;

@Getter
public class BadRequestException extends RuntimeException {

    private final ErrorCode errorCode;

    /**
     * Yeni constructor — explicit ErrorCode taşır.
     * Doküman'a uyumlu hata kodu döndürmek için bunu kullan.
     */
    public BadRequestException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    /**
     * Geriye dönük uyumluluk — mevcut throw'ları kırmamak için.
     * Yeni kodda kullanma; explicit ErrorCode tercih edilmeli.
     * Default: INVALID_PARAMETER (en yaygın 400 senaryosu).
     */
    public BadRequestException(String message) {
        super(message);
        this.errorCode = ErrorCode.INVALID_PARAMETER;
    }
}
