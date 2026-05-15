package com.alper.backend.market.stocks.repository;

import com.alper.backend.market.stocks.model.StockPriceHistory;
import com.alper.backend.market.stocks.model.InstrumentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
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

    Optional<StockPriceHistory> findFirstByStockIdOrderByTradeDateDesc(Long stockId);

    @EntityGraph(attributePaths = "stock")
    @Query("""
            SELECT h FROM StockPriceHistory h
            WHERE h.stock.isActive = true
              AND h.tradeDate = (
                SELECT MAX(h2.tradeDate) FROM StockPriceHistory h2
                WHERE h2.stock.id = h.stock.id
              )
            ORDER BY h.stock.symbol ASC
            """)
    List<StockPriceHistory> findLatestPerActiveStock();

    @EntityGraph(attributePaths = "stock")
    @Query("""
            SELECT h FROM StockPriceHistory h
            WHERE h.stock.isActive = true
              AND h.stock.instrumentType = :instrumentType
              AND h.tradeDate = (
                SELECT MAX(h2.tradeDate) FROM StockPriceHistory h2
                WHERE h2.stock.id = h.stock.id
              )
            ORDER BY h.stock.symbol ASC
            """)
    List<StockPriceHistory> findLatestPerActiveInstrumentType(InstrumentType instrumentType);
}
