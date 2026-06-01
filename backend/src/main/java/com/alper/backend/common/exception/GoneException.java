package com.alper.backend.common.exception;

import lombok.Getter;

/**
 * 410 Gone senaryolarında (örn. süresi geçmiş 2FA setup oturumu) fırlatılan domain istisnası.
 *
 * <p>Her zaman {@link ErrorCode#SETUP_EXPIRED} ile etiketlenir.</p>
 */
@Getter
public class GoneException extends RuntimeException {

    private final ErrorCode errorCode;

    public GoneException(String message) {
        super(message);
        this.errorCode = ErrorCode.SETUP_EXPIRED;
    }
}
