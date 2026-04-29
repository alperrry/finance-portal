package com.alper.backend.market.bond.mapper;

import com.alper.backend.market.bond.model.Bond;
import com.alper.backend.market.bond.model.BondRateHistory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class EvdsMapper {

    private static final String SOURCE = "TCMB_EVDS";
    private static final DateTimeFormatter EVDS_DATE_FORMAT = DateTimeFormatter.ofPattern("dd-MM-yyyy");

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

        return BondRateHistory.builder()
                .bond(bond)
                .rateDate(LocalDate.parse(tarihStr, EVDS_DATE_FORMAT))
                .interestRate(parseBigDecimal(rateObj.toString()))
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