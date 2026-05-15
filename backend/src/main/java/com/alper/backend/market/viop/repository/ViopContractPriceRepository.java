package com.alper.backend.market.viop.repository;

import com.alper.backend.market.viop.model.ViopContractPrice;
import org.springframework.data.jpa.repository.JpaRepository;

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
}
