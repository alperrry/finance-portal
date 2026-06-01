package com.alper.backend.common.web;

import com.alper.backend.common.exception.BadRequestException;
import com.alper.backend.common.exception.ConflictException;
import com.alper.backend.common.exception.ErrorCode;
import com.alper.backend.common.exception.ExternalApiException;
import com.alper.backend.common.exception.GoneException;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.portfolio.simulation.exception.HistoricalDataMissingException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * Tüm REST controller'ları için merkezi istisna yakalayıcısı.
 *
 * <p>Domain istisnalarını ({@link BadRequestException}, {@link NotFoundException},
 * {@link ConflictException}, {@link GoneException}, {@link ExternalApiException},
 * {@link HistoricalDataMissingException}) ilgili {@code ErrorCode} ve HTTP durum
 * koduyla {@link ApiErrorResponse} gövdesine dönüştürür. Spring/Jakarta validation
 * hatalarını {@code INVALID_PARAMETER} koduna eşler; veri bütünlüğü ihlallerini
 * {@code CONFLICT} olarak raporlar. Yakalanmamış {@link Exception} türleri için
 * 500 üretir ve ayrıntıyı sunucu loguna yazar.</p>
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // ===== Domain exception handler'ları (ErrorCode taşır) =====

    /** {@link BadRequestException} → istisnadaki {@code ErrorCode} ile 400 yanıtı üretir. */
    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiErrorResponse> handleBadRequest(
            BadRequestException ex, HttpServletRequest request) {
        return build(ex.getErrorCode(), ex.getMessage(), request.getRequestURI());
    }

    /** {@link NotFoundException} → istisnadaki {@code ErrorCode} ile 404 yanıtı üretir. */
    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(
            NotFoundException ex, HttpServletRequest request) {
        return build(ex.getErrorCode(), ex.getMessage(), request.getRequestURI());
    }

    /** {@link ConflictException} → istisnadaki {@code ErrorCode} ile 409 yanıtı üretir. */
    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiErrorResponse> handleConflict(
            ConflictException ex, HttpServletRequest request) {
        return build(ex.getErrorCode(), ex.getMessage(), request.getRequestURI());
    }

    /** {@link GoneException} → kaldırılmış/erişimi kapatılmış kaynak için 410 yanıtı üretir. */
    @ExceptionHandler(GoneException.class)
    public ResponseEntity<ApiErrorResponse> handleGone(
            GoneException ex, HttpServletRequest request) {
        return build(ex.getErrorCode(), ex.getMessage(), request.getRequestURI());
    }

    /**
     * Dış servis çağrılarında oluşan {@link ExternalApiException}'i error seviyesinde loglar
     * ve istisnadaki {@code ErrorCode}'a karşılık gelen HTTP durumuyla yanıt üretir.
     */
    @ExceptionHandler(ExternalApiException.class)
    public ResponseEntity<ApiErrorResponse> handleExternalApi(
            ExternalApiException ex, HttpServletRequest request) {
        log.error("Dış API hatası [{}] at {}: {}",
                ex.getServiceType(), request.getRequestURI(), ex.getMessage());
        return build(ex.getErrorCode(), ex.getMessage(), request.getRequestURI());
    }

    /**
     * Simulation/backtest senaryolarında istenen tarih aralığında geçmiş veri bulunamadığında
     * uygun HTTP durumu ve {@code ErrorCode} ile yanıt üretir.
     */
    @ExceptionHandler(HistoricalDataMissingException.class)
    public ResponseEntity<ApiErrorResponse> handleHistoricalDataMissing(
            HistoricalDataMissingException ex, HttpServletRequest request) {
        return build(ex.getErrorCode(), ex.getMessage(), request.getRequestURI());
    }

    // ===== Spring/Jakarta validation exception'ları → INVALID_PARAMETER =====

    /**
     * {@code @Valid} ile işaretli istek gövdesi doğrulamayı geçemediğinde ilk hatalı alanı
     * yakalayıp {@code INVALID_PARAMETER} yanıtı üretir.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        FieldError fieldError = ex.getBindingResult().getFieldError();
        String message = fieldError == null
                ? "Geçersiz istek gövdesi."
                : String.format("Geçersiz parametre değeri. Parametre: %s",
                        fieldError.getField());
        return build(ErrorCode.INVALID_PARAMETER, message, request.getRequestURI());
    }

    /** Programatik {@code jakarta.validation} ihlallerini {@code INVALID_PARAMETER} olarak raporlar. */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleConstraintViolation(
            ConstraintViolationException ex, HttpServletRequest request) {
        return build(ErrorCode.INVALID_PARAMETER, ex.getMessage(), request.getRequestURI());
    }

    /** Path/query parametre tip dönüşümü başarısız olduğunda parametre adıyla 400 yanıtı üretir. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiErrorResponse> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        String message = String.format("Geçersiz parametre değeri. Parametre: %s", ex.getName());
        return build(ErrorCode.INVALID_PARAMETER, message, request.getRequestURI());
    }

    /** Zorunlu request parametresi eksik olduğunda {@code REQUIRED_FIELD} ile 400 yanıtı üretir. */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiErrorResponse> handleMissingParam(
            MissingServletRequestParameterException ex, HttpServletRequest request) {
        String message = String.format("Zorunlu alan boş bırakılamaz. Alan: %s", ex.getParameterName());
        return build(ErrorCode.REQUIRED_FIELD, message, request.getRequestURI());
    }

    // ===== DB constraint violation → CONFLICT (2002) =====

    /**
     * Veritabanı bütünlük ihlallerini (unique/foreign key vs.) {@code CONFLICT} olarak 409 ile
     * raporlar; ham hata mesajını istemciye sızdırmaz, sunucu logunda saklar.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleDataIntegrity(
            DataIntegrityViolationException ex, HttpServletRequest request) {
        String causeMessage = ex.getMostSpecificCause() == null
                ? ex.getMessage()
                : ex.getMostSpecificCause().getMessage();
        log.warn("Veri bütünlüğü hatası at {}: {}", request.getRequestURI(), causeMessage);
        return build(ErrorCode.CONFLICT, "Kayıt zaten mevcut.", request.getRequestURI());
    }

    // ===== Yakalanmamış istisnalar — ErrorCode yok, generic 500 =====

    /**
     * Diğer handler'larca yakalanmayan tüm {@link Exception} türleri için 500 üretir,
     * stack trace'i sunucu logunda tutar ve istemciye generic bir mesaj döner.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnhandled(
            Exception ex, HttpServletRequest request) {
        log.error("Beklenmedik hata at {}", request.getRequestURI(), ex);
        // Generic exception için ErrorCode yok; null olarak geçiyoruz, JSON'da
        // @JsonInclude(NON_NULL) ile zaten görünmeyecek.
        ApiErrorResponse body = ApiErrorResponse.of(
                null,
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "Sunucu tarafında beklenmedik bir hata oluştu.",
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }

    // ===== Helper =====

    private ResponseEntity<ApiErrorResponse> build(ErrorCode errorCode, String message, String path) {
        HttpStatus status = errorCode.getHttpStatus();
        ApiErrorResponse body = ApiErrorResponse.of(
                errorCode.getCode(),
                status.value(),
                message,
                path
        );
        return ResponseEntity.status(status).body(body);
    }
}
