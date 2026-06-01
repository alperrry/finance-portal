package com.alper.backend.common.exception;

import lombok.Getter;

/**
 * Dış servis (Keycloak, TCMB, Yahoo, TEFAS vb.) çağrıları başarısız olduğunda fırlatılan istisna.
 *
 * <p>Hata mesajı {@link ServiceType} prefix'i ile zenginleştirilir; varsayılan
 * {@link ErrorCode#FETCH_ERROR}. Parse hataları için yeni constructor üzerinden
 * {@link ErrorCode#PARSE_ERROR} verilebilir.</p>
 */
@Getter
public class ExternalApiException extends RuntimeException {

    private final ErrorCode errorCode;
    private final ServiceType serviceType;

    /**
     * Tam parametreli constructor — yeni kod bunu kullansın.
     */
    public ExternalApiException(ErrorCode errorCode, ServiceType serviceType, String message) {
        super(String.format("[%s] %s", serviceType, message));
        this.errorCode = errorCode;
        this.serviceType = serviceType;
    }

    public ExternalApiException(ErrorCode errorCode, ServiceType serviceType, String message, Throwable cause) {
        super(String.format("[%s] %s", serviceType, message), cause);
        this.errorCode = errorCode;
        this.serviceType = serviceType;
    }

    /**
     * Geriye dönük uyumluluk — mevcut throw'ları kırmamak için.
     * Default: FETCH_ERROR (4001).
     * Eğer parse hatası ise, throw eden kod yeni constructor'ı kullansın
     * ve explicit PARSE_ERROR geçirsin.
     */
    public ExternalApiException(ServiceType serviceType, String message) {
        this(ErrorCode.FETCH_ERROR, serviceType, message);
    }

    public ExternalApiException(ServiceType serviceType, String message, Throwable cause) {
        this(ErrorCode.FETCH_ERROR, serviceType, message, cause);
    }

    public ExternalApiException(String message, ServiceType serviceType) {
        this(ErrorCode.FETCH_ERROR, serviceType, message);
    }

    public ExternalApiException(String message, Throwable cause, ServiceType serviceType) {
        this(ErrorCode.FETCH_ERROR, serviceType, message, cause);
    }
}
