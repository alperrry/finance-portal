package com.alper.backend.common.exception;

import lombok.Getter;

@Getter
public class GoneException extends RuntimeException {

    private final ErrorCode errorCode;

    public GoneException(String message) {
        super(message);
        this.errorCode = ErrorCode.SETUP_EXPIRED;
    }
}
