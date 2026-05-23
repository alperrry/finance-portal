package com.alper.backend.portfolio.simulation.service;

import com.alper.backend.market.common.TurkishHolidayUtil;
import com.alper.backend.market.fund.repository.FundPriceRepository;
import com.alper.backend.portfolio.simulation.exception.HistoricalDataMissingException;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class HistoricalFundPriceResolver {

    private final FundPriceRepository fundPriceRepository;

    @Cacheable(value = "fundHist", key = "#code + ':' + #requestedDate")
    public BigDecimal resolve(String code, LocalDate requestedDate) {
        for (int i = 0; i <= 7; i++) {
            LocalDate candidate = requestedDate.minusDays(i);
            if (!TurkishHolidayUtil.isTradingDay(candidate)) continue;

            var opt = fundPriceRepository.findByFund_CodeAndPriceDate(code, candidate);
            if (opt.isEmpty()) continue;

            BigDecimal price = opt.get().getPrice();
            if (price != null && price.compareTo(BigDecimal.ZERO) > 0) {
                return price;
            }
        }
        throw new HistoricalDataMissingException(code, requestedDate, null);
    }
}
