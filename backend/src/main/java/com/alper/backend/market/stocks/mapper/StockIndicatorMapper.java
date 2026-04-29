package com.alper.backend.market.stocks.mapper;

import com.alper.backend.market.stocks.model.StockTechnicalIndicator;
import com.alper.backend.market.stocks.dto.StockIndicatorResponse;
import org.springframework.stereotype.Component;

@Component
public class StockIndicatorMapper {

    public StockIndicatorResponse toDto(StockTechnicalIndicator entity) {
        if (entity == null) return null;
        return StockIndicatorResponse.builder()
                .symbol(entity.getStock().getSymbol())
                .tradeDate(entity.getTradeDate())
                .rsi14(entity.getRsi14())
                .macdLine(entity.getMacdLine())
                .macdSignal(entity.getMacdSignal())
                .macdHistogram(entity.getMacdHistogram())
                .sma20(entity.getSma20())
                .sma50(entity.getSma50())
                .sma200(entity.getSma200())
                .ema12(entity.getEma12())
                .ema26(entity.getEma26())
                .bollingerUpper(entity.getBollingerUpper())
                .bollingerMiddle(entity.getBollingerMiddle())
                .bollingerLower(entity.getBollingerLower())
                .stochasticK(entity.getStochasticK())
                .stochasticD(entity.getStochasticD())
                .atr14(entity.getAtr14())
                .ichimokuTenkan(entity.getIchimokuTenkan())
                .ichimokuKijun(entity.getIchimokuKijun())
                .ichimokuSenkouA(entity.getIchimokuSenkouA())
                .ichimokuSenkouB(entity.getIchimokuSenkouB())
                .build();
    }
}