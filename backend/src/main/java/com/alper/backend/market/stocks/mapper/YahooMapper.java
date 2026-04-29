package com.alper.backend.market.stocks.mapper;

import com.alper.backend.market.stocks.model.Stock;
import com.alper.backend.market.stocks.model.StockPriceHistory;
import com.alper.backend.market.stocks.model.StockPriceSnapshot;
import com.alper.backend.market.stocks.dto.YahooQuoteResult;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class YahooMapper {

    public StockPriceSnapshot toSnapshotEntity(YahooQuoteResult dto, Stock stock) {
        return StockPriceSnapshot.builder()
                .stock(stock)
                .price(toBigDecimal(dto.getRegularMarketPrice()))
                .change(toBigDecimal(dto.getRegularMarketChange()))
                .changePercent(toBigDecimal(dto.getRegularMarketChangePercent()))
                .open(toBigDecimal(dto.getRegularMarketOpen()))
                .dayHigh(toBigDecimal(dto.getRegularMarketDayHigh()))
                .dayLow(toBigDecimal(dto.getRegularMarketDayLow()))
                .previousClose(toBigDecimal(dto.getRegularMarketPreviousClose()))
                .volume(dto.getRegularMarketVolume())
                .marketCap(dto.getMarketCap())
                .fiftyTwoWeekHigh(toBigDecimal(dto.getFiftyTwoWeekHigh()))
                .fiftyTwoWeekLow(toBigDecimal(dto.getFiftyTwoWeekLow()))
                .build();
    }

    public StockPriceHistory toHistoryEntity(StockPriceSnapshot snapshot) {
        return StockPriceHistory.builder()
                .stock(snapshot.getStock())
                .tradeDate(snapshot.getTradeDate())
                .openPrice(snapshot.getOpen())
                .highPrice(snapshot.getDayHigh())
                .lowPrice(snapshot.getDayLow())
                .closePrice(snapshot.getPrice())
                .volume(snapshot.getVolume())
                .build();
    }

    private BigDecimal toBigDecimal(Double value) {
        if (value == null) {
            return null;
        }
        return BigDecimal.valueOf(value);
    }
}
