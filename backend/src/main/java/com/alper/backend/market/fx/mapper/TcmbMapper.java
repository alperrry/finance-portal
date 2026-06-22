package com.alper.backend.market.fx.mapper;

import com.alper.backend.market.fx.model.ExchangeRate;
import com.alper.backend.market.fx.dto.TcmbCurrency;
import com.alper.backend.market.fx.dto.TcmbResponse;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

/**
 * TCMB kur XML yanıtını {@link ExchangeRate} entity'lerine dönüştüren mapper.
 *
 * <p>Sayısal alanlar boş gelebildiğinden parse edilemeyen değerler {@code null}
 * olarak bırakılır.</p>
 */
@Component
public class TcmbMapper {

    private static final String SOURCE = "TCMB";

    /**
     * XML yanıtındaki tüm para birimlerini entity listesine dönüştürür.
     *
     * @param response TCMB kur yanıtı
     * @return oluşturulan kur entity listesi
     */
    public List<ExchangeRate> toEntityList(TcmbResponse response) {
        return response.getCurrencies()
                .stream()
                .map(currency -> toEntity(currency, response))
                .toList();
    }

    private ExchangeRate toEntity(TcmbCurrency currency, TcmbResponse response) {
        return ExchangeRate.builder()
                .currencyCode(currency.getCurrencyCode())
                .currencyName(currency.getCurrencyName())
                .unit(currency.getUnit())
                .forexBuying(parseBigDecimal(currency.getForexBuying()))
                .forexSelling(parseBigDecimal(currency.getForexSelling()))
                .banknoteBuying(parseBigDecimal(currency.getBanknoteBuying()))
                .banknoteSelling(parseBigDecimal(currency.getBanknoteSelling()))
                .rateDate(response.getRateDate())
                .source(SOURCE)
                .build();
    }

    private BigDecimal parseBigDecimal(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}