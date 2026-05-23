package com.alper.backend.portfolio.simulation.exception;

import com.alper.backend.common.exception.ErrorCode;
import com.alper.backend.portfolio.simulation.service.RateDirection;
import lombok.Getter;

import java.time.LocalDate;

@Getter
public class HistoricalDataMissingException extends RuntimeException {

    private final ErrorCode errorCode = ErrorCode.HISTORICAL_DATA_MISSING;
    private final String currency;
    private final LocalDate date;
    private final RateDirection direction;

    public HistoricalDataMissingException(String currency, LocalDate date, RateDirection direction) {
        super(String.format(
                "Tarihsel kur verisi bulunamadı. currency=%s, date=%s, direction=%s",
                currency, date, direction));
        this.currency = currency;
        this.date = date;
        this.direction = direction;
    }
}
