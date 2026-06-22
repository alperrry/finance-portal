package com.alper.backend.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.time.LocalDate;
import java.util.List;

/**
 * Admin dashboard operasyonel özet yanıtı.
 *
 * <p>İki blok içerir: genel sayımlar (kullanıcı/haber/kaynak/audit) ve piyasa veri
 * modüllerinin tazelik durumu (son güncelleme + kayıt sayısı + bayat mı).</p>
 */
@Builder
@Schema(description = "Admin dashboard özet yanıtı")
public record DashboardSummaryResponse(

        @Schema(description = "Genel sayımlar")
        Counts counts,

        @Schema(description = "Modül bazlı piyasa veri tazeliği")
        List<ModuleFreshness> marketFreshness
) {

    @Builder
    @Schema(description = "Dashboard özet sayımları")
    public record Counts(
            long totalUsers,
            long activeUsers,
            long adminUsers,
            long totalNews,
            long news24h,
            long publishedNews,
            long totalSources,
            long activeSources,
            long totalCategories,
            long audit24h
    ) {
    }

    @Builder
    @Schema(description = "Tek bir piyasa modülünün veri tazeliği")
    public record ModuleFreshness(

            @Schema(description = "Modül kodu", example = "stocks")
            String module,

            @Schema(description = "En son veri günü (null ise hiç veri yok)")
            LocalDate lastUpdated,

            @Schema(description = "Toplam kayıt sayısı", example = "12450")
            long recordCount,

            @Schema(description = "Veri bayat mı (eşikten eski veya hiç yok)")
            boolean stale
    ) {
    }
}
