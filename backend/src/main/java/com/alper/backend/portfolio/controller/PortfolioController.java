package com.alper.backend.portfolio.controller;

import com.alper.backend.common.web.ApiErrorResponse;
import com.alper.backend.common.web.ApiResponse;
import com.alper.backend.portfolio.dto.CreatePortfolioRequest;
import com.alper.backend.portfolio.dto.PortfolioResponse;
import com.alper.backend.portfolio.dto.UpdatePortfolioRequest;
import com.alper.backend.portfolio.service.PortfolioService;
import com.alper.backend.user.model.User;
import com.alper.backend.user.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Kullanıcının portföylerini yönetmek için REST uç noktaları.
 *
 * <p>Portföy oluşturma, listeleme, görüntüleme, güncelleme, silme ve toplam değerleme
 * sorgularını içerir. Tüm uç noktalar oturum açmış kullanıcıyı {@code @CurrentUser}
 * ile bekler.</p>
 */
@RestController
@RequestMapping("/api/v1/portfolios")
@RequiredArgsConstructor
@Log4j2
@Tag(name = "Portfolio", description = "Portföy yönetimi (FR-19, FR-20)")
public class PortfolioController {

    private final PortfolioService portfolioService;

    @GetMapping
    @Operation(summary = "Kullanıcının tüm portföylerini listeler (özet, items dahil değil)")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200", description = "Başarılı"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "401", description = "Kimlik doğrulama başarısız",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ApiResponse<List<PortfolioResponse>> findAll(@CurrentUser User user) {
        log.debug("Portföy listesi isteği. userId={}", user.getId());
        return ApiResponse.success(portfolioService.findAllByUser(user.getId()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Portföy detayı (items + güncel değerleme + P/L)")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200", description = "Başarılı"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404", description = "Portföy bulunamadı",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ApiResponse<PortfolioResponse> findById(@PathVariable Long id, @CurrentUser User user) {
        log.debug("Portföy detay isteği. portfolioId={}, userId={}", id, user.getId());
        return ApiResponse.success(portfolioService.findById(id, user.getId()));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Yeni portföy oluştur")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "201", description = "Portföy oluşturuldu"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400", description = "Validasyon hatası",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ApiResponse<PortfolioResponse> create(
            @Valid @RequestBody CreatePortfolioRequest request,
            @CurrentUser User user
    ) {
        log.info("Portföy oluşturma isteği. userId={}, name={}", user.getId(), request.name());
        return ApiResponse.success(portfolioService.create(request, user.getId()));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Portföy adını günceller")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200", description = "Başarılı"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404", description = "Portföy bulunamadı",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ApiResponse<PortfolioResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdatePortfolioRequest request,
            @CurrentUser User user
    ) {
        log.info("Portföy güncelleme isteği. portfolioId={}, userId={}", id, user.getId());
        return ApiResponse.success(portfolioService.update(id, user.getId(), request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Portföyü siler. İçinde pozisyon veya bekleyen emir varsa 409 Conflict döner.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "204", description = "Silindi"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404", description = "Portföy bulunamadı",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "409", description = "Portföyde pozisyon veya bekleyen emir mevcut",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public void delete(@PathVariable Long id, @CurrentUser User user) {
        log.info("Portföy silme isteği. portfolioId={}, userId={}", id, user.getId());
        portfolioService.delete(id, user.getId());
    }
}
