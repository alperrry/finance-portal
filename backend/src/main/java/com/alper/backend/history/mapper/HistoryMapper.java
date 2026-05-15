package com.alper.backend.history.mapper;

import com.alper.backend.market.bond.model.BondRateHistory;
import com.alper.backend.market.fund.model.FundPrice;
import com.alper.backend.market.fx.model.ExchangeRate;
import com.alper.backend.market.macro.model.MacroObservation;
import com.alper.backend.market.stocks.model.StockPriceHistory;
import com.alper.backend.history.dto.PricePoint;
import com.alper.backend.market.viop.model.ViopContractPrice;
import org.springframework.stereotype.Component;

@Component
public class HistoryMapper {

    public PricePoint fromStock(StockPriceHistory h) {
        return PricePoint.builder()
                .date(h.getTradeDate())
                .open(h.getOpenPrice())
                .high(h.getHighPrice())
                .low(h.getLowPrice())
                .close(h.getClosePrice())
                .volume(h.getVolume())
                .build();
    }

    public PricePoint fromFx(ExchangeRate r) {
        return PricePoint.builder()
                .date(r.getRateDate())
                .close(r.getForexSelling())
                .build();
    }

    public PricePoint fromFund(FundPrice f) {
        return PricePoint.builder()
                .date(f.getPriceDate())
                .close(f.getPrice())
                .build();
    }

    public PricePoint fromBond(BondRateHistory b) {
        return PricePoint.builder()
                .date(b.getRateDate())
                .close(b.getInterestRate())
                .build();
    }

    public PricePoint fromMacro(MacroObservation observation) {
        return PricePoint.builder()
                .date(observation.getObservationDate())
                .close(observation.getValue())
                .build();
    }

    public PricePoint fromViop(ViopContractPrice price) {
        return PricePoint.builder()
                .date(price.getTradeDate())
                .close(price.getLastPrice())
                .volume(price.getVolumeQuantity())
                .build();
    }
}
