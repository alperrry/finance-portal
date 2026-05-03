package com.alper.backend.market.fx.repository;

import com.alper.backend.market.fx.model.ExchangeRate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ExchangeRateRepository extends JpaRepository<ExchangeRate, Long> {
    List<ExchangeRate> findByCurrencyCodeAndRateDateBetweenOrderByRateDateAsc(
            String currencyCode, LocalDate from, LocalDate to);

    List<ExchangeRate> findByCurrencyCodeInAndRateDateBetweenOrderByRateDateAsc(
            List<String> codes, LocalDate from, LocalDate to);
    // Duplicate kontrolü — upsert mantığı için
    Optional<ExchangeRate> findByCurrencyCodeAndRateDate(String currencyCode, LocalDate rateDate);

    // En son çekilen tarihi bul — backfill için
    Optional<ExchangeRate> findTopByOrderByRateDateDesc();

    long countByCurrencyCodeAndRateDateBetween(String currencyCode, LocalDate start, LocalDate end);
    // Her para birimi için en son tarihin kaydını getir — getAll endpoint'i için
    @Query("SELECT e FROM ExchangeRate e WHERE e.rateDate = " +
            "(SELECT MAX(e2.rateDate) FROM ExchangeRate e2 WHERE e2.currencyCode = e.currencyCode) " +
            "ORDER BY e.currencyCode ASC")
    List<ExchangeRate> findLatestRates();

    // 1 yıldan eski verileri temizlemek için
    void deleteByRateDateBefore(LocalDate date);

    Optional<ExchangeRate> findFirstByIdOrderByRateDateDesc(Long id);

    Optional<ExchangeRate> findFirstByCurrencyCodeOrderByRateDateDesc(String currencyCode);
}
