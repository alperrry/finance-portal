package com.alper.backend.history.service;

import com.alper.backend.common.exception.BadRequestException;
import com.alper.backend.market.bond.repository.BondRateHistoryRepository;
import com.alper.backend.market.fund.repository.FundPriceRepository;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import com.alper.backend.market.macro.repository.MacroObservationRepository;
import com.alper.backend.market.stocks.repository.StockPriceHistoryRepository;
import com.alper.backend.market.viop.repository.ViopContractPriceRepository;
import com.alper.backend.history.dto.CompareResponse;
import com.alper.backend.history.dto.HistoryResponse;
import com.alper.backend.history.dto.PricePoint;
import com.alper.backend.history.mapper.HistoryMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Enstrüman bazlı tarihsel veri okuma servisi (stock / fund / fx / viop).
 *
 * <p>İlgili modülün history repository'sini seçer, talep edilen tarih aralığı için
 * kapanış/OHLC kayıtlarını DTO'ya dönüştürür.</p>
 */
@Log4j2
@Service
@RequiredArgsConstructor
public class HistoryQueryService {

    private final StockPriceHistoryRepository stockHistoryRepository;
    private final ExchangeRateRepository exchangeRateRepository;
    private final FundPriceRepository fundPriceRepository;
    private final BondRateHistoryRepository bondRateHistoryRepository;
    private final MacroObservationRepository macroObservationRepository;
    private final ViopContractPriceRepository viopContractPriceRepository;
    private final HistoryMapper historyMapper;

    public HistoryResponse getHistory(String type, String code, LocalDate from, LocalDate to) {
        validateDateRange(from, to);
        log.info("Tarihsel veri sorgulanıyor. Tür: {}, Kod: {}, Aralık: {} - {}", type, code, from, to);

        return HistoryResponse.builder()
                .code(code)
                .instrumentType(type.toUpperCase())
                .from(from)
                .to(to)
                .data(fetchPoints(type, code, from, to))
                .build();
    }

    public CompareResponse getCompare(String type, List<String> codes, LocalDate from, LocalDate to) {
        validateDateRange(from, to);
        validateCompareCodes(codes);
        log.info("Karşılaştırma sorgusu. Tür: {}, Kodlar: {}, Aralık: {} - {}", type, codes, from, to);

        Map<String, List<PricePoint>> series = new LinkedHashMap<>();
        for (String code : codes) {
            series.put(code, fetchPoints(type, code, from, to));
        }

        return CompareResponse.builder()
                .from(from)
                .to(to)
                .instrumentType(type.toUpperCase())
                .series(series)
                .build();
    }

    private List<PricePoint> fetchPoints(String type, String code, LocalDate from, LocalDate to) {
        return switch (type.toLowerCase()) {
            case "stocks" -> stockHistoryRepository
                    .findByStock_SymbolAndTradeDateBetweenOrderByTradeDateAsc(code, from, to)
                    .stream().map(historyMapper::fromStock).toList();
            case "indexes", "commodities", "crypto" -> stockHistoryRepository
                    .findByStock_SymbolAndTradeDateBetweenOrderByTradeDateAsc(code, from, to)
                    .stream().map(historyMapper::fromStock).toList();
            case "fx" -> exchangeRateRepository
                    .findByCurrencyCodeAndRateDateBetweenOrderByRateDateAsc(code, from, to)
                    .stream().map(historyMapper::fromFx).toList();
            case "funds" -> fundPriceRepository
                    .findByFund_CodeAndPriceDateBetweenOrderByPriceDateAsc(code, from, to)
                    .stream().map(historyMapper::fromFund).toList();
            case "bonds" -> bondRateHistoryRepository
                    .findByBond_EvdsSeriesCodeAndRateDateBetweenOrderByRateDateAsc(code, from, to)
                    .stream().map(historyMapper::fromBond).toList();
            case "inflation", "deposit-rates" -> macroObservationRepository
                    .findBySeries_SeriesCodeAndObservationDateBetweenOrderByObservationDateAsc(code, from, to)
                    .stream().map(historyMapper::fromMacro).toList();
            case "viop" -> viopContractPriceRepository
                    .findByContractNameAndTradeDateBetweenOrderByTradeDateAsc(code, from, to)
                    .stream().map(historyMapper::fromViop).toList();
            default -> throw new BadRequestException("Geçersiz parametre değeri. Parametre: type");
        };
    }

    private void validateDateRange(LocalDate from, LocalDate to) {
        if (from.isAfter(to)) {
            throw new BadRequestException("Geçersiz parametre değeri. Parametre: from");
        }
        if (ChronoUnit.DAYS.between(from, to) > 365) {
            throw new BadRequestException("Geçersiz parametre değeri. Parametre: range");
        }
    }

    private void validateCompareCodes(List<String> codes) {
        if (codes == null || codes.isEmpty()) {
            throw new BadRequestException("Zorunlu alan boş bırakılamaz. Alan: codes");
        }
        if (codes.size() > 3) {
            throw new BadRequestException("Geçersiz parametre değeri. Parametre: codes");
        }
    }
}
