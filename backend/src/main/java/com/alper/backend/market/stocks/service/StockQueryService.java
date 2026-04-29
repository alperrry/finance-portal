package com.alper.backend.market.stocks.service;

import com.alper.backend.market.stocks.model.StockPriceSnapshot;
import com.alper.backend.market.stocks.repository.StockPriceSnapshotRepository;
import com.alper.backend.market.stocks.dto.StockResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;

import java.util.List;

@Log4j2
@Service
@RequiredArgsConstructor
public class StockQueryService {

    private final StockPriceSnapshotRepository snapshotRepository;

    public List<StockResponse> getAll() {
        log.debug("Hisse verileri DB'den çekiliyor...");
        return snapshotRepository.findTodaySnapshots()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private StockResponse toResponse(StockPriceSnapshot entity) {
        return StockResponse.builder()
                .symbol(entity.getStock().getSymbol())
                .shortName(entity.getStock().getShortName())
                .longName(entity.getStock().getLongName())
                .sector(entity.getStock().getSector())
                .indexName(entity.getStock().getIndexName())
                .currency(entity.getStock().getCurrency())
                .price(entity.getPrice())
                .change(entity.getChange())
                .changePercent(entity.getChangePercent())
                .open(entity.getOpen())
                .dayHigh(entity.getDayHigh())
                .dayLow(entity.getDayLow())
                .previousClose(entity.getPreviousClose())
                .volume(entity.getVolume())
                .marketCap(entity.getMarketCap())
                .fiftyTwoWeekHigh(entity.getFiftyTwoWeekHigh())
                .fiftyTwoWeekLow(entity.getFiftyTwoWeekLow())
                .tradeDate(entity.getTradeDate())
                .fetchedAt(entity.getFetchedAt())
                .build();
    }
}
