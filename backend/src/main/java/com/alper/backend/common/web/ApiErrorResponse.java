package com.alper.backend.common.web;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import java.time.OffsetDateTime;

/**
 * Doküman'a uygun standart hata yanıt formatı (Bölüm 4 - Validasyon ve Hata Yönetimi).
 *
 * Örnek JSON:
 * {
 *   "errorCode": "1003_FP_INVALID_PARAMETER",
 *   "message": "Geçersiz parametre değeri. Parametre: from",
 *   "timestamp": "2026-04-28T14:35:00Z",
 *   "path": "/api/v1/history/stocks/AKBNK.IS",
 *   "status": 400
 * }
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({"errorCode", "message", "timestamp", "path", "status"})
public record ApiErrorResponse(
    String errorCode,
    String message,
    OffsetDateTime timestamp,
    String path,
    int status
) {
    /**
     * ErrorCode + mesaj + path ile constructor — handler'lar bunu kullanır.
     */
    public static ApiErrorResponse of(String errorCode, int status, String message, String path) {
        return new ApiErrorResponse(errorCode, message, OffsetDateTime.now(), path, status);
    }
}
