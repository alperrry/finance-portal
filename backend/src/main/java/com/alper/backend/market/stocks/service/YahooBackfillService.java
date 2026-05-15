package com.alper.backend.market.stocks.service;

import com.alper.backend.market.stocks.model.Stock;
import com.alper.backend.market.stocks.model.StockPriceHistory;
import com.alper.backend.market.stocks.repository.StockPriceHistoryRepository;
import com.alper.backend.market.stocks.repository.StockRepository;
import com.alper.backend.market.common.AbstractBackfillService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class YahooBackfillService extends AbstractBackfillService<Stock> {

    private final StockRepository stockRepository;
    private final StockPriceHistoryRepository historyRepository;
    private final YahooService yahooService;

    @Override
    protected List<Stock> getAllItems() {
        return stockRepository.findByIsActiveTrue();
    }

    @Override
    protected String getSeriesCode(Stock stock) {
        return stock.getSymbol();
    }

    @Override
    protected Optional<LocalDate> getLatestRateDate(Stock stock) {
        return historyRepository
                .findTopByStockIdOrderByTradeDateDesc(stock.getId())
                .map(StockPriceHistory::getTradeDate);
    }
    @Override
    protected long countExistingRecords(Stock stock, LocalDate start, LocalDate end) {
        return historyRepository.countByStockIdAndTradeDateBetween(stock.getId(), start, end);
    }
    @Override
    protected void fetchAndSave(Stock stock, String startDate, String endDate) {
        // Not: YahooService içindeki metodunun startDate ve endDate parametrelerini
        // dikkate alacak şekilde güncellenmesi backfill mantığı için daha sağlıklı olacaktır.
        yahooService.fetchAndSaveHistoryForBackfill(stock);
    }
}
