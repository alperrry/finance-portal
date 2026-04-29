package com.alper.backend.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Doküman'daki standart hata kodları (Bölüm 4 - Validasyon ve Hata Yönetimi).
 * Her kod doküman'da tanımlanan formata birebir uyar:
 * "{numericPrefix}_FP_{ERROR_NAME}"
 */
@Getter
public enum ErrorCode {

    // 1xxx — Zorunlu alan ve format hataları (HTTP 400)
    REQUIRED_FIELD          ("1001_FP_REQUIRED_FIELD",          HttpStatus.BAD_REQUEST),
    FIELD_CANNOT_BE_NULL    ("1002_FP_FIELD_CANNOT_BE_NULL",    HttpStatus.BAD_REQUEST),
    INVALID_PARAMETER       ("1003_FP_INVALID_PARAMETER",       HttpStatus.BAD_REQUEST),

    // 2xxx — Kaynak hataları
    NOT_FOUND               ("2001_FP_NOT_FOUND",               HttpStatus.NOT_FOUND),
    CONFLICT                ("2002_FP_CONFLICT",                HttpStatus.CONFLICT),

    // 3xxx — Yetkilendirme hataları
    UNAUTHORIZED            ("3001_FP_UNAUTHORIZED",            HttpStatus.UNAUTHORIZED),
    FORBIDDEN               ("3002_FP_FORBIDDEN",               HttpStatus.FORBIDDEN),

    // 4xxx — Dış kaynak hataları
    FETCH_ERROR             ("4001_FP_FETCH_ERROR",             HttpStatus.SERVICE_UNAVAILABLE),
    PARSE_ERROR             ("4002_FP_PARSE_ERROR",             HttpStatus.INTERNAL_SERVER_ERROR),

    // 5xxx — İş kuralı hataları
    BUSINESS_RULE_VIOLATION ("5001_FP_BUSINESS_RULE_VIOLATION", HttpStatus.UNPROCESSABLE_ENTITY);

    private final String code;
    private final HttpStatus httpStatus;

    ErrorCode(String code, HttpStatus httpStatus) {
        this.code = code;
        this.httpStatus = httpStatus;
    }
}
