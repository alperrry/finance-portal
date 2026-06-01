package com.alper.backend.portfolio.repository;

import com.alper.backend.portfolio.model.ManualPosition;
import com.alper.backend.portfolio.model.PositionKind;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * ManualPosition varlığı için CRUD ve portföye bağlı pozisyon sorguları.
 */
public interface ManualPositionRepository extends JpaRepository<ManualPosition, Long> {

    Page<ManualPosition> findAllByPortfolioIdAndPositionKind(Long portfolioId, PositionKind kind, Pageable pageable);

    List<ManualPosition> findAllByPortfolioId(Long portfolioId);

    Optional<ManualPosition> findByIdAndPortfolioId(Long id, Long portfolioId);

    boolean existsByPortfolioIdAndPositionKind(Long portfolioId, PositionKind kind);
}
