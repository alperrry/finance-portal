package com.alper.backend.market.fund.repository;

import com.alper.backend.market.fund.model.FundPrice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface FundPriceRepository extends JpaRepository<FundPrice, Long> {
    List<FundPrice> findByFund_CodeAndPriceDateBetweenOrderByPriceDateAsc(
            String code, LocalDate from, LocalDate to);
    long countByFundIdAndPriceDateBetween(Long fundId, LocalDate start, LocalDate end);
    List<FundPrice> findByFund_CodeInAndPriceDateBetweenOrderByPriceDateAsc(
            List<String> codes, LocalDate from, LocalDate to);
    boolean existsByFundIdAndPriceDate(Long fundId, LocalDate priceDate);

    Optional<FundPrice> findTopByFundIdOrderByPriceDateDesc(Long fundId);
    Optional<FundPrice> findTopByFundIdOrderByPriceDateAsc(Long fundId);

    // Her fon için en son tarihin fiyat kaydını getir — getAll endpoint'i için
    @Query("SELECT fp FROM FundPrice fp JOIN FETCH fp.fund WHERE fp.priceDate = " +
            "(SELECT MAX(fp2.priceDate) FROM FundPrice fp2 WHERE fp2.fund.id = fp.fund.id) " +
            "ORDER BY fp.fund.code ASC")
    List<FundPrice> findLatestPrices();

    Optional<FundPrice> findFirstByFundIdOrderByPriceDateDesc(Long fundId);
}
