package com.alper.backend.market.viop.repository;

import com.alper.backend.market.viop.model.ViopContractPrice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * ViopContractPrice varlığı için CRUD ve sözleşme/tarih bazlı sorgular.
 */
public interface ViopContractPriceRepository extends JpaRepository<ViopContractPrice, Long> {
    boolean existsByMarketSegmentAndContractNameAndTradeDate(String marketSegment, String contractName, LocalDate tradeDate);

    boolean existsByTradeDate(LocalDate tradeDate);

    List<ViopContractPrice> findByTradeDateBetweenOrderByMarketSegmentAscContractNameAsc(
            LocalDate from, LocalDate to);

    List<ViopContractPrice> findByMarketSegmentAndTradeDateBetweenOrderByContractNameAsc(
            String marketSegment, LocalDate from, LocalDate to);

    List<ViopContractPrice> findByContractNameAndTradeDateBetweenOrderByTradeDateAsc(
            String contractName, LocalDate from, LocalDate to);

    @Query("SELECT v FROM ViopContractPrice v WHERE v.tradeDate = (SELECT MAX(v2.tradeDate) FROM ViopContractPrice v2 WHERE v2.contractName = v.contractName) ORDER BY v.marketSegment ASC, v.contractName ASC")
    List<ViopContractPrice> findLatestByContractName();

    Optional<ViopContractPrice> findFirstByMarketSegmentAndContractNameOrderByTradeDateDesc(
            String marketSegment, String contractName);

    List<ViopContractPrice> findTop8ByContractNameOrderByTradeDateDesc(String contractName);
}
