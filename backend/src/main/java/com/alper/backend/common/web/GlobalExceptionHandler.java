package com.alper.backend.common.web;

import com.alper.backend.common.exception.BadRequestException;
import com.alper.backend.common.exception.ConflictException;
import com.alper.backend.common.exception.ErrorCode;
import com.alper.backend.common.exception.ExternalApiException;
import com.alper.backend.common.exception.GoneException;
import com.alper.backend.common.exception.NotFoundException;
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

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // ===== Domain exception handler'ları (ErrorCode taşır) =====

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiErrorResponse> handleBadRequest(
            BadRequestException ex, HttpServletRequest request) {
        return build(ex.getErrorCode(), ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(
            NotFoundException ex, HttpServletRequest request) {
        return build(ex.getErrorCode(), ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiErrorResponse> handleConflict(
            ConflictException ex, HttpServletRequest request) {
        return build(ex.getErrorCode(), ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(GoneException.class)
    public ResponseEntity<ApiErrorResponse> handleGone(
            GoneException ex, HttpServletRequest request) {
        return build(ex.getErrorCode(), ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(ExternalApiException.class)
    public ResponseEntity<ApiErrorResponse> handleExternalApi(
            ExternalApiException ex, HttpServletRequest request) {
        log.error("Dış API hatası [{}] at {}: {}",
                ex.getServiceType(), request.getRequestURI(), ex.getMessage());
        return build(ex.getErrorCode(), ex.getMessage(), request.getRequestURI());
    }

    // ===== Spring/Jakarta validation exception'ları → INVALID_PARAMETER =====

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

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleConstraintViolation(
            ConstraintViolationException ex, HttpServletRequest request) {
        return build(ErrorCode.INVALID_PARAMETER, ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiErrorResponse> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        String message = String.format("Geçersiz parametre değeri. Parametre: %s", ex.getName());
        return build(ErrorCode.INVALID_PARAMETER, message, request.getRequestURI());
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiErrorResponse> handleMissingParam(
            MissingServletRequestParameterException ex, HttpServletRequest request) {
        String message = String.format("Zorunlu alan boş bırakılamaz. Alan: %s", ex.getParameterName());
        return build(ErrorCode.REQUIRED_FIELD, message, request.getRequestURI());
    }

    // ===== DB constraint violation → CONFLICT (2002) =====

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
