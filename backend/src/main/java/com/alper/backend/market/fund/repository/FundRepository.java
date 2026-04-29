package com.alper.backend.market.fund.repository;

import com.alper.backend.market.fund.model.Fund;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FundRepository extends JpaRepository<Fund, Long> {

    Optional<Fund> findByCode(String code);
}