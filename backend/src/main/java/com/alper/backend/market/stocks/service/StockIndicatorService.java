package com.alper.backend.market.stocks.service;

import com.alper.backend.market.stocks.model.Stock;
import com.alper.backend.market.stocks.model.StockPriceHistory;
import com.alper.backend.market.stocks.model.StockTechnicalIndicator;
import com.alper.backend.market.stocks.repository.StockPriceHistoryRepository;
import com.alper.backend.market.stocks.repository.StockRepository;
import com.alper.backend.market.stocks.repository.StockTechnicalIndicatorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Log4j2
@Service
@RequiredArgsConstructor
public class StockIndicatorService {

    // SMA200 warm-up + biraz buffer. Ichimoku Senkou B için 52 zaten yeterli.
    private static final int LOOKBACK_DAYS = 400;

    private final StockRepository stockRepository;
    private final StockPriceHistoryRepository priceHistoryRepository;
    private final StockTechnicalIndicatorRepository indicatorRepository;
    private final TechnicalIndicatorCalculator calculator;

    /**
     * Tüm aktif hisseler için indikatör hesapla (scheduler tarafından çağrılır).
     * Her hisse ayrı transaction — biri patlarsa diğerleri etkilenmez.
     */
    public void recalculateAll() {
        List<Stock> stocks = stockRepository.findByIsActiveTrue();
        log.info("Indikatör hesaplama başladı | hisse sayısı={}", stocks.size());

        int success = 0;
        int failed  = 0;
        for (Stock stock : stocks) {
            try {
                recalculateForStock(stock);
                success++;
            } catch (Exception e) {
                failed++;
                log.warn("Indikatör hesaplama başarısız: {} → {}", stock.getSymbol(), e.getMessage());
            }
        }
        log.info("Indikatör hesaplama tamamlandı | başarılı={} | başarısız={}", success, failed);
    }

    /**
     * Tek hisse için son LOOKBACK_DAYS günün indikatörlerini hesaplar ve upsert eder.
     */
    @Transactional
    public void recalculateForStock(Stock stock) {
        LocalDate today = LocalDate.now();
        LocalDate from  = today.minusDays(LOOKBACK_DAYS);

        List<StockPriceHistory> history = priceHistoryRepository
                .findByStock_SymbolAndTradeDateBetweenOrderByTradeDateAsc(stock.getSymbol(), from, today);

        if (history.size() < 30) {
            log.debug("Yetersiz veri, atlandı: {} ({} gün)", stock.getSymbol(), history.size());
            return;
        }

        Map<LocalDate, IndicatorSnapshot> snapshots = calculator.calculate(history);

        int written = 0;
        for (IndicatorSnapshot snap : snapshots.values()) {
            upsert(stock, snap);
            written++;
        }
        log.debug("Indikatör yazıldı: {} | {} satır", stock.getSymbol(), written);
    }

    private void upsert(Stock stock, IndicatorSnapshot snap) {
        Optional<StockTechnicalIndicator> existing =
                indicatorRepository.findByStockIdAndTradeDate(stock.getId(), snap.getTradeDate());

        StockTechnicalIndicator entity = existing.orElseGet(() ->
                StockTechnicalIndicator.builder()
                        .stock(stock)
                        .tradeDate(snap.getTradeDate())
                        .build()
        );

        entity.setRsi14(snap.getRsi14());
        entity.setMacdLine(snap.getMacdLine());
        entity.setMacdSignal(snap.getMacdSignal());
        entity.setMacdHistogram(snap.getMacdHistogram());
        entity.setSma20(snap.getSma20());
        entity.setSma50(snap.getSma50());
        entity.setSma200(snap.getSma200());
        entity.setEma12(snap.getEma12());
        entity.setEma26(snap.getEma26());

        entity.setBollingerUpper(snap.getBollingerUpper());
        entity.setBollingerMiddle(snap.getBollingerMiddle());
        entity.setBollingerLower(snap.getBollingerLower());
        entity.setStochasticK(snap.getStochasticK());
        entity.setStochasticD(snap.getStochasticD());
        entity.setAtr14(snap.getAtr14());
        entity.setIchimokuTenkan(snap.getIchimokuTenkan());
        entity.setIchimokuKijun(snap.getIchimokuKijun());
        entity.setIchimokuSenkouA(snap.getIchimokuSenkouA());
        entity.setIchimokuSenkouB(snap.getIchimokuSenkouB());

        indicatorRepository.save(entity);
    }
}