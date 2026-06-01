package com.alper.backend.market.stocks.repository;

import com.alper.backend.market.stocks.model.StockTechnicalIndicator;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * StockTechnicalIndicator varlığı için CRUD ve son gösterge sorguları.
 */
@Repository
public interface StockTechnicalIndicatorRepository extends JpaRepository<StockTechnicalIndicator, Long> {

    // Duplicate kontrolü — aynı gün aynı hisse tekrar hesaplanmasın
    Optional<StockTechnicalIndicator> findByStockIdAndTradeDate(Long stockId, LocalDate tradeDate);
    // Grafik için tarih aralığı sorgusu (symbol üzerinden join)
    List<StockTechnicalIndicator> findByStock_SymbolAndTradeDateBetweenOrderByTradeDateAsc(
            String symbol, LocalDate from, LocalDate to);

    // Dashboard için — symbol üzerinden en son satır
    Optional<StockTechnicalIndicator> findTopByStock_SymbolOrderByTradeDateDesc(String symbol);
    // En son hesaplanan tarihi bul
    Optional<StockTechnicalIndicator> findTopByStockIdOrderByTradeDateDesc(Long stockId);
}