package com.alper.backend.market.fund.service;

public record TefasFetchResult(
        int savedInfoCount,
        int savedAllocationCount,
        int infoRowCount,
        int allocationRowCount
) {

    public boolean empty() {
        return infoRowCount == 0 && allocationRowCount == 0;
    }
}
