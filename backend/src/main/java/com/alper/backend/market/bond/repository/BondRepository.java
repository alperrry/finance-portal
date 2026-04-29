package com.alper.backend.market.bond.repository;

import com.alper.backend.market.bond.model.Bond;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BondRepository extends JpaRepository<Bond, Long> {

    Optional<Bond> findByEvdsSeriesCode(String evdsSeriesCode);
}