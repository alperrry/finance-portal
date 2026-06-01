package com.alper.backend.market.bond.repository;

import com.alper.backend.market.bond.model.Bond;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Bond varlığı için CRUD ve ISIN bazlı arama sorguları.
 */
@Repository
public interface BondRepository extends JpaRepository<Bond, Long> {

    Optional<Bond> findByEvdsSeriesCode(String evdsSeriesCode);

    @Query("""
            SELECT b, brh
            FROM Bond b
            LEFT JOIN BondRateHistory brh
                ON brh.bond = b
                AND brh.rateDate = (
                    SELECT MAX(brh2.rateDate)
                    FROM BondRateHistory brh2
                    WHERE brh2.bond.id = b.id
                )
            WHERE b.isActive = true
            ORDER BY b.name ASC
            """)
    List<Object[]> findActiveWithLatestRate();
}
