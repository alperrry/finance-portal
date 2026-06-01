package com.alper.backend.common.exception;

import lombok.Getter;

/**
 * 409 Conflict senaryolarında (örn. unique constraint, duplicate kayıt) fırlatılan domain istisnası.
 *
 * <p>{@link ErrorCode} taşır; varsayılan {@link ErrorCode#CONFLICT}.</p>
 */
@Getter
public class ConflictException extends RuntimeException {

    private final ErrorCode errorCode;

    public ConflictException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    /**
     * Geriye dönük uyumluluk.
     * Default: CONFLICT.
     */
    public ConflictException(String message) {
        super(message);
        this.errorCode = ErrorCode.CONFLICT;
    }
}
