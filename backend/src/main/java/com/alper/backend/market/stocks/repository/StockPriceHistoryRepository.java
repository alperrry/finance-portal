package com.alper.backend.market.stocks.repository;

import com.alper.backend.market.stocks.model.StockPriceHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface StockPriceHistoryRepository extends JpaRepository<StockPriceHistory, Long> {
    List<StockPriceHistory> findByStock_SymbolAndTradeDateBetweenOrderByTradeDateAsc(
            String symbol, LocalDate from, LocalDate to);
    long countByStockIdAndTradeDateBetween(Long stockId, LocalDate start, LocalDate end);
    List<StockPriceHistory> findByStock_SymbolInAndTradeDateBetweenOrderByTradeDateAsc(
            List<String> symbols, LocalDate from, LocalDate to);
    // Duplicate kontrolü — aynı gün aynı hisse tekrar eklenmesin
    Optional<StockPriceHistory> findByStockIdAndTradeDate(Long stockId, LocalDate tradeDate);

    // Bootstrap için — en son çekilen tarihi bul
    Optional<StockPriceHistory> findTopByStockIdOrderByTradeDateDesc(Long stockId);
}