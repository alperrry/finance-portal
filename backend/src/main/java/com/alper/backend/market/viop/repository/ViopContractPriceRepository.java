package com.alper.backend.market.viop.repository;

import com.alper.backend.market.viop.model.ViopContractPrice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;

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

    List<ViopContractPrice> findTop8ByContractNameOrderByTradeDateDesc(String contractName);
}
