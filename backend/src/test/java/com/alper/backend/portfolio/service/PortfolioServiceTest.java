package com.alper.backend.portfolio.service;

import com.alper.backend.common.exception.ConflictException;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.portfolio.mapper.PortfolioMapper;
import com.alper.backend.portfolio.model.Portfolio;
import com.alper.backend.portfolio.model.TransactionStatus;
import com.alper.backend.portfolio.repository.PortfolioItemRepository;
import com.alper.backend.portfolio.repository.PortfolioRepository;
import com.alper.backend.portfolio.repository.TradeTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PortfolioService")
class PortfolioServiceTest {

    @Mock private PortfolioRepository portfolioRepository;
    @Mock private PortfolioItemRepository portfolioItemRepository;
    @Mock private TradeTransactionRepository tradeTransactionRepository;
    @Mock private PortfolioMapper portfolioMapper;
    @Mock private PortfolioValuationService portfolioValuationService;

    private PortfolioService service;

    @BeforeEach
    void setUp() {
        service = new PortfolioService(
                portfolioRepository,
                portfolioItemRepository,
                tradeTransactionRepository,
                portfolioMapper,
                portfolioValuationService
        );
    }

    @Test
    @DisplayName("Pozisyon ve bekleyen emir yoksa geçmiş emirleri temizleyip portföyü siler")
    void deleteRemovesHistoricalTradesBeforePortfolio() {
        Portfolio portfolio = portfolio(10L, 3L);
        when(portfolioRepository.findByIdAndUserId(10L, 3L)).thenReturn(Optional.of(portfolio));
        when(portfolioItemRepository.existsByPortfolioId(10L)).thenReturn(false);
        when(tradeTransactionRepository.existsByPortfolioIdAndStatus(10L, TransactionStatus.PENDING)).thenReturn(false);
        when(tradeTransactionRepository.deleteByPortfolioId(10L)).thenReturn(2L);

        service.delete(10L, 3L);

        InOrder inOrder = inOrder(tradeTransactionRepository, portfolioRepository);
        inOrder.verify(tradeTransactionRepository).deleteByPortfolioId(10L);
        inOrder.verify(portfolioRepository).delete(portfolio);
    }

    @Test
    @DisplayName("Portföyde pozisyon varsa silmez")
    void deleteRejectsPortfolioWithItems() {
        Portfolio portfolio = portfolio(10L, 3L);
        when(portfolioRepository.findByIdAndUserId(10L, 3L)).thenReturn(Optional.of(portfolio));
        when(portfolioItemRepository.existsByPortfolioId(10L)).thenReturn(true);

        assertThatThrownBy(() -> service.delete(10L, 3L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("pozisyon");

        verify(tradeTransactionRepository, never()).deleteByPortfolioId(10L);
        verify(portfolioRepository, never()).delete(portfolio);
    }

    @Test
    @DisplayName("Bekleyen emir varsa silmez")
    void deleteRejectsPortfolioWithPendingTrades() {
        Portfolio portfolio = portfolio(10L, 3L);
        when(portfolioRepository.findByIdAndUserId(10L, 3L)).thenReturn(Optional.of(portfolio));
        when(portfolioItemRepository.existsByPortfolioId(10L)).thenReturn(false);
        when(tradeTransactionRepository.existsByPortfolioIdAndStatus(10L, TransactionStatus.PENDING)).thenReturn(true);

        assertThatThrownBy(() -> service.delete(10L, 3L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("bekleyen emir");

        verify(tradeTransactionRepository, never()).deleteByPortfolioId(10L);
        verify(portfolioRepository, never()).delete(portfolio);
    }

    @Test
    @DisplayName("Kullanıcıya ait portföy yoksa 404 davranışı korunur")
    void deleteRejectsUnknownPortfolio() {
        when(portfolioRepository.findByIdAndUserId(10L, 3L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(10L, 3L))
                .isInstanceOf(NotFoundException.class);

        verify(portfolioItemRepository, never()).existsByPortfolioId(10L);
        verify(tradeTransactionRepository, never()).deleteByPortfolioId(10L);
    }

    private Portfolio portfolio(Long id, Long userId) {
        return Portfolio.builder()
                .id(id)
                .userId(userId)
                .name("Test Portfolio")
                .displayCurrency("TRY")
                .version(0L)
                .build();
    }
}
