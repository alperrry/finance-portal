package com.alper.backend.portfolio.simulation.service;

import com.alper.backend.market.common.TurkishHolidayUtil;
import com.alper.backend.market.fx.model.ExchangeRate;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import com.alper.backend.portfolio.simulation.exception.HistoricalDataMissingException;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

/**
 * Belirtilen para birimi ve {@link RateDirection} (alış/satış) için tarihsel kuru çözer.
 *
 * <p>İstenen tarih ve 7 güne kadar geriye, işlem günü filtreli arama yapar; bulamazsa
 * {@link HistoricalDataMissingException} fırlatır. Sonuçlar {@code historicalRates}
 * cache'inde tutulur.</p>
 */
@Service
@RequiredArgsConstructor
public class HistoricalRateResolver {

    private final ExchangeRateRepository exchangeRateRepository;

    @Cacheable(value = "historicalRates", key = "#currency + ':' + #direction.name() + ':' + #requestedDate")
    public BigDecimal resolve(String currency, LocalDate requestedDate, RateDirection direction) {
        for (int i = 0; i <= 7; i++) {
            LocalDate candidate = requestedDate.minusDays(i);
            if (!TurkishHolidayUtil.isTradingDay(candidate)) continue;

            Optional<ExchangeRate> rateOpt =
                    exchangeRateRepository.findByCurrencyCodeAndRateDate(currency, candidate);
            if (rateOpt.isEmpty()) continue;

            ExchangeRate rate = rateOpt.get();
            BigDecimal value = direction == RateDirection.SELLING
                    ? rate.getForexSelling()
                    : rate.getForexBuying();

            if (value != null && value.compareTo(BigDecimal.ZERO) > 0) {
                return value;
            }
        }
        throw new HistoricalDataMissingException(currency, requestedDate, direction);
    }
}
