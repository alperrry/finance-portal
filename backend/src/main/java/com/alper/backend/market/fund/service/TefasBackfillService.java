package com.alper.backend.market.fund.service;

import com.alper.backend.market.fund.model.Fund;
import com.alper.backend.market.fund.model.FundAllocation;
import com.alper.backend.market.fund.model.FundPrice;
import com.alper.backend.market.fund.repository.FundAllocationRepository;
import com.alper.backend.market.fund.repository.FundPriceRepository;
import com.alper.backend.market.fund.repository.FundRepository;
import com.alper.backend.market.common.AbstractBackfillService;
import com.alper.backend.market.common.TurkishHolidayUtil;
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
        LocalDate lowerBound = LocalDate.parse(startDate, fmt);
        LocalDate requestedEnd = LocalDate.parse(endDate, fmt);
        LocalDate lastCompletedTradingDay = TurkishHolidayUtil.lastCompletedTradingDay(LocalDate.now());
        LocalDate cursor = requestedEnd.isBefore(lastCompletedTradingDay) ? requestedEnd : lastCompletedTradingDay;

        int successfulChunks = 0;
        int failedChunks = 0;
        int emptyChunks = 0;
        int totalChunks = countReverseMonthlyChunks(lowerBound, cursor);

        log.info("TEFAS backfill planı: {} | {} ← {} | chunk={} | tahminiİstek={}",
                fund.getCode(), lowerBound, cursor, totalChunks, totalChunks * 2);

        while (!cursor.isBefore(lowerBound)) {
            LocalDate monthStart = cursor.withDayOfMonth(1);
            LocalDate chunkStart = monthStart.isBefore(lowerBound) ? lowerBound : monthStart;
            LocalDate chunkEnd = cursor;
            try {
                TefasFetchResult result = tefasService.fetchAndSaveForDate(fund.getCode(), chunkStart, chunkEnd);
                successfulChunks++;
                if (result.empty()) {
                    emptyChunks++;
                    log.info("TEFAS boş ay tespit edildi, fon için daha eski backfill durduruluyor: {} | {} → {}",
                            fund.getCode(), chunkStart, chunkEnd);
                    break;
                }
            } catch (Exception e) {
                failedChunks++;
                log.warn("TEFAS chunk başarısız: {} | {} → {} → {}",
                        fund.getCode(), chunkStart, chunkEnd, e.getMessage());
            }
            cursor = chunkStart.minusDays(1);
        }

        if (successfulChunks == 0 && failedChunks > 0) {
            throw new IllegalStateException("TEFAS backfill tüm chunk'larda başarısız oldu: " + fund.getCode());
        }

        if (failedChunks > 0 || emptyChunks > 0) {
            log.warn("TEFAS backfill eksik tamamlandı: {} | başarılıChunk={}, başarısızChunk={}, boşChunk={}",
                    fund.getCode(), successfulChunks, failedChunks, emptyChunks);
        } else {
            log.info("TEFAS backfill başarıyla tamamlandı: {} | başarılıChunk={}",
                    fund.getCode(), successfulChunks);
        }
    }

    private int countReverseMonthlyChunks(LocalDate start, LocalDate end) {
        int count = 0;
        LocalDate cursor = end;
        while (!cursor.isBefore(start)) {
            LocalDate chunkStart = cursor.withDayOfMonth(1);
            if (chunkStart.isBefore(start)) {
                chunkStart = start;
            }
            count++;
            cursor = chunkStart.minusDays(1);
        }
        return count;
    }
}
