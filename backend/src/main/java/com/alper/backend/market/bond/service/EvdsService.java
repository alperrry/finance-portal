package com.alper.backend.market.bond.service;

import com.alper.backend.common.exception.ExternalApiException;
import com.alper.backend.common.exception.ServiceType;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Transactional
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
    public void fetchAndSave(String seriesCode, String startDate, String endDate) {
        log.info("EVDS verisi çekiliyor. Seri: {}, Başlangıç: {}, Bitiş: {}", seriesCode, startDate, endDate);

        Bond bond = bondRepository.findByEvdsSeriesCode(seriesCode)
                .orElseThrow(() -> new ExternalApiException("Bond bulunamadı: " + seriesCode, ServiceType.EVDS));

        String json = evdsHttpClient.fetchSeries(seriesCode, startDate, endDate);
        EvdsResponse response = parseJson(json);
        saveAll(bond, seriesCode, response);

        log.info("EVDS verisi kaydedildi. Seri: {}", seriesCode);
    }

    private EvdsResponse parseJson(String json) {
        try {
            return objectMapper.readValue(json, EvdsResponse.class);
        } catch (Exception e) {
            throw new ExternalApiException("EVDS JSON parse edilemedi.", e, ServiceType.EVDS);
        }
    }

    private void saveAll(Bond bond, String seriesCode, EvdsResponse response) {
        if (response.getItems() == null || response.getItems().isEmpty()) {
            log.warn("EVDS boş veri döndü. Seri: {}", seriesCode);
            return;
        }

        List<BondRateHistory> entities = evdsMapper.toEntityList(bond, seriesCode, response.getItems());
        int saved = 0, skipped = 0;

        for (BondRateHistory history : entities) {
            if (history == null || bondRateHistoryRepository.existsByBondIdAndRateDate(
                    bond.getId(), history.getRateDate())) {
                skipped++;
                continue;
            }
            bondRateHistoryRepository.save(history);
            saved++;
        }

        log.info("Seri: {} → Kaydedildi: {}, Atlandı: {}", seriesCode, saved, skipped);
    }
}