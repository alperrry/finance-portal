package com.alper.backend.portfolio.simulation.service;

import com.alper.backend.market.common.TurkishHolidayUtil;
import com.alper.backend.market.stocks.repository.StockPriceHistoryRepository;
import com.alper.backend.portfolio.simulation.exception.HistoricalDataMissingException;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Belirtilen sembol için belirli bir tarihteki kapanış fiyatını çözer.
 *
 * <p>İstenen tarih ve 7 güne kadar geriye, işlem günü filtreli arama yapar; bulamazsa
 * {@link HistoricalDataMissingException} fırlatır. Sonuçlar {@code stockHist} cache'inde
 * tutulur.</p>
 */
@Service
@RequiredArgsConstructor
public class HistoricalStockPriceResolver {

    private final StockPriceHistoryRepository stockPriceHistoryRepository;

    @Cacheable(value = "stockHist", key = "#symbol + ':' + #requestedDate")
    public BigDecimal resolve(String symbol, LocalDate requestedDate) {
        for (int i = 0; i <= 7; i++) {
            LocalDate candidate = requestedDate.minusDays(i);
            if (!TurkishHolidayUtil.isTradingDay(candidate)) continue;

            var opt = stockPriceHistoryRepository.findByStock_SymbolAndTradeDate(symbol, candidate);
            if (opt.isEmpty()) continue;

            BigDecimal price = opt.get().getClosePrice();
            if (price != null && price.compareTo(BigDecimal.ZERO) > 0) {
                return price;
            }
        }
        throw new HistoricalDataMissingException(symbol, requestedDate, null);
    }
}
