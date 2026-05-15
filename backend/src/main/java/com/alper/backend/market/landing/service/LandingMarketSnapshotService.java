package com.alper.backend.market.landing.service;

import com.alper.backend.market.fx.dto.FxResponse;
import com.alper.backend.market.fx.service.FxQueryService;
import com.alper.backend.market.landing.dto.LandingMarketItem;
import com.alper.backend.market.landing.dto.LandingMarketSnapshot;
import com.alper.backend.market.stocks.model.InstrumentType;
import com.alper.backend.market.stocks.dto.StockResponse;
import com.alper.backend.market.stocks.service.StockQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class LandingMarketSnapshotService {

    private static final List<String> HERO_PRIORITY_KEYS = List.of(
            "USD",
            "XU100.IS",
            "EUR",
            "THYAO.IS",
            "GARAN.IS",
            "GBP",
            "AKBNK.IS"
    );

    private static final List<String> MARKET_PRIORITY_KEYS = List.of(
            "USD",
            "XU100.IS",
            "EUR",
            "GBP",
            "THYAO.IS",
            "GARAN.IS",
            "AKBNK.IS",
            "TUPRS.IS",
            "CHF",
            "SAR",
            "KWD"
    );

    private final FxQueryService fxQueryService;
    private final StockQueryService stockQueryService;

    public LandingMarketSnapshot getSnapshot() {
        Map<String, LandingMarketItem> itemsByKey = Stream.concat(
                        buildFxItems(fxQueryService.getAll()).stream(),
                        Stream.concat(
                                buildStockItems(stockQueryService.getAll()).stream(),
                                buildStockItems(stockQueryService.getByInstrumentType(InstrumentType.INDEX)).stream()
                        )
                )
                .collect(
                        LinkedHashMap::new,
                        (items, item) -> items.put(item.getKey(), item),
                        LinkedHashMap::putAll
                );

        List<LandingMarketItem> marketItems = selectItems(itemsByKey, MARKET_PRIORITY_KEYS, 6);
        List<LandingMarketItem> heroItems = selectItems(itemsByKey, HERO_PRIORITY_KEYS, 4);

        if (heroItems.size() < 4) {
            heroItems = fillWithFallback(heroItems, marketItems, 4);
        }

        return LandingMarketSnapshot.builder()
                .heroItems(heroItems)
                .marketItems(marketItems)
                .generatedAt(LocalDateTime.now())
                .build();
    }

    private List<LandingMarketItem> buildFxItems(List<FxResponse> rows) {
        return rows.stream()
                .filter(row -> row.getForexSelling() != null)
                .map(row -> LandingMarketItem.builder()
                        .key(row.getCurrencyCode())
                        .instrumentType("fx")
                        .symbol(row.getCurrencyCode() + "/TRY")
                        .name(row.getCurrencyName())
                        .marketLabel("TCMB Referans")
                        .currency("TRY")
                        .price(row.getForexSelling())
                        .direction("neutral")
                        .dataDate(row.getRateDate())
                        .build())
                .toList();
    }

    private List<LandingMarketItem> buildStockItems(List<StockResponse> rows) {
        return rows.stream()
                .filter(row -> row.getPrice() != null)
                .map(row -> LandingMarketItem.builder()
                        .key(row.getSymbol())
                        .instrumentType("stock")
                        .symbol(row.getShortName() != null && !row.getShortName().isBlank() ? row.getShortName() : normalizeSymbol(row.getSymbol()))
                        .name(firstNonBlank(row.getLongName(), row.getShortName(), normalizeSymbol(row.getSymbol())))
                        .marketLabel(firstNonBlank(row.getIndexName(), "BIST"))
                        .currency(row.getCurrency())
                        .price(row.getPrice())
                        .changePercent(row.getChangePercent())
                        .direction(toDirection(row.getChangePercent()))
                        .dataDate(row.getTradeDate())
                        .fetchedAt(row.getFetchedAt())
                        .build())
                .toList();
    }

    private List<LandingMarketItem> selectItems(
            Map<String, LandingMarketItem> itemsByKey,
            List<String> priorityKeys,
            int limit
    ) {
        List<LandingMarketItem> selected = new ArrayList<>();
        Set<String> seenKeys = new HashSet<>();

        priorityKeys.stream()
                .map(itemsByKey::get)
                .filter(Objects::nonNull)
                .forEach(item -> addIfMissing(selected, seenKeys, item));

        itemsByKey.values().forEach(item -> addIfMissing(selected, seenKeys, item));

        if (selected.size() <= limit) {
            return selected;
        }

        return selected.subList(0, limit);
    }

    private List<LandingMarketItem> fillWithFallback(
            List<LandingMarketItem> preferredItems,
            List<LandingMarketItem> fallbackItems,
            int limit
    ) {
        List<LandingMarketItem> selected = new ArrayList<>(preferredItems);
        Set<String> seenKeys = new HashSet<>();
        preferredItems.forEach(item -> seenKeys.add(item.getKey()));

        fallbackItems.forEach(item -> addIfMissing(selected, seenKeys, item));

        if (selected.size() <= limit) {
            return selected;
        }

        return selected.subList(0, limit);
    }

    private void addIfMissing(List<LandingMarketItem> selected, Set<String> seenKeys, LandingMarketItem item) {
        if (seenKeys.add(item.getKey())) {
            selected.add(item);
        }
    }

    private String toDirection(BigDecimal changePercent) {
        if (changePercent == null) {
            return "neutral";
        }

        int sign = changePercent.compareTo(BigDecimal.ZERO);
        if (sign > 0) {
            return "up";
        }

        if (sign < 0) {
            return "down";
        }

        return "neutral";
    }

    private String normalizeSymbol(String symbol) {
        return symbol == null ? "" : symbol.replace(".IS", "");
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }

        return "";
    }
}
