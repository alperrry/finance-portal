package com.alper.backend.market.bond.service;

import com.alper.backend.common.exception.ExternalApiException;
import com.alper.backend.common.exception.ServiceType;
import com.alper.backend.market.common.event.MarketDataModule;
import com.alper.backend.market.common.event.MarketDataUpdatedEvent;
import com.alper.backend.market.bond.model.Bond;
import com.alper.backend.market.bond.model.BondRateHistory;
import com.alper.backend.market.bond.repository.BondRateHistoryRepository;
import com.alper.backend.market.bond.repository.BondRepository;
import com.alper.backend.market.bond.client.EvdsHttpClient;
import com.alper.backend.market.bond.dto.EvdsResponse;
import com.alper.backend.market.bond.mapper.EvdsMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Log4j2
@Service
@RequiredArgsConstructor
public class EvdsService {

    private final EvdsHttpClient evdsHttpClient;
    private final ObjectMapper objectMapper;
    private final EvdsMapper evdsMapper;
    private final BondRepository bondRepository;
    private final BondRateHistoryRepository bondRateHistoryRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    @CacheEvict(value = "bonds", allEntries = true)
    public void fetchAndSaveAll(String startDate, String endDate) {
        List<Bond> bonds = bondRepository.findAll();
        if (bonds.isEmpty()) {
            log.warn("EVDS: DB'de tanımlı bond bulunamadı.");
            return;
        }
        for (Bond bond : bonds) {
            try {
                fetchAndSave(bond.getEvdsSeriesCode(), startDate, endDate);
            } catch (Exception e) {
                log.error("EVDS veri çekme hatası. Seri: {}, Hata: {}", bond.getEvdsSeriesCode(), e.getMessage(), e);
            }
        }
    }

    @Transactional
    @CacheEvict(value = "bonds", allEntries = true)
    public void fetchAndSave(String seriesCode, String startDate, String endDate) {
        log.info("EVDS verisi çekiliyor. Seri: {}, Başlangıç: {}, Bitiş: {}", seriesCode, startDate, endDate);

        Bond bond = bondRepository.findByEvdsSeriesCode(seriesCode)
                .orElseThrow(() -> new ExternalApiException("Bond bulunamadı: " + seriesCode, ServiceType.EVDS));

        String json = evdsHttpClient.fetchSeries(seriesCode, startDate, endDate);
        EvdsResponse response = parseJson(json);
        SaveStats stats = saveAll(bond, seriesCode, response);
        if (stats.savedCount() > 0) {
            eventPublisher.publishEvent(MarketDataUpdatedEvent.of(
                    MarketDataModule.BONDS, stats.savedCount(), stats.latestDate()));
        }

        log.info("EVDS verisi kaydedildi. Seri: {}", seriesCode);
    }

    private EvdsResponse parseJson(String json) {
        try {
            return objectMapper.readValue(json, EvdsResponse.class);
        } catch (Exception e) {
            throw new ExternalApiException("EVDS JSON parse edilemedi.", e, ServiceType.EVDS);
        }
    }

    private SaveStats saveAll(Bond bond, String seriesCode, EvdsResponse response) {
        if (response.getItems() == null || response.getItems().isEmpty()) {
            log.warn("EVDS boş veri döndü. Seri: {}", seriesCode);
            return new SaveStats(0, null);
        }

        List<BondRateHistory> entities = evdsMapper.toEntityList(bond, seriesCode, response.getItems());
        int saved = 0, skipped = 0;
        LocalDate latestDate = null;

        for (BondRateHistory history : entities) {
            if (history == null || bondRateHistoryRepository.existsByBondIdAndRateDate(
                    bond.getId(), history.getRateDate())) {
                skipped++;
                continue;
            }
            bondRateHistoryRepository.save(history);
            saved++;
            if (latestDate == null || history.getRateDate().isAfter(latestDate)) {
                latestDate = history.getRateDate();
            }
        }

        log.info("Seri: {} → Kaydedildi: {}, Atlandı: {}", seriesCode, saved, skipped);
        return new SaveStats(saved, latestDate);
    }

    private record SaveStats(int savedCount, LocalDate latestDate) {}
}
