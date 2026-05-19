package com.alper.backend.market.fund.dto;

import lombok.Builder;
import lombok.Getter;

import java.io.Serial;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Builder
public class FundAllocationResponse implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private LocalDate allocationDate;

    private BigDecimal hs;
    private BigDecimal yhs;
    private BigDecimal kb;
    private BigDecimal ob;
    private BigDecimal ykb;
    private BigDecimal yob;
    private BigDecimal tpp;
    private BigDecimal vdm;
    private BigDecimal vm;
    private BigDecimal r;
    private BigDecimal t;
    private BigDecimal d;
    private BigDecimal gas;
    private BigDecimal byf;
    private BigDecimal vint;
    private BigDecimal diger;
}
