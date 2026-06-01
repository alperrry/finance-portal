package com.alper.backend.market.fund.repository;

import com.alper.backend.market.fund.model.Fund;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

/**
 * Fund varlığı için CRUD ve fon kodu bazlı arama sorguları.
 */
public interface FundRepository extends JpaRepository<Fund, Long> {

    Optional<Fund> findByCode(String code);

    @Query("""
            SELECT f, fp
            FROM Fund f
            LEFT JOIN FundPrice fp
                ON fp.fund = f
                AND fp.priceDate = (
                    SELECT MAX(fp2.priceDate)
                    FROM FundPrice fp2
                    WHERE fp2.fund.id = f.id
                )
            ORDER BY f.code ASC
            """)
    List<Object[]> findAllWithLatestPrice();
}
