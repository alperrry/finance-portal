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

@Component
public class TefasMapper {

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
        return Instant.ofEpochMilli(Long.parseLong(epochMillis))
                .atZone(ZoneId.of("Europe/Istanbul"))
                .toLocalDate();
    }
}