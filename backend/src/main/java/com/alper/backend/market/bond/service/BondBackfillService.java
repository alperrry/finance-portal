package com.alper.backend.market.bond.service;

import com.alper.backend.market.bond.model.Bond;
import com.alper.backend.market.bond.model.BondRateHistory;
import com.alper.backend.market.bond.repository.BondRateHistoryRepository;
import com.alper.backend.market.bond.repository.BondRepository;
import com.alper.backend.market.common.AbstractBackfillService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Tahvil/bono tarihsel veri ve faiz oranı geçmişi backfill servisi.
 *
 * <p>{@link AbstractBackfillService} iskeletini izler; EVDS API'den seri verileri çekip
 * {@link BondRepository} ve {@link BondRateHistoryRepository}'e yazar.</p>
 */
@Service
@RequiredArgsConstructor
public class BondBackfillService extends AbstractBackfillService<Bond> {

    private final EvdsService evdsService;
    private final BondRepository bondRepository;
    private final BondRateHistoryRepository bondRateHistoryRepository;

    @Override
    protected List<Bond> getAllItems() {
        return bondRepository.findAll();
    }

    @Override
    protected String getSeriesCode(Bond bond) {
        return bond.getEvdsSeriesCode();
    }

    @Override
    protected Optional<LocalDate> getLatestRateDate(Bond bond) {
        return bondRateHistoryRepository
                .findTopByBondIdOrderByRateDateDesc(bond.getId())
                .map(BondRateHistory::getRateDate);
    }
    @Override
    protected long countExistingRecords(Bond bond, LocalDate start, LocalDate end) {
        return bondRateHistoryRepository.countByBondIdAndRateDateBetween(bond.getId(), start, end);
    }
    // Artık parametre olarak Bond nesnesi alıyor
    @Override
    protected void fetchAndSave(Bond bond, String startDate, String endDate) {
        evdsService.fetchAndSave(bond.getEvdsSeriesCode(), startDate, endDate);
    }
}