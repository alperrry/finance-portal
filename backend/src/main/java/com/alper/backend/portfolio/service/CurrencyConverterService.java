package com.alper.backend.portfolio.service;

import com.alper.backend.market.fx.model.ExchangeRate;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;

/**
 * Para birimleri arası dönüşüm servisi.
 *
 * <p>TRY referans para birimi olarak kullanılır:
 * <ul>
 *     <li>X → TRY: forex_buying ile çarp</li>
 *     <li>TRY → X: forex_buying'e böl</li>
 *     <li>X → Y: önce TRY'ye, sonra Y'ye (cross-rate)</li>
 * </ul>
 * </p>
 *
 * <p>Konservatif yaklaşım: forex_buying kullanılır (kullanıcı bozdurursa eline geçecek miktar).</p>
 *
 * <p>NOT: ExchangeRateRepository'de aşağıdaki metodun bulunması gerekir:
 * <pre>Optional<ExchangeRate> findFirstByCurrencyCodeOrderByRateDateDesc(String currencyCode);</pre>
 * </p>
 */
@Service
@RequiredArgsConstructor
@Log4j2
public class CurrencyConverterService {

    private static final String BASE_CURRENCY = "TRY";
    private static final int CALCULATION_SCALE = 8;
    private static final int RESULT_SCALE = 4;

    private final ExchangeRateRepository exchangeRateRepository;

    /**
     * amount tutarını from para biriminden to para birimine dönüştürür.
     * Aynı para birimi için amount'u olduğu gibi döner.
     *
     * @return dönüştürülmüş tutar; kur bulunamazsa Optional.empty()
     */
    public Optional<BigDecimal> convert(BigDecimal amount, String from, String to) {
        if (amount == null) {
            return Optional.empty();
        }
        if (from == null || to == null) {
            log.warn("Para birimi dönüşümünde null değer. from={}, to={}", from, to);
            return Optional.empty();
        }
        if (from.equalsIgnoreCase(to)) {
            return Optional.of(amount);
        }

        // X → TRY
        if (BASE_CURRENCY.equalsIgnoreCase(to)) {
            return getRate(from).map(rate -> amount.multiply(rate)
                    .setScale(RESULT_SCALE, RoundingMode.HALF_UP));
        }

        // TRY → X
        if (BASE_CURRENCY.equalsIgnoreCase(from)) {
            return getRate(to).map(rate -> amount.divide(rate, CALCULATION_SCALE, RoundingMode.HALF_UP)
                    .setScale(RESULT_SCALE, RoundingMode.HALF_UP));
        }

        // X → Y (cross-rate via TRY)
        Optional<BigDecimal> fromRate = getRate(from);
        Optional<BigDecimal> toRate = getRate(to);
        if (fromRate.isEmpty() || toRate.isEmpty()) {
            return Optional.empty();
        }

        BigDecimal inTry = amount.multiply(fromRate.get());
        BigDecimal result = inTry.divide(toRate.get(), CALCULATION_SCALE, RoundingMode.HALF_UP)
                .setScale(RESULT_SCALE, RoundingMode.HALF_UP);
        return Optional.of(result);
    }

    private Optional<BigDecimal> getRate(String currencyCode) {
        Optional<ExchangeRate> rateOpt = exchangeRateRepository
                .findFirstByCurrencyCodeOrderByRateDateDesc(currencyCode);

        if (rateOpt.isEmpty()) {
            log.warn("Döviz kuru bulunamadı: {}", currencyCode);
            return Optional.empty();
        }

        BigDecimal forexBuying = rateOpt.get().getForexBuying();
        if (forexBuying == null || forexBuying.compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("Döviz kuru forex_buying değeri geçersiz. currency={}, value={}", currencyCode, forexBuying);
            return Optional.empty();
        }
        return Optional.of(forexBuying);
    }
}