package com.alper.backend.market.bond.repository;

import com.alper.backend.market.bond.model.BondRateHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * BondRateHistory varlığı için CRUD ve tarih aralığı sorguları.
 */
@Repository
public interface BondRateHistoryRepository extends JpaRepository<BondRateHistory, Long> {
    List<BondRateHistory> findByBond_EvdsSeriesCodeAndRateDateBetweenOrderByRateDateAsc(
            String seriesCode, LocalDate from, LocalDate to);
    long countByBondIdAndRateDateBetween(Long bondId, LocalDate start, LocalDate end);
    List<BondRateHistory> findByBond_EvdsSeriesCodeInAndRateDateBetweenOrderByRateDateAsc(
            List<String> codes, LocalDate from, LocalDate to);
    boolean existsByBondIdAndRateDate(Long bondId, LocalDate rateDate);

    Optional<BondRateHistory> findTopByBondIdOrderByRateDateDesc(Long bondId);

    // Dashboard veri tazeliği — tüm modülde en son faiz günü
    Optional<BondRateHistory> findTopByOrderByRateDateDesc();

    // Her bond için en son tarihin kaydını getir — getAll endpoint'i için
    @Query("SELECT b FROM BondRateHistory b JOIN FETCH b.bond WHERE b.rateDate = " +
            "(SELECT MAX(b2.rateDate) FROM BondRateHistory b2 WHERE b2.bond.id = b.bond.id) " +
            "AND b.bond.isActive = true " +
            "ORDER BY b.bond.name ASC")
    List<BondRateHistory> findLatestRates();

    Optional<BondRateHistory> findFirstByBondIdOrderByRateDateDesc(Long bondId);
}