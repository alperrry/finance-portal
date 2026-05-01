package com.alper.backend.common.web;

import com.alper.backend.common.exception.BadRequestException;
import com.alper.backend.common.exception.ConflictException;
import com.alper.backend.common.exception.ErrorCode;
import com.alper.backend.common.exception.ExternalApiException;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.common.exception.ServiceType;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("GlobalExceptionHandler")
class GlobalExceptionHandlerTest {

    private static final String REQUEST_URI = "/api/v1/test";

    @Mock
    private HttpServletRequest mockRequest;

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
        when(mockRequest.getRequestURI()).thenReturn(REQUEST_URI);
    }

    @Nested
    @DisplayName("Custom domain exception'lar")
    class DomainExceptionMapping {

        @Test
        @DisplayName("BadRequestException -> 400 + 1003_FP_INVALID_PARAMETER")
        void badRequestMapsToInvalidParameter() {
            BadRequestException ex = new BadRequestException(
                    ErrorCode.INVALID_PARAMETER,
                    "Geçersiz parametre değeri. Parametre: from"
            );

            ResponseEntity<ApiErrorResponse> response = handler.handleBadRequest(ex, mockRequest);

            ApiErrorResponse body = assertMappedResponse(response, 400, "1003_FP_INVALID_PARAMETER");
            assertThat(body.message()).isEqualTo("Geçersiz parametre değeri. Parametre: from");
        }

        @Test
        @DisplayName("NotFoundException -> 404 + 2001_FP_NOT_FOUND")
        void notFoundMapsToNotFound() {
            NotFoundException ex = new NotFoundException(
                    ErrorCode.NOT_FOUND,
                    "Kaynak bulunamadı. Kaynak: stock"
            );

            ResponseEntity<ApiErrorResponse> response = handler.handleNotFound(ex, mockRequest);

            ApiErrorResponse body = assertMappedResponse(response, 404, "2001_FP_NOT_FOUND");
            assertThat(body.message()).isEqualTo("Kaynak bulunamadı. Kaynak: stock");
        }

        @Test
        @DisplayName("ConflictException -> 409 + 2002_FP_CONFLICT")
        void conflictMapsToConflict() {
            ConflictException ex = new ConflictException(
                    ErrorCode.CONFLICT,
                    "Kayıt zaten mevcut. Alan: canonical_url"
            );

            ResponseEntity<ApiErrorResponse> response = handler.handleConflict(ex, mockRequest);

            ApiErrorResponse body = assertMappedResponse(response, 409, "2002_FP_CONFLICT");
            assertThat(body.message()).isEqualTo("Kayıt zaten mevcut. Alan: canonical_url");
        }

        @Test
        @DisplayName("ExternalApiException -> 503 + 4001_FP_FETCH_ERROR")
        void externalApiMapsToFetchError() {
            ExternalApiException ex = new ExternalApiException(
                    ErrorCode.FETCH_ERROR,
                    ServiceType.YAHOO,
                    "Dış veri kaynağına erişim başarısız. Kaynak: Yahoo Finance"
            );

            ResponseEntity<ApiErrorResponse> response = handler.handleExternalApi(ex, mockRequest);

            ApiErrorResponse body = assertMappedResponse(response, 503, "4001_FP_FETCH_ERROR");
            assertThat(body.message()).isEqualTo("[YAHOO] Dış veri kaynağına erişim başarısız. Kaynak: Yahoo Finance");
        }
    }

    @Nested
    @DisplayName("Spring framework exception'ları")
    class SpringExceptionMapping {

        @Test
        @DisplayName("MissingServletRequestParameterException -> 400 + 1001_FP_REQUIRED_FIELD")
        void missingRequestParameterMapsToRequiredField() {
            MissingServletRequestParameterException ex =
                    new MissingServletRequestParameterException("to", "LocalDate");

            ResponseEntity<ApiErrorResponse> response = handler.handleMissingParam(ex, mockRequest);

            ApiErrorResponse body = assertMappedResponse(response, 400, "1001_FP_REQUIRED_FIELD");
            assertThat(body.message()).contains("to");
        }

        @Test
        @DisplayName("MethodArgumentTypeMismatchException -> 400 + 1003_FP_INVALID_PARAMETER")
        void methodArgumentTypeMismatchMapsToInvalidParameter() {
            MethodArgumentTypeMismatchException ex = mock(MethodArgumentTypeMismatchException.class);
            when(ex.getName()).thenReturn("from");

            ResponseEntity<ApiErrorResponse> response = handler.handleTypeMismatch(ex, mockRequest);

            ApiErrorResponse body = assertMappedResponse(response, 400, "1003_FP_INVALID_PARAMETER");
            assertThat(body.message()).contains("from");
        }

        @Test
        @DisplayName("MethodArgumentNotValidException field error ile 400 + 1003_FP_INVALID_PARAMETER")
        void methodArgumentNotValidMapsFieldErrorToInvalidParameter() {
            MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
            BindingResult bindingResult = mock(BindingResult.class);
            FieldError fieldError = new FieldError("historyRequest", "from", "geçersiz");

            when(ex.getBindingResult()).thenReturn(bindingResult);
            when(bindingResult.getFieldError()).thenReturn(fieldError);

            ResponseEntity<ApiErrorResponse> response = handler.handleValidation(ex, mockRequest);

            ApiErrorResponse body = assertMappedResponse(response, 400, "1003_FP_INVALID_PARAMETER");
            assertThat(body.message()).isEqualTo("Geçersiz parametre değeri. Parametre: from");
        }

        @Test
        @DisplayName("MethodArgumentNotValidException field error yoksa generic validation mesajı döner")
        void methodArgumentNotValidWithoutFieldErrorReturnsGenericValidationMessage() {
            MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
            BindingResult bindingResult = mock(BindingResult.class);

            when(ex.getBindingResult()).thenReturn(bindingResult);
            when(bindingResult.getFieldError()).thenReturn(null);

            ResponseEntity<ApiErrorResponse> response = handler.handleValidation(ex, mockRequest);

            ApiErrorResponse body = assertMappedResponse(response, 400, "1003_FP_INVALID_PARAMETER");
            assertThat(body.message()).isEqualTo("Geçersiz istek gövdesi.");
        }

        @Test
        @DisplayName("ConstraintViolationException -> 400 + 1003_FP_INVALID_PARAMETER")
        void constraintViolationMapsToInvalidParameter() {
            ConstraintViolationException ex = new ConstraintViolationException(
                    "Geçersiz parametre değeri. Parametre: amount",
                    Collections.<ConstraintViolation<?>>emptySet()
            );

            ResponseEntity<ApiErrorResponse> response = handler.handleConstraintViolation(ex, mockRequest);

            ApiErrorResponse body = assertMappedResponse(response, 400, "1003_FP_INVALID_PARAMETER");
            assertThat(body.message()).isEqualTo("Geçersiz parametre değeri. Parametre: amount");
        }
    }

    @Nested
    @DisplayName("Data layer exception'ları")
    class DataLayerExceptionMapping {

        @Test
        @DisplayName("DataIntegrityViolationException -> 409 + 2002_FP_CONFLICT")
        void dataIntegrityViolationMapsToConflict() {
            DataIntegrityViolationException ex = new DataIntegrityViolationException(
                    "ERROR: duplicate key value violates unique constraint",
                    new RuntimeException("duplicate key value violates unique constraint")
            );

            ResponseEntity<ApiErrorResponse> response = handler.handleDataIntegrity(ex, mockRequest);

            ApiErrorResponse body = assertMappedResponse(response, 409, "2002_FP_CONFLICT");
            assertThat(body.message()).isEqualTo("Kayıt zaten mevcut.");
        }
    }

    @Nested
    @DisplayName("Generic exception")
    class GenericExceptionMapping {

        @Test
        @DisplayName("Unhandled Exception -> 500 + generic mesaj")
        void genericExceptionMapsToInternalServerError() {
            RuntimeException ex = new RuntimeException("Beklenmeyen hata");

            ResponseEntity<ApiErrorResponse> response = handler.handleUnhandled(ex, mockRequest);

            assertThat(response.getStatusCode().value()).isEqualTo(500);
            ApiErrorResponse body = response.getBody();
            assertThat(body).isNotNull();
            assertThat(body.errorCode()).isNull();
            assertThat(body.message()).isEqualTo("Sunucu tarafında beklenmedik bir hata oluştu.");
            assertThat(body.path()).isEqualTo(REQUEST_URI);
            assertThat(body.status()).isEqualTo(500);
            assertThat(body.timestamp()).isNotNull();
        }
    }

    @Nested
    @DisplayName("ApiErrorResponse şema bütünlüğü")
    class ApiErrorResponseSchema {

        @Test
        @DisplayName("Domain hatasında errorCode, message, timestamp, path ve status alanları doludur")
        void errorResponseContainsAllRequiredFields() {
            ConflictException ex = new ConflictException(
                    ErrorCode.CONFLICT,
                    "Kayıt zaten mevcut. Alan: canonical_url"
            );

            ResponseEntity<ApiErrorResponse> response = handler.handleConflict(ex, mockRequest);

            assertThat(response.getStatusCode().value()).isEqualTo(409);
            ApiErrorResponse body = response.getBody();
            assertThat(body).isNotNull();
            assertThat(body.errorCode()).isNotBlank();
            assertThat(body.message()).isNotBlank();
            assertThat(body.timestamp()).isNotNull();
            assertThat(body.path()).isNotBlank();
            assertThat(body.status()).isPositive();
        }
    }

    private ApiErrorResponse assertMappedResponse(
            ResponseEntity<ApiErrorResponse> response,
            int expectedStatus,
            String expectedErrorCode) {

        assertThat(response.getStatusCode().value()).isEqualTo(expectedStatus);
        ApiErrorResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.errorCode()).isEqualTo(expectedErrorCode);
        assertThat(body.path()).isEqualTo(REQUEST_URI);
        assertThat(body.status()).isEqualTo(expectedStatus);
        assertThat(body.timestamp()).isNotNull();
        return body;
    }
}
