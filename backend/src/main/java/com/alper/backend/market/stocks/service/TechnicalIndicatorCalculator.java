package com.alper.backend.market.stocks.service;

import com.alper.backend.market.stocks.model.StockPriceHistory;
import org.springframework.stereotype.Component;
import org.ta4j.core.BaseBarSeries;
import org.ta4j.core.BaseBarSeriesBuilder;
import org.ta4j.core.BarSeries;
import org.ta4j.core.Indicator;
import org.ta4j.core.indicators.ATRIndicator;

import org.ta4j.core.indicators.MACDIndicator;
import org.ta4j.core.indicators.RSIIndicator;
import org.ta4j.core.indicators.averages.EMAIndicator;
import org.ta4j.core.indicators.averages.SMAIndicator;
import org.ta4j.core.indicators.StochasticOscillatorDIndicator;
import org.ta4j.core.indicators.StochasticOscillatorKIndicator;
import org.ta4j.core.indicators.bollinger.BollingerBandsLowerIndicator;
import org.ta4j.core.indicators.bollinger.BollingerBandsMiddleIndicator;
import org.ta4j.core.indicators.bollinger.BollingerBandsUpperIndicator;
import org.ta4j.core.indicators.helpers.ClosePriceIndicator;
import org.ta4j.core.indicators.helpers.HighPriceIndicator;
import org.ta4j.core.indicators.helpers.LowPriceIndicator;
import org.ta4j.core.indicators.ichimoku.IchimokuKijunSenIndicator;
import org.ta4j.core.indicators.ichimoku.IchimokuSenkouSpanAIndicator;
import org.ta4j.core.indicators.ichimoku.IchimokuSenkouSpanBIndicator;
import org.ta4j.core.indicators.ichimoku.IchimokuTenkanSenIndicator;
import org.ta4j.core.indicators.statistics.StandardDeviationIndicator;
import org.ta4j.core.num.DecimalNum;
import org.ta4j.core.num.Num;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Saf TA4J wrapper. Fiyat listesi alır, her tarih için indikatör değerlerini üretir.
 * Stateless — thread-safe. DB veya Spring context ile hiçbir ilişkisi yok, unit test'i kolay.
 */
@Component
public class TechnicalIndicatorCalculator {

    private static final int BOLLINGER_PERIOD = 20;
    private static final double BOLLINGER_K   = 2.0;
    private static final int STOCH_K_PERIOD   = 14;
    private static final int STOCH_D_PERIOD   = 3;
    private static final int ATR_PERIOD       = 14;
    private static final int RSI_PERIOD       = 14;
    private static final int SMA_20           = 20;
    private static final int SMA_50           = 50;
    private static final int SMA_200          = 200;
    private static final int EMA_12           = 12;
    private static final int EMA_26           = 26;
    private static final int MACD_SIGNAL      = 9;

    /**
     * Girdi: tradeDate asc sıralı price history.
     * Çıktı: her tarih için indikatör snapshot'ı (değerler hazırsa).
     * Yetersiz warm-up periyodunda olan alanlar null kalır.
     */
    public Map<LocalDate, IndicatorSnapshot> calculate(List<StockPriceHistory> priceHistory) {
        if (priceHistory == null || priceHistory.isEmpty()) {
            return Map.of();
        }

        // Defansif: çağıran sıralama garanti etmemişse sıralayalım
        List<StockPriceHistory> sorted = new ArrayList<>(priceHistory);
        sorted.sort(Comparator.comparing(StockPriceHistory::getTradeDate));

        BarSeries series = buildSeries(sorted);

        // Indicator instances — hepsi lazy, endIndex'e göre hesaplar
        ClosePriceIndicator close = new ClosePriceIndicator(series);
        HighPriceIndicator  high  = new HighPriceIndicator(series);
        LowPriceIndicator   low   = new LowPriceIndicator(series);

        RSIIndicator rsi         = new RSIIndicator(close, RSI_PERIOD);

        EMAIndicator ema12       = new EMAIndicator(close, EMA_12);
        EMAIndicator ema26       = new EMAIndicator(close, EMA_26);
        MACDIndicator macd       = new MACDIndicator(close, EMA_12, EMA_26);
        EMAIndicator macdSignal  = new EMAIndicator(macd, MACD_SIGNAL);

        SMAIndicator sma20       = new SMAIndicator(close, SMA_20);
        SMAIndicator sma50       = new SMAIndicator(close, SMA_50);
        SMAIndicator sma200      = new SMAIndicator(close, SMA_200);

        StandardDeviationIndicator stddev20 = new StandardDeviationIndicator(close, BOLLINGER_PERIOD);
        BollingerBandsMiddleIndicator bbMiddle = new BollingerBandsMiddleIndicator(sma20);
        Num kNum = DecimalNum.valueOf(BOLLINGER_K);
        BollingerBandsUpperIndicator bbUpper = new BollingerBandsUpperIndicator(bbMiddle, stddev20, kNum);
        BollingerBandsLowerIndicator bbLower = new BollingerBandsLowerIndicator(bbMiddle, stddev20, kNum);

        StochasticOscillatorKIndicator stochK = new StochasticOscillatorKIndicator(series, STOCH_K_PERIOD);
        StochasticOscillatorDIndicator stochD = new StochasticOscillatorDIndicator(stochK);
        // Not: TA4J'de StochasticOscillatorDIndicator default 3-period SMA of %K uygular.

        ATRIndicator atr         = new ATRIndicator(series, ATR_PERIOD);

        IchimokuTenkanSenIndicator     ichTenkan  = new IchimokuTenkanSenIndicator(series);      // 9
        IchimokuKijunSenIndicator      ichKijun   = new IchimokuKijunSenIndicator(series);       // 26
        IchimokuSenkouSpanAIndicator   ichSenkouA = new IchimokuSenkouSpanAIndicator(series);    // (Tenkan+Kijun)/2
        IchimokuSenkouSpanBIndicator   ichSenkouB = new IchimokuSenkouSpanBIndicator(series);    // 52

        Map<LocalDate, IndicatorSnapshot> result = new HashMap<>();
        int barCount = series.getBarCount();

        for (int i = 0; i < barCount; i++) {
            LocalDate date = sorted.get(i).getTradeDate();

            IndicatorSnapshot snap = IndicatorSnapshot.builder()
                    .tradeDate(date)
                    .rsi14(toBigDecimal(rsi, i, RSI_PERIOD, 4))
                    .ema12(toBigDecimal(ema12, i, EMA_12, 4))
                    .ema26(toBigDecimal(ema26, i, EMA_26, 4))
                    .macdLine(toBigDecimal(macd, i, EMA_26, 6))
                    .macdSignal(toBigDecimal(macdSignal, i, EMA_26 + MACD_SIGNAL, 6))
                    .macdHistogram(macdHistogram(macd, macdSignal, i, EMA_26 + MACD_SIGNAL))
                    .sma20(toBigDecimal(sma20, i, SMA_20, 4))
                    .sma50(toBigDecimal(sma50, i, SMA_50, 4))
                    .sma200(toBigDecimal(sma200, i, SMA_200, 4))
                    .bollingerUpper(toBigDecimal(bbUpper, i, BOLLINGER_PERIOD, 4))
                    .bollingerMiddle(toBigDecimal(bbMiddle, i, BOLLINGER_PERIOD, 4))
                    .bollingerLower(toBigDecimal(bbLower, i, BOLLINGER_PERIOD, 4))
                    .stochasticK(toBigDecimal(stochK, i, STOCH_K_PERIOD, 4))
                    .stochasticD(toBigDecimal(stochD, i, STOCH_K_PERIOD + STOCH_D_PERIOD, 4))
                    .atr14(toBigDecimal(atr, i, ATR_PERIOD, 4))
                    .ichimokuTenkan(toBigDecimal(ichTenkan, i, 9, 4))
                    .ichimokuKijun(toBigDecimal(ichKijun, i, 26, 4))
                    .ichimokuSenkouA(toBigDecimal(ichSenkouA, i, 26, 4))
                    .ichimokuSenkouB(toBigDecimal(ichSenkouB, i, 52, 4))
                    .build();

            result.put(date, snap);
        }

        return result;
    }

    private BarSeries buildSeries(List<StockPriceHistory> sorted) {
        BaseBarSeries series = new BaseBarSeriesBuilder().withName("stock").build();
        for (StockPriceHistory ph : sorted) {
            if (ph.getClosePrice() == null) continue; // güvenlik
            series.barBuilder()
                    .timePeriod(Duration.ofDays(1))
                    .endTime(ph.getTradeDate().atStartOfDay().toInstant(ZoneOffset.UTC).plus(Duration.ofDays(1)))
                    .openPrice(nullSafe(ph.getOpenPrice(),  ph.getClosePrice()))
                    .highPrice(nullSafe(ph.getHighPrice(),  ph.getClosePrice()))
                    .lowPrice (nullSafe(ph.getLowPrice(),   ph.getClosePrice()))
                    .closePrice(ph.getClosePrice())
                    .volume(ph.getVolume() == null ? BigDecimal.ZERO : BigDecimal.valueOf(ph.getVolume()))
                    .add();
        }
        return series;
    }

    private static BigDecimal nullSafe(BigDecimal v, BigDecimal fallback) {
        return v == null ? fallback : v;
    }

    /**
     * Warm-up yeterli değilse veya TA4J NaN döndürürse null.
     */
    private BigDecimal toBigDecimal(Indicator<Num> indicator, int index, int minBars, int scale) {
        if (index + 1 < minBars) return null;
        Num value = indicator.getValue(index);
        if (value == null || value.isNaN()) return null;
        try {
            return new BigDecimal(value.toString()).setScale(scale, RoundingMode.HALF_UP);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private BigDecimal macdHistogram(MACDIndicator macd, EMAIndicator signal, int index, int minBars) {
        if (index + 1 < minBars) return null;
        Num line   = macd.getValue(index);
        Num sigVal = signal.getValue(index);
        if (line == null || sigVal == null || line.isNaN() || sigVal.isNaN()) return null;
        Num diff = line.minus(sigVal);
        return new BigDecimal(diff.toString()).setScale(6, RoundingMode.HALF_UP);
    }

}