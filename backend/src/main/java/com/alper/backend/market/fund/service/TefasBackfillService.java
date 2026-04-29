package com.alper.backend.market.fund.service;

import com.alper.backend.market.fund.model.Fund;
import com.alper.backend.market.fund.model.FundAllocation;
import com.alper.backend.market.fund.model.FundPrice;
import com.alper.backend.market.fund.repository.FundAllocationRepository;
import com.alper.backend.market.fund.repository.FundPriceRepository;
import com.alper.backend.market.fund.repository.FundRepository;
import com.alper.backend.market.common.AbstractBackfillService;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
@Log4j2
@Service
@RequiredArgsConstructor
public class TefasBackfillService extends AbstractBackfillService<Fund> {

    private final TefasService tefasService;
    private final FundRepository fundRepository;
    private final FundPriceRepository fundPriceRepository;
    private final FundAllocationRepository fundAllocationRepository;

    @Override
    protected List<Fund> getAllItems() {
        return fundRepository.findAll();
    }

    @Override
    protected String getSeriesCode(Fund fund) {
        return fund.getCode();
    }

    @Override
    protected Optional<LocalDate> getLatestRateDate(Fund fund) {
        // İkisi de güncel olmalı, hangisi daha eskiyse onu baz al
        Optional<LocalDate> latestPrice = fundPriceRepository
                .findTopByFundIdOrderByPriceDateDesc(fund.getId())
                .map(FundPrice::getPriceDate);

        Optional<LocalDate> latestAllocation = fundAllocationRepository
                .findTopByFundIdOrderByAllocationDateDesc(fund.getId())
                .map(FundAllocation::getAllocationDate);

        // İkisi de varsa eskisini al (gap fill için)
        if (latestPrice.isPresent() && latestAllocation.isPresent()) {
            return latestPrice.get().isBefore(latestAllocation.get())
                    ? latestPrice
                    : latestAllocation;
        }

        // Biri yoksa empty dön, baştan backfill yapsın
        return Optional.empty();

    }
    @Override
    protected long countExistingRecords(Fund fund, LocalDate start, LocalDate end) {
        return fundPriceRepository.countByFundIdAndPriceDateBetween(fund.getId(), start, end);
    }
    @Override
    protected void fetchAndSave(Fund fund, String startDate, String endDate) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd-MM-yyyy");
        LocalDate start = LocalDate.parse(startDate, fmt);
        LocalDate end = LocalDate.parse(endDate, fmt);

        while (!start.isAfter(end)) {
            LocalDate chunkEnd = start.plusDays(89).isAfter(end) ? end : start.plusDays(89);
            try {
                tefasService.fetchAndSaveForDate(fund.getCode(), start, chunkEnd);
            } catch (Exception e) {
                log.warn("TEFAS chunk başarısız: {} | {} → {} → {}",
                        fund.getCode(), start, chunkEnd, e.getMessage());
            }
            start = chunkEnd.plusDays(1);
        }
    }
}