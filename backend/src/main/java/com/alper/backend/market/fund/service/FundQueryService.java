package com.alper.backend.market.fund.service;

import com.alper.backend.market.fund.dto.FundAllocationResponse;
import com.alper.backend.market.fund.model.Fund;
import com.alper.backend.market.fund.model.FundAllocation;
import com.alper.backend.market.fund.model.FundPrice;
import com.alper.backend.market.fund.repository.FundAllocationRepository;
import com.alper.backend.market.fund.repository.FundPriceRepository;
import com.alper.backend.market.fund.repository.FundRepository;
import com.alper.backend.market.fund.dto.FundResponse;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

@Log4j2
@Service
@RequiredArgsConstructor
public class FundQueryService {

    private final FundPriceRepository fundPriceRepository;
    private final FundRepository fundRepository;
    private final FundAllocationRepository fundAllocationRepository;

    @Cacheable(value = "funds", key = "'priced'")
    public List<FundResponse> getAll() {
        log.debug("Fon verileri DB'den çekiliyor...");
        return fundPriceRepository.findLatestPrices()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Cacheable(value = "funds", key = "'all'")
    public List<FundResponse> getAllIncludingUnpriced() {
        log.debug("Tüm fon master verileri son fiyatlarıyla DB'den çekiliyor...");
        return fundRepository.findAllWithLatestPrice()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public FundAllocationResponse getLatestAllocation(String code) {
        Fund fund = fundRepository.findByCode(code)
                .orElseThrow(() -> new EntityNotFoundException("Fon bulunamadı: " + code));
        FundAllocation a = fundAllocationRepository
                .findTopByFundIdOrderByAllocationDateDesc(fund.getId())
                .orElseThrow(() -> new EntityNotFoundException("Fon dağılımı bulunamadı: " + code));
        return FundAllocationResponse.builder()
                .allocationDate(a.getAllocationDate())
                .hs(a.getHs())
                .yhs(a.getYhs())
                .kb(a.getKb())
                .ob(a.getOb())
                .ykb(a.getYkb())
                .yob(a.getYob())
                .tpp(a.getTpp())
                .vdm(a.getVdm())
                .vm(a.getVm())
                .r(a.getR())
                .t(a.getT())
                .d(a.getD())
                .gas(a.getGas())
                .byf(a.getByf())
                .vint(a.getVint())
                .diger(a.getDiger())
                .build();
    }

    private FundResponse toResponse(FundPrice entity) {
        return FundResponse.builder()
                .id(entity.getFund().getId())
                .code(entity.getFund().getCode())
                .name(entity.getFund().getName())
                .fundType(entity.getFund().getFundType())
                .price(entity.getPrice())
                .totalShares(entity.getTotalShares())
                .investorCount(entity.getInvestorCount())
                .portfolioSize(entity.getPortfolioSize())
                .priceDate(entity.getPriceDate())
                .build();
    }

    private FundResponse toResponse(Object[] row) {
        Fund fund = (Fund) row[0];
        FundPrice price = (FundPrice) row[1];

        FundResponse.FundResponseBuilder builder = FundResponse.builder()
                .id(fund.getId())
                .code(fund.getCode())
                .name(fund.getName())
                .fundType(fund.getFundType());

        if (price == null) {
            return builder.build();
        }

        return builder
                .price(price.getPrice())
                .totalShares(price.getTotalShares())
                .investorCount(price.getInvestorCount())
                .portfolioSize(price.getPortfolioSize())
                .priceDate(price.getPriceDate())
                .build();
    }
}
