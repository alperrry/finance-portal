package com.alper.backend.portfolio.controller;

import com.alper.backend.common.web.ApiErrorResponse;
import com.alper.backend.common.web.ApiResponse;
import com.alper.backend.portfolio.dto.TradeRequest;
import com.alper.backend.portfolio.dto.TradeResponse;
import com.alper.backend.portfolio.model.TransactionStatus;
import com.alper.backend.portfolio.service.TradeService;
import com.alper.backend.user.model.User;
import com.alper.backend.user.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1/portfolios/{portfolioId}/trades")
@RequiredArgsConstructor
@Log4j2
@Tag(name = "Trade", description = "Alış/satış (limit order) yönetimi (FR-21, FR-22)")
public class TradeController {

    private final TradeService tradeService;

    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(summary = "Yeni alış/satış (limit order) talebi oluştur. Bond için anında işlenir, diğerleri PENDING'e düşer.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "202", description = "Talep alındı"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400", description = "Validasyon veya iş kuralı ihlali",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404", description = "Portföy veya enstrüman bulunamadı",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ApiResponse<TradeResponse> submit(
            @PathVariable Long portfolioId,
            @Valid @RequestBody TradeRequest request,
            @CurrentUser User user
    ) {
        log.info("Trade submit. portfolioId={}, userId={}, type={}, instrumentType={}, instrumentId={}",
                portfolioId, user.getId(), request.transactionType(), request.instrumentType(), request.instrumentId());
        return ApiResponse.success(tradeService.submitTrade(portfolioId, user.getId(), request));
    }

    @GetMapping
    @Operation(summary = "Portföye ait işlemleri listeler (sayfalı, opsiyonel status filtresi)")
    public ApiResponse<Page<TradeResponse>> list(
            @PathVariable Long portfolioId,
            @Parameter(description = "Status filtresi (PENDING/APPROVED/REJECTED/CANCELLED)")
            @RequestParam(required = false) TransactionStatus status,
            Pageable pageable,
            @CurrentUser User user
    ) {
        log.debug("Trade listesi isteği. portfolioId={}, userId={}, status={}", portfolioId, user.getId(), status);
        return ApiResponse.success(tradeService.getTrades(portfolioId, user.getId(), status, pageable));
    }

    @GetMapping("/since")
    @Operation(summary = "Belirtilen tarihten sonra güncellenen işlemler. WebSocket reconnect için.")
    public ApiResponse<List<TradeResponse>> listSince(
            @PathVariable Long portfolioId,
            @Parameter(description = "ISO-8601 instant", example = "2026-05-02T11:00:00Z")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant since,
            @CurrentUser User user
    ) {
        log.debug("Trade since isteği. portfolioId={}, userId={}, since={}", portfolioId, user.getId(), since);
        return ApiResponse.success(tradeService.getTradesSince(portfolioId, user.getId(), since));
    }

    @GetMapping("/{tradeId}")
    @Operation(summary = "Tek bir işlem detayı")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200", description = "Başarılı"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404", description = "İşlem bulunamadı",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ApiResponse<TradeResponse> getById(
            @PathVariable Long portfolioId,
            @PathVariable Long tradeId,
            @CurrentUser User user
    ) {
        log.debug("Trade detay isteği. portfolioId={}, tradeId={}, userId={}", portfolioId, tradeId, user.getId());
        return ApiResponse.success(tradeService.getTradeById(portfolioId, user.getId(), tradeId));
    }

    @DeleteMapping("/{tradeId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "PENDING durumdaki işlemi iptal eder (CANCELLED)")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "204", description = "İptal edildi"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400", description = "İşlem PENDING durumda değil",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404", description = "İşlem bulunamadı",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public void cancel(
            @PathVariable Long portfolioId,
            @PathVariable Long tradeId,
            @CurrentUser User user
    ) {
        log.info("Trade iptal isteği. portfolioId={}, tradeId={}, userId={}", portfolioId, tradeId, user.getId());
        tradeService.cancelTrade(portfolioId, user.getId(), tradeId);
    }
}