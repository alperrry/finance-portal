package com.alper.backend.portfolio.service;

import com.alper.backend.common.exception.BadRequestException;
import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.market.bond.repository.BondRepository;
import com.alper.backend.market.stocks.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Locale;

/**
 * Trade emir fiyatlarını portföy para birimi, enstrüman native para birimi ve
 * kullanıcı bakiyesinin TRY cinsi arasında dönüştürür.
 */
@Service
@RequiredArgsConstructor
public class TradeCurrencyService {

    public static final String BALANCE_CURRENCY = "TRY";

    private final CurrencyConverterService currencyConverterService;
    private final StockRepository stockRepository;
    private final BondRepository bondRepository;

    public String resolveNativeCurrency(InstrumentType type, Long instrumentId) {
        String currency = switch (type) {
            case STOCK -> stockRepository.findById(instrumentId)
                    .map(stock -> stock.getCurrency() == null ? BALANCE_CURRENCY : stock.getCurrency())
                    .orElse(BALANCE_CURRENCY);
            case FUND, CURRENCY -> BALANCE_CURRENCY;
            case BOND -> bondRepository.findById(instrumentId)
                    .map(bond -> bond.getCurrency() == null ? BALANCE_CURRENCY : bond.getCurrency())
                    .orElse(BALANCE_CURRENCY);
            case VIOP -> BALANCE_CURRENCY;
        };
        return normalizeCurrency(currency);
    }

    public BigDecimal convertOrThrow(BigDecimal amount, String from, String to) {
        String source = normalizeCurrency(from);
        String target = normalizeCurrency(to);
        return currencyConverterService.convert(amount, source, target)
                .orElseThrow(() -> new BadRequestException(
                        String.format("Para birimi dönüşümü yapılamadı: %s -> %s", source, target)));
    }

    public BigDecimal convertTargetPriceToNative(BigDecimal targetPrice,
                                                  String portfolioCurrency,
                                                  InstrumentType instrumentType,
                                                  Long instrumentId) {
        String nativeCurrency = resolveNativeCurrency(instrumentType, instrumentId);
        return convertOrThrow(targetPrice, portfolioCurrency, nativeCurrency);
    }

    private String normalizeCurrency(String currency) {
        if (currency == null || currency.isBlank()) {
            return BALANCE_CURRENCY;
        }
        return currency.trim().toUpperCase(Locale.ROOT);
    }
}
