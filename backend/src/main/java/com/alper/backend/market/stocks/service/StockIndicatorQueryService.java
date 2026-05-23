package com.alper.backend.market.stocks.service;

import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.market.stocks.model.StockTechnicalIndicator;
import com.alper.backend.market.stocks.repository.StockTechnicalIndicatorRepository;
import com.alper.backend.market.stocks.dto.StockIndicatorResponse;
import com.alper.backend.market.stocks.mapper.StockIndicatorMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

@Log4j2
@Service
@RequiredArgsConstructor
public class StockIndicatorQueryService {

    private final StockTechnicalIndicatorRepository indicatorRepository;
    private final StockIndicatorMapper mapper;

    /**
     * Dashboard için en son indikatör satırı.
     * Cache key: symbol (büyük harf). 1 saat TTL (RedisConfig'de tanımlı).
     */
    @Cacheable(value = "stock-indicator-latest", key = "#symbol.toUpperCase()")
    @Transactional(readOnly = true)
    public StockIndicatorResponse getLatest(String symbol) {
        log.debug("Indikatör latest sorgusu: {}", symbol);
        StockTechnicalIndicator entity = indicatorRepository
                .findTopByStock_SymbolOrderByTradeDateDesc(symbol.toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new NotFoundException(
                        "Indikatör verisi bulunamadı: " + symbol));
        return mapper.toDto(entity);
    }

    /**
     * Grafik için tarih aralığı.
     * Cache key: symbol + from + to. Aynı aralık tekrar istenirse cache'ten döner.
     */
    @Cacheable(
            value = "stock-indicator-history",
            key = "#symbol.toUpperCase() + ':' + #from + ':' + #to"
    )
    @Transactional(readOnly = true)
    public List<StockIndicatorResponse> getHistory(String symbol, LocalDate from, LocalDate to) {
        log.debug("Indikatör history sorgusu: {} | {} → {}", symbol, from, to);

        if (from.isAfter(to)) {
            throw new IllegalArgumentException("'from' tarihi 'to'dan sonra olamaz");
        }

        List<StockTechnicalIndicator> rows = indicatorRepository
                .findByStock_SymbolAndTradeDateBetweenOrderByTradeDateAsc(
                        symbol.toUpperCase(Locale.ROOT), from, to);

        return rows.stream().map(mapper::toDto).toList();
    }
}