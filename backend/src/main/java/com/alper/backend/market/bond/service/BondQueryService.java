package com.alper.backend.market.bond.service;

import com.alper.backend.market.bond.model.BondRateHistory;
import com.alper.backend.market.bond.repository.BondRateHistoryRepository;
import com.alper.backend.market.bond.dto.BondResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

@Log4j2
@Service
@RequiredArgsConstructor
public class BondQueryService {

    private final BondRateHistoryRepository bondRateHistoryRepository;

    @Cacheable("bonds")
    public List<BondResponse> getAll() {
        log.debug("Bond verileri DB'den çekiliyor...");
        return bondRateHistoryRepository.findLatestRates()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private BondResponse toResponse(BondRateHistory entity) {
        return BondResponse.builder()
                .evdsSeriesCode(entity.getBond().getEvdsSeriesCode())
                .name(entity.getBond().getName())
                .bondType(entity.getBond().getBondType())
                .maturityDays(entity.getBond().getMaturityDays())
                .currency(entity.getBond().getCurrency())
                .interestRate(entity.getInterestRate())
                .compoundedRate(entity.getCompoundedRate())
                .rateDate(entity.getRateDate())
                .build();
    }
}