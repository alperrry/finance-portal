package com.alper.backend.portfolio.repository;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.portfolio.model.PortfolioItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * PortfolioItem varlığı için CRUD ve portföy bazlı sorgular.
 */
@Repository
public interface PortfolioItemRepository extends JpaRepository<PortfolioItem, Long> {

    List<PortfolioItem> findAllByPortfolioId(Long portfolioId);

    Optional<PortfolioItem> findByPortfolioIdAndInstrumentTypeAndInstrumentId(
            Long portfolioId,
            InstrumentType instrumentType,
            Long instrumentId
    );

    boolean existsByPortfolioId(Long portfolioId);

    void deleteByPortfolioId(Long portfolioId);
}