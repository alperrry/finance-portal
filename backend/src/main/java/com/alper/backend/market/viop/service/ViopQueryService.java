package com.alper.backend.market.viop.service;

import com.alper.backend.market.viop.dto.ViopContractPriceResponse;
import com.alper.backend.market.viop.model.ViopContractPrice;
import com.alper.backend.market.viop.repository.ViopContractPriceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ViopQueryService {
    private final ViopContractPriceRepository repository;

    public List<ViopContractPriceResponse> getAll(String segment, LocalDate from, LocalDate to) {
        LocalDate effectiveTo = to != null ? to : LocalDate.now();
        LocalDate effectiveFrom = from != null ? from : effectiveTo.minusDays(7);
        List<ViopContractPrice> rows = segment == null || segment.isBlank()
                ? repository.findByTradeDateBetweenOrderByMarketSegmentAscContractNameAsc(effectiveFrom, effectiveTo)
                : repository.findByMarketSegmentAndTradeDateBetweenOrderByContractNameAsc(segment, effectiveFrom, effectiveTo);
        return rows.stream().map(this::toResponse).toList();
    }

    private ViopContractPriceResponse toResponse(ViopContractPrice row) {
        return ViopContractPriceResponse.builder()
                .id(row.getId())
                .marketSegment(row.getMarketSegment())
                .contractName(row.getContractName())
                .underlyingSymbol(row.getUnderlyingSymbol())
                .maturityText(row.getMaturityText())
                .lastPrice(row.getLastPrice())
                .changePercent(row.getChangePercent())
                .changeAmount(row.getChangeAmount())
                .volumeTry(row.getVolumeTry())
                .volumeQuantity(row.getVolumeQuantity())
                .tradeDate(row.getTradeDate())
                .fetchedAt(row.getFetchedAt())
                .build();
    }
}
