package com.alper.backend.common.exception;

import lombok.Getter;

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
