package com.alper.backend.market.stocks.repository;

import com.alper.backend.market.stocks.model.Stock;
import com.alper.backend.market.stocks.model.InstrumentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Stock varlığı için CRUD ve sembol bazlı arama sorguları.
 */
@Repository
public interface StockRepository extends JpaRepository<Stock, Long> {

    // Symbol ile hisse bul — mapper ve service için
    Optional<Stock> findBySymbol(String symbol);

    // Aktif hisseleri getir — scheduled job için tüm hisseleri çekmek
    List<Stock> findByIsActiveTrue();

    List<Stock> findByIsActiveTrueAndInstrumentType(InstrumentType instrumentType);
}
