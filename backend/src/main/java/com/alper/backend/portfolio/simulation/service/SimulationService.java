package com.alper.backend.portfolio.simulation.service;

import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.portfolio.model.ManualPosition;
import com.alper.backend.portfolio.model.PositionKind;
import com.alper.backend.portfolio.pnl.PnlCalculatorRegistry;
import com.alper.backend.portfolio.repository.ManualPositionRepository;
import com.alper.backend.portfolio.repository.PortfolioRepository;
import com.alper.backend.portfolio.service.InstrumentPriceResolverService;
import com.alper.backend.portfolio.simulation.lens.ValuationLensRegistry;
import com.alper.backend.portfolio.simulation.model.LensResult;
import com.alper.backend.portfolio.simulation.model.LensType;
import com.alper.backend.portfolio.simulation.model.PositionSummary;
import com.alper.backend.portfolio.simulation.model.SimulationResponse;
import com.alper.backend.portfolio.simulation.model.ValuationContext;
import com.alper.backend.common.model.InstrumentType;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Log4j2
public class SimulationService {

    private final PortfolioRepository portfolioRepository;
    private final ManualPositionRepository manualPositionRepository;
    private final ValuationContextBuilder contextBuilder;
    private final ValuationLensRegistry lensRegistry;
    private final PnlCalculatorRegistry pnlRegistry;
    private final InstrumentPriceResolverService priceResolver;
    private final ObjectMapper objectMapper;
    private final HistoricalRateResolver historicalRateResolver;
    private final HistoricalStockPriceResolver historicalStockPriceResolver;
    private final HistoricalFundPriceResolver historicalFundPriceResolver;
    @Nullable
    @Autowired(required = false)
    private StringRedisTemplate stringRedisTemplate;

    @Transactional(readOnly = true)
    public SimulationResponse simulateManualPosition(Long positionId, List<LensType> lenses, Long userId) {
        ManualPosition pos = manualPositionRepository.findById(positionId)
                .orElseThrow(() -> new NotFoundException("position"));
        portfolioRepository.findByIdAndUserId(pos.getPortfolioId(), userId)
                .orElseThrow(() -> new NotFoundException("position"));

        boolean closed = pos.getPositionKind() == PositionKind.CLOSED;
        String cacheKey = "sim:manual:" + positionId + ":" + lensKey(lenses) + (closed ? ":closed" : "");
        SimulationResponse cached = readFromRedis(cacheKey);
        if (cached != null) return cached;

        ValuationContext ctx = contextBuilder.fromManualPosition(pos);
        LensResult baseline = buildManualPositionBaseline(pos, ctx);
        Map<LensType, LensResult> results = applyLenses(ctx, lenses);
        SimulationResponse response = new SimulationResponse(summaryFrom(pos), baseline, results);

        Duration ttl = closed ? Duration.ofHours(24) : Duration.ofMinutes(5);
        writeToRedis(cacheKey, response, ttl);
        return response;
    }

    private LensResult buildManualPositionBaseline(ManualPosition pos, ValuationContext ctx) {
        BigDecimal absolutePnl;
        BigDecimal valueForDisplay;

        if (pos.getPositionKind() == PositionKind.CLOSED) {
            absolutePnl = pos.getRealizedPnl() != null ? pos.getRealizedPnl() : BigDecimal.ZERO;
            valueForDisplay = ctx.closeValueTry();
        } else if (pos.getInstrumentType() == com.alper.backend.common.model.InstrumentType.DEPOSIT
                || pos.getInstrumentType() == com.alper.backend.common.model.InstrumentType.BOND) {
            valueForDisplay = ctx.currentValueTry();
            absolutePnl = valueForDisplay.subtract(ctx.costBasisTry());
        } else {
            var info = (pos.getInstrumentId() != null || pos.getInstrumentSymbol() != null)
                    ? priceResolver.resolve(pos.getInstrumentType(), pos.getInstrumentId(), pos.getInstrumentSymbol())
                    : null;
            BigDecimal currentPrice = info != null ? info.currentPrice() : null;
            absolutePnl = currentPrice != null
                    ? pnlRegistry.get(pos.getInstrumentType()).calculate(pos, currentPrice)
                    : BigDecimal.ZERO;
            valueForDisplay = ctx.currentValueTry();
        }

        BigDecimal percentagePnl = ctx.costBasisTry().compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : absolutePnl.divide(ctx.costBasisTry(), 6, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100))
                        .setScale(2, RoundingMode.HALF_UP);

        return new LensResult(
                LensType.NOMINAL_TRY,
                ctx.costBasisTry().setScale(2, RoundingMode.HALF_UP),
                valueForDisplay != null ? valueForDisplay.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO,
                absolutePnl.setScale(2, RoundingMode.HALF_UP),
                percentagePnl,
                "TRY",
                null,
                null,
                null
        );
    }

    private Map<LensType, LensResult> applyLenses(ValuationContext ctx, List<LensType> lenses) {
        Map<LensType, LensResult> results = new LinkedHashMap<>();
        for (LensType type : lenses) {
            if (type == LensType.NOMINAL_TRY) continue; // baseline olarak ayrıca hesaplanır
            results.put(type, lensRegistry.get(type).apply(ctx));
        }
        return results;
    }

    private PositionSummary summaryFrom(ManualPosition pos) {
        return new PositionSummary(
                pos.getId(),
                pos.getInstrumentSymbol(),
                pos.getInstrumentName(),
                pos.getInstrumentType(),
                pos.getQuantity(),
                pos.getEntryDate(),
                pos.getPositionKind().name()
        );
    }

    private String lensKey(List<LensType> lenses) {
        return lenses.stream()
                .map(LensType::name)
                .sorted()
                .reduce((a, b) -> a + "_" + b)
                .orElse("NONE");
    }

    private SimulationResponse readFromRedis(String key) {
        if (stringRedisTemplate == null) return null;
        try {
            String json = stringRedisTemplate.opsForValue().get(key);
            if (json == null) return null;
            return objectMapper.readValue(json, SimulationResponse.class);
        } catch (JsonProcessingException e) {
            log.warn("Simulation cache deserialize hatası, key={}: {}", key, e.getMessage());
            return null;
        }
    }

    private void writeToRedis(String key, SimulationResponse response, Duration ttl) {
        if (stringRedisTemplate == null) return;
        try {
            String json = objectMapper.writeValueAsString(response);
            stringRedisTemplate.opsForValue().set(key, json, ttl);
        } catch (JsonProcessingException e) {
            log.warn("Simulation cache serialize hatası, key={}: {}", key, e.getMessage());
        }
    }

    // --- WHAT-IF (GÖLGE POZİSYON) SİMÜLASYON ENDPOINT'İ İÇİN YENİ METOD ---

    @Transactional(readOnly = true)
    public SimulationResponse simulateWhatIfScenario(Long positionId, InstrumentType targetType, String targetSymbol, List<LensType> lenses, Long userId) {
        // 1. GERÇEKLİK: Orijinal pozisyonu ve bağlanan ana parayı bul
        ManualPosition originalPos = manualPositionRepository.findById(positionId)
                .orElseThrow(() -> new NotFoundException("position"));
        portfolioRepository.findByIdAndUserId(originalPos.getPortfolioId(), userId)
                .orElseThrow(() -> new NotFoundException("position"));

        ValuationContext originalCtx = contextBuilder.fromManualPosition(originalPos);
        BigDecimal investableAmountTry = originalCtx.costBasisTry();

        // 2. ZAMAN YOLCULUĞU: Hedef aracın orijinal giriş tarihindeki fiyatını bul
        BigDecimal historicalTargetPrice = resolveHistoricalPriceForWhatIf(targetType, targetSymbol, originalPos.getEntryDate());
        if (historicalTargetPrice == null || historicalTargetPrice.compareTo(BigDecimal.ZERO) == 0) {
            throw new IllegalArgumentException(targetSymbol + " için " + originalPos.getEntryDate() + " tarihinde fiyat verisi bulunamadı.");
        }

        // 3. SENTETİK VERİ ÜRETİMİ: O günkü parayla bu araçtan kaç adet alınırdı?
        BigDecimal shadowQuantity = investableAmountTry.divide(historicalTargetPrice, 6, RoundingMode.HALF_UP);

        // 4. GÖLGE POZİSYON İNŞASI (Sadece RAM üzerinde yaşar, DB'ye kaydedilmez)
        ManualPosition shadowPos = new ManualPosition();
        shadowPos.setId(originalPos.getId()); // Frontend aynı pozisyon sanmaya devam etsin
        shadowPos.setPortfolioId(originalPos.getPortfolioId());
        shadowPos.setInstrumentType(targetType);
        shadowPos.setInstrumentSymbol(targetSymbol);
        shadowPos.setInstrumentName(targetSymbol + " (Alternatif Senaryo)");
        shadowPos.setPositionKind(originalPos.getPositionKind());
        shadowPos.setEntryDate(originalPos.getEntryDate());
        shadowPos.setEntryPrice(historicalTargetPrice);
        shadowPos.setQuantity(shadowQuantity);

        // Eğer orijinal pozisyon kapalıysa, What-If senaryosu da o gün kapanmış sayılır

        boolean closed = shadowPos.getPositionKind() == PositionKind.CLOSED;
        if (closed) {
            shadowPos.setExitDate(originalPos.getExitDate()); // DÜZELTİLDİ

            // 1. Hedef aracın orijinal çıkış tarihindeki (exitDate) fiyatını çek
            BigDecimal historicalExitPrice = resolveHistoricalPriceForWhatIf(targetType, targetSymbol, originalPos.getExitDate());
            shadowPos.setExitPrice(historicalExitPrice); // DÜZELTİLDİ

            // 2. Sanal pozisyonun o günkü (çıkış anındaki) toplam değerini hesapla
            BigDecimal shadowExitValue = shadowQuantity.multiply(historicalExitPrice);

            // 3. Sentetik Realized PnL (Gerçekleşmiş Kâr/Zarar) hesapla ve göm
            BigDecimal shadowRealizedPnl = shadowExitValue.subtract(investableAmountTry);
            shadowPos.setRealizedPnl(shadowRealizedPnl);
        }

        // 5. CACHE KONTROLÜ (Farklı bir key pattern ile)
        String cacheKey = "sim:whatif:" + positionId + ":" + targetSymbol + ":" + lensKey(lenses) + (closed ? ":closed" : "");
        SimulationResponse cached = readFromRedis(cacheKey);
        if (cached != null) return cached;

        // 6. MEVCUT SİSTEMİ KANDIRMA: Gölge pozisyonu normal akışa sok
        ValuationContext shadowCtx = contextBuilder.fromManualPosition(shadowPos);
        LensResult baseline = buildManualPositionBaseline(shadowPos, shadowCtx); // Güncel fiyatı priceResolver'dan kendi bulacak!
        Map<LensType, LensResult> results = applyLenses(shadowCtx, lenses);

        PositionSummary shadowSummary = summaryFrom(shadowPos);
        SimulationResponse response = new SimulationResponse(shadowSummary, baseline, results);

        Duration ttl = closed ? Duration.ofHours(24) : Duration.ofMinutes(5);
        writeToRedis(cacheKey, response, ttl);
        return response;
    }
    private BigDecimal resolveHistoricalPriceForWhatIf(InstrumentType type, String symbol, java.time.LocalDate date) {
        return switch (type) {
            case CURRENCY -> historicalRateResolver.resolve(symbol, date, RateDirection.SELLING);
            case STOCK    -> historicalStockPriceResolver.resolve(symbol, date);
            case FUND     -> historicalFundPriceResolver.resolve(symbol, date);
            default       -> throw new UnsupportedOperationException(type + " türü için geçmiş fiyat çekme altyapısı henüz hazır değil.");
        };
    }
}
