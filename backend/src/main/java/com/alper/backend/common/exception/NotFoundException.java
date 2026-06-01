package com.alper.backend.common.exception;

import lombok.Getter;

/**
 * 404 Not Found senaryolarında (kaynağa erişim yok) fırlatılan domain istisnası.
 *
 * <p>{@link ErrorCode} taşır; varsayılan {@link ErrorCode#NOT_FOUND}. Authentication
 * gerektiren uç noktalarda 403 yerine 404 dönerek varlık sızıntısı önlemek için de
 * kullanılır.</p>
 */
@Getter
public class NotFoundException extends RuntimeException {

    private final ErrorCode errorCode;

    public NotFoundException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    /**
     * Geriye dönük uyumluluk.
     * Default: NOT_FOUND.
     */
    public NotFoundException(String message) {
        super(message);
        this.errorCode = ErrorCode.NOT_FOUND;
    }
}
