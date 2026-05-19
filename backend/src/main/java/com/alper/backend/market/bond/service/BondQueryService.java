package com.alper.backend.market.bond.service;

import com.alper.backend.market.bond.model.Bond;
import com.alper.backend.market.bond.model.BondRateHistory;
import com.alper.backend.market.bond.repository.BondRepository;
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
    private final BondRepository bondRepository;

    @Cacheable(value = "bonds", key = "'priced'")
    public List<BondResponse> getAll() {
        log.debug("Bond verileri DB'den çekiliyor...");
        return bondRateHistoryRepository.findLatestRates()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Cacheable(value = "bonds", key = "'all'")
    public List<BondResponse> getAllIncludingUnpriced() {
        log.debug("Tüm aktif bond master verileri son rate kayıtlarıyla DB'den çekiliyor...");
        return bondRepository.findActiveWithLatestRate()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private BondResponse toResponse(BondRateHistory entity) {
        return BondResponse.builder()
                .id(entity.getBond().getId())
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

    private BondResponse toResponse(Object[] row) {
        Bond bond = (Bond) row[0];
        BondRateHistory latestRate = (BondRateHistory) row[1];

        BondResponse.BondResponseBuilder builder = BondResponse.builder()
                .id(bond.getId())
                .evdsSeriesCode(bond.getEvdsSeriesCode())
                .name(bond.getName())
                .bondType(bond.getBondType())
                .maturityDays(bond.getMaturityDays())
                .currency(bond.getCurrency());

        if (latestRate == null) {
            return builder.build();
        }

        return builder
                .interestRate(latestRate.getInterestRate())
                .compoundedRate(latestRate.getCompoundedRate())
                .rateDate(latestRate.getRateDate())
                .build();
    }
}
