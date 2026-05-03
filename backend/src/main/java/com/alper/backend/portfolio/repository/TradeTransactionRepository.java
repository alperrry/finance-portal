package com.alper.backend.portfolio.repository;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.portfolio.model.TradeTransaction;
import com.alper.backend.portfolio.model.TransactionStatus;
import com.alper.backend.portfolio.model.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface TradeTransactionRepository extends JpaRepository<TradeTransaction, Long> {

    Optional<TradeTransaction> findByIdAndPortfolioId(Long id, Long portfolioId);

    Page<TradeTransaction> findAllByPortfolioId(Long portfolioId, Pageable pageable);

    Page<TradeTransaction> findAllByPortfolioIdAndStatus(Long portfolioId, TransactionStatus status, Pageable pageable);

    List<TradeTransaction> findAllByStatus(TransactionStatus status);

    List<TradeTransaction> findAllByPortfolioIdAndUpdatedAtAfter(Long portfolioId, Instant since);

    /**
     * Submit-time SELL kontrolü için: belirli bir enstrümanda mevcut PENDING SELL emirlerinin toplam miktarı.
     * Available qty = current qty - SUM(pending SELL qty) hesabında kullanılır.
     */
    @Query("""
            SELECT COALESCE(SUM(t.quantity), 0)
            FROM TradeTransaction t
            WHERE t.portfolioId = :portfolioId
              AND t.instrumentType = :instrumentType
              AND t.instrumentId = :instrumentId
              AND t.transactionType = :transactionType
              AND t.status = :status
            """)
    BigDecimal sumQuantityByPortfolioInstrumentTypeAndStatus(
            @Param("portfolioId") Long portfolioId,
            @Param("instrumentType") InstrumentType instrumentType,
            @Param("instrumentId") Long instrumentId,
            @Param("transactionType") TransactionType transactionType,
            @Param("status") TransactionStatus status
    );
}