package com.alper.backend.common.exception;

import lombok.Getter;

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
