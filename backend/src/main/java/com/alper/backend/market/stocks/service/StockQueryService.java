package com.alper.backend.market.stocks.service;

import com.alper.backend.market.stocks.dto.StockResponse;
import com.alper.backend.market.stocks.model.InstrumentType;
import com.alper.backend.market.stocks.model.StockPriceHistory;
import com.alper.backend.market.stocks.repository.StockPriceHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

/**
 * Hisse senedi okuma servisi: liste, detay, fiyat geçmişi ve snapshot.
 *
 * <p>Read-only; {@link StockPriceHistoryRepository} ve ilgili snapshot/stock
 * repository'lerini kullanır.</p>
 */
@Log4j2
@Service
@RequiredArgsConstructor
public class StockQueryService {

    private final StockPriceHistoryRepository historyRepository;

    @Cacheable(value = "stocks", key = "'STOCK'")
    public List<StockResponse> getAll() {
        log.debug("Günlük hisse verileri DB'den çekiliyor...");
        return getByInstrumentType(InstrumentType.STOCK);
    }

    @Cacheable(value = "stocks", key = "#instrumentType.name()")
    public List<StockResponse> getByInstrumentType(InstrumentType instrumentType) {
        log.debug("Günlük enstrüman verileri DB'den çekiliyor. type={}", instrumentType);
        return historyRepository.findLatestPerActiveInstrumentType(instrumentType)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private StockResponse toResponse(StockPriceHistory entity) {
        BigDecimal change = null;
        BigDecimal changePercent = null;
        if (entity.getOpenPrice() != null && entity.getOpenPrice().compareTo(BigDecimal.ZERO) != 0) {
            change = entity.getClosePrice().subtract(entity.getOpenPrice());
            changePercent = change.multiply(BigDecimal.valueOf(100))
                    .divide(entity.getOpenPrice(), 4, java.math.RoundingMode.HALF_UP);
        }
        return StockResponse.builder()
                .id(entity.getStock().getId())
                .symbol(entity.getStock().getSymbol())
                .shortName(entity.getStock().getShortName())
                .longName(entity.getStock().getLongName())
                .sector(entity.getStock().getSector())
                .indexName(entity.getStock().getIndexName())
                .instrumentType(entity.getStock().getInstrumentType() != null
                        ? entity.getStock().getInstrumentType().name()
                        : InstrumentType.STOCK.name())
                .currency(entity.getStock().getCurrency())
                .price(entity.getClosePrice())
                .change(change)
                .changePercent(changePercent)
                .open(entity.getOpenPrice())
                .dayHigh(entity.getHighPrice())
                .dayLow(entity.getLowPrice())
                .volume(entity.getVolume())
                .previousClose(entity.getStock().getPreviousClose())
                .fiftyTwoWeekHigh(entity.getStock().getFiftyTwoWeekHigh())
                .fiftyTwoWeekLow(entity.getStock().getFiftyTwoWeekLow())
                .marketCap(entity.getStock().getMarketCap())
                .tradeDate(entity.getTradeDate())
                .fetchedAt(entity.getCreatedAt())
                .build();
    }
}
