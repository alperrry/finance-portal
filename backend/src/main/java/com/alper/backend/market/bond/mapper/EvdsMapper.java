package com.alper.backend.market.bond.mapper;

import com.alper.backend.market.bond.model.Bond;
import com.alper.backend.market.bond.model.BondRateHistory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * EVDS API yanıtındaki ham seri kayıtlarını {@link BondRateHistory} entity'lerine
 * dönüştüren mapper.
 *
 * <p>Dönüşüm sırasında kupon faizinden vade sonu bileşik getiri de hesaplanır;
 * tarih veya faiz alanı eksik kayıtlar atlanır.</p>
 */
@Component
public class EvdsMapper {

    private static final String SOURCE = "TCMB_EVDS";
    private static final DateTimeFormatter EVDS_DATE_FORMAT = DateTimeFormatter.ofPattern("dd-MM-yyyy");

    /**
     * EVDS yanıtındaki kayıt listesini entity listesine dönüştürür.
     *
     * @param bond       faiz kayıtlarının bağlanacağı tahvil
     * @param seriesCode EVDS seri kodu (yanıt alan adına çevrilir)
     * @param items      API yanıtındaki ham kayıtlar
     * @return geçerli kayıtlardan üretilen entity listesi
     */
    public List<BondRateHistory> toEntityList(Bond bond, String seriesCode, List<Map<String, Object>> items) {
        String seriesKey = seriesCode.replace(".", "_");
        List<BondRateHistory> result = new ArrayList<>();

        for (Map<String, Object> item : items) {
            BondRateHistory history = toEntity(bond, seriesKey, item);
            if (history != null) {
                result.add(history);
            }
        }

        return result;
    }

    private BondRateHistory toEntity(Bond bond, String seriesKey, Map<String, Object> item) {
        String tarihStr = (String) item.get("Tarih");
        Object rateObj = item.get(seriesKey);

        if (tarihStr == null || rateObj == null) {
            return null;
        }

        BigDecimal interestRate = parseBigDecimal(rateObj.toString());
        BigDecimal compoundedRate = calculateCompoundedRate(interestRate, bond.getMaturityDays());

        return BondRateHistory.builder()
                .bond(bond)
                .rateDate(LocalDate.parse(tarihStr, EVDS_DATE_FORMAT))
                .interestRate(interestRate)
                .compoundedRate(compoundedRate)
                .source(SOURCE)
                .build();
    }

    // Formül: ((1 + couponRate/200)^(maturityDays/182) - 1) * 100
    // Kupon ödemelerinin aynı faizle reinvest edildiği varsayımıyla vade sonu toplam bileşik getiri.
    private BigDecimal calculateCompoundedRate(BigDecimal couponRate, Integer maturityDays) {
        if (couponRate == null || maturityDays == null) {
            return null;
        }
        double n = maturityDays / 182.0;
        double base = 1.0 + couponRate.doubleValue() / 200.0;
        double result = (Math.pow(base, n) - 1.0) * 100.0;
        return BigDecimal.valueOf(result).setScale(4, RoundingMode.HALF_UP);
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