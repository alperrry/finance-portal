package com.alper.backend.market.fund.repository;

import com.alper.backend.market.fund.model.FundAllocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface FundAllocationRepository extends JpaRepository<FundAllocation, Long> {

    boolean existsByFundIdAndAllocationDate(Long fundId, LocalDate allocationDate);

    Optional<FundAllocation> findTopByFundIdOrderByAllocationDateDesc(Long fundId);
    Optional<FundAllocation> findTopByFundIdOrderByAllocationDateAsc(Long fundId);
}