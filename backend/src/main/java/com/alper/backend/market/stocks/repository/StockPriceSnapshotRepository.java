package com.alper.backend.market.stocks.repository;

import com.alper.backend.market.stocks.model.StockPriceSnapshot;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * StockPriceSnapshot varlığı için CRUD ve en güncel snapshot sorguları.
 */
@Repository
public interface StockPriceSnapshotRepository extends JpaRepository<StockPriceSnapshot, Long> {

    // Borsa kapanışında temizleme — bugünden önceki kayıtları sil
    void deleteByTradeDateBefore(LocalDate date);

    // Sadece BIST30 hisselerinin bugünkü en son snapshot kaydını getirir
    @EntityGraph(attributePaths = "stock")
    @Query("SELECT s FROM StockPriceSnapshot s WHERE s.tradeDate = CURRENT_DATE " +
            "AND s.stock.indexName = 'BIST30' " +
            "AND s.id = (SELECT MAX(s2.id) FROM StockPriceSnapshot s2 " +
            "WHERE s2.stock.id = s.stock.id AND s2.tradeDate = CURRENT_DATE) " +
            "ORDER BY s.stock.symbol ASC")
    List<StockPriceSnapshot> findTodaySnapshots();

    Optional<StockPriceSnapshot> findTopByStockIdAndTradeDateOrderByFetchedAtDesc(Long stockId, LocalDate tradeDate);

    Optional<StockPriceSnapshot> findFirstByStockIdOrderByFetchedAtDesc(Long stockId);
}
