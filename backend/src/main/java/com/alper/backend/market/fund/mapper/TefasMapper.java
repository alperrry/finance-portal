package com.alper.backend.market.fund.mapper;

import com.alper.backend.market.fund.dto.TefasHistoryAllocation;
import com.alper.backend.market.fund.dto.TefasHistoryInfo;
import com.alper.backend.market.fund.model.Fund;
import com.alper.backend.market.fund.model.FundAllocation;
import com.alper.backend.market.fund.model.FundPrice;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * TEFAS API yanıtlarını fon fiyat ({@link FundPrice}) ve portföy dağılımı
 * ({@link FundAllocation}) entity'lerine dönüştüren mapper.
 *
 * <p>TEFAS tarihleri hem epoch millis hem ISO format gelebildiğinden iki biçim de
 * desteklenir (İstanbul saat dilimi esas alınır).</p>
 */
@Component
public class TefasMapper {

    /**
     * TEFAS fiyat kaydını entity'ye dönüştürür.
     *
     * @param dto  TEFAS geçmiş fiyat kaydı
     * @param fund fiyatın bağlanacağı fon
     * @return oluşturulan fiyat entity'si
     */
    public FundPrice toFundPriceEntity(TefasHistoryInfo dto, Fund fund) {
        return FundPrice.builder()
                .fund(fund)
                .priceDate(toLocalDate(dto.getTarih()))
                .price(dto.getFiyat())
                .totalShares(dto.getTedPaySayisi())
                .investorCount(dto.getKisiSayisi() != null ? dto.getKisiSayisi().intValue() : null)
                .portfolioSize(dto.getPortfoyBuyukluk())
                .build();
    }

    /**
     * TEFAS portföy dağılım kaydını entity'ye dönüştürür.
     *
     * @param dto  TEFAS dağılım kaydı (varlık sınıfı yüzdeleri)
     * @param fund dağılımın bağlanacağı fon
     * @return oluşturulan dağılım entity'si
     */
    public FundAllocation toFundAllocationEntity(TefasHistoryAllocation dto, Fund fund) {
        return FundAllocation.builder()
                .fund(fund)
                .allocationDate(toLocalDate(dto.getTarih()))
                .hs(dto.getHs())
                .yhs(dto.getYhs())
                .kb(dto.getKb())
                .ob(dto.getOb())
                .ykb(dto.getYkb())
                .yob(dto.getYob())
                .tpp(dto.getTpp())
                .vdm(dto.getVdm())
                .vm(dto.getVm())
                .r(dto.getR())
                .t(dto.getT())
                .d(dto.getD())
                .gas(dto.getGas())
                .byf(dto.getByf())
                .vint(dto.getVint())
                .diger(dto.getDiger())
                .build();
    }

    private LocalDate toLocalDate(String epochMillis) {
        if (epochMillis != null && epochMillis.contains("-")) {
            return LocalDate.parse(epochMillis);
        }
        return Instant.ofEpochMilli(Long.parseLong(epochMillis))
                .atZone(ZoneId.of("Europe/Istanbul"))
                .toLocalDate();
    }
}
