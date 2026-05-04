package com.alper.backend.market.fund.service;

import com.alper.backend.market.fund.model.FundPrice;
import com.alper.backend.market.fund.repository.FundPriceRepository;
import com.alper.backend.market.fund.dto.FundResponse;
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

    @Cacheable("funds")
    public List<FundResponse> getAll() {
        log.debug("Fon verileri DB'den çekiliyor...");
        return fundPriceRepository.findLatestPrices()
                .stream()
                .map(this::toResponse)
                .toList();
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
}
