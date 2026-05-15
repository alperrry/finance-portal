package com.alper.backend.portfolio.service;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.portfolio.event.TradeApprovedEvent;
import com.alper.backend.portfolio.model.OrderType;
import com.alper.backend.portfolio.model.Portfolio;
import com.alper.backend.portfolio.model.PortfolioItem;
import com.alper.backend.portfolio.model.TradeTransaction;
import com.alper.backend.portfolio.model.TransactionStatus;
import com.alper.backend.portfolio.model.TransactionType;
import com.alper.backend.portfolio.repository.PortfolioItemRepository;
import com.alper.backend.portfolio.repository.PortfolioRepository;
import com.alper.backend.portfolio.repository.TradeTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TradeProcessServiceTest {

    @Mock
    private TradeTransactionRepository tradeTransactionRepository;

    @Mock
    private PortfolioRepository portfolioRepository;

    @Mock
    private PortfolioItemRepository portfolioItemRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private TradeCurrencyService tradeCurrencyService;

    private TradeProcessService service;

    @BeforeEach
    void setUp() {
        service = new TradeProcessService(
                tradeTransactionRepository,
                portfolioRepository,
                portfolioItemRepository,
                eventPublisher,
                tradeCurrencyService
        );
    }

    @Test
    void executeBuyApprovedWithoutBalanceCheck() {
        TradeTransaction transaction = TradeTransaction.builder()
                .id(7L)
                .portfolioId(10L)
                .instrumentType(InstrumentType.STOCK)
                .instrumentId(100L)
                .transactionType(TransactionType.BUY)
                .orderType(OrderType.LIMIT)
                .quantity(new BigDecimal("1000"))
                .targetPrice(new BigDecimal("420.250000"))
                .status(TransactionStatus.PENDING)
                .build();
        Portfolio portfolio = Portfolio.builder()
                .id(10L)
                .userId(3L)
                .displayCurrency("TRY")
                .build();
        BigDecimal executionPrice = new BigDecimal("414.7500");

        when(portfolioRepository.findById(10L)).thenReturn(Optional.of(portfolio));
        when(tradeCurrencyService.resolveNativeCurrency(InstrumentType.STOCK, 100L)).thenReturn("TRY");
        when(tradeCurrencyService.convertOrThrow(any(), any(), any())).thenReturn(new BigDecimal("414750.00"));
        when(portfolioItemRepository.findByPortfolioIdAndInstrumentTypeAndInstrumentId(10L, InstrumentType.STOCK, 100L))
                .thenReturn(Optional.empty());
        when(portfolioItemRepository.save(any(PortfolioItem.class))).thenAnswer(i -> i.getArgument(0));
        when(tradeTransactionRepository.save(transaction)).thenReturn(transaction);
        when(portfolioRepository.findById(10L)).thenReturn(Optional.of(portfolio));

        assertThatCode(() -> service.execute(transaction, executionPrice)).doesNotThrowAnyException();

        assertThat(transaction.getStatus()).isEqualTo(TransactionStatus.APPROVED);
        verify(eventPublisher).publishEvent(any(TradeApprovedEvent.class));
    }
}
