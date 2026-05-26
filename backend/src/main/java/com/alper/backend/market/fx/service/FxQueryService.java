package com.alper.backend.market.fx.service;

import com.alper.backend.market.fx.model.ExchangeRate;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import com.alper.backend.market.fx.dto.FxResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

@Log4j2
@Service
@RequiredArgsConstructor
public class FxQueryService {

    private final ExchangeRateRepository exchangeRateRepository;

    @Cacheable(value = "fx", key = "'all'")
    public List<FxResponse> getAll() {
        log.debug("FX verileri DB'den çekiliyor...");
        return exchangeRateRepository.findLatestRates()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private FxResponse toResponse(ExchangeRate entity) {
        return FxResponse.builder()
                .id(entity.getId())
                .currencyCode(entity.getCurrencyCode())
                .currencyName(entity.getCurrencyName())
                .unit(entity.getUnit())
                .forexBuying(entity.getForexBuying())
                .forexSelling(entity.getForexSelling())
                .banknoteBuying(entity.getBanknoteBuying())
                .banknoteSelling(entity.getBanknoteSelling())
                .rateDate(entity.getRateDate())
                .build();
    }
}
