package com.alper.backend.portfolio.service;

import com.alper.backend.common.exception.ConflictException;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.portfolio.mapper.PortfolioMapper;
import com.alper.backend.portfolio.model.Portfolio;
import com.alper.backend.portfolio.model.PositionKind;
import com.alper.backend.portfolio.repository.ManualPositionRepository;
import com.alper.backend.portfolio.repository.PortfolioItemRepository;
import com.alper.backend.portfolio.repository.PortfolioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PortfolioService")
class PortfolioServiceTest {

    @Mock private PortfolioRepository portfolioRepository;
    @Mock private PortfolioItemRepository portfolioItemRepository;
    @Mock private ManualPositionRepository manualPositionRepository;
    @Mock private PortfolioMapper portfolioMapper;
    @Mock private PortfolioValuationService portfolioValuationService;

    private PortfolioService service;

    @BeforeEach
    void setUp() {
        service = new PortfolioService(
                portfolioRepository,
                portfolioItemRepository,
                manualPositionRepository,
                portfolioMapper,
                portfolioValuationService
        );
    }

    @Test
    @DisplayName("Pozisyon ve açık manuel pozisyon yoksa portföyü siler")
    void deleteRemovesPortfolioWhenNoPositions() {
        Portfolio portfolio = portfolio(10L, 3L);
        when(portfolioRepository.findByIdAndUserId(10L, 3L)).thenReturn(Optional.of(portfolio));
        when(portfolioItemRepository.existsByPortfolioId(10L)).thenReturn(false);
        when(manualPositionRepository.existsByPortfolioIdAndPositionKind(10L, PositionKind.OPEN)).thenReturn(false);

        service.delete(10L, 3L);

        verify(portfolioRepository).delete(portfolio);
    }

    @Test
    @DisplayName("Portföyde portfolio_item varsa silmez")
    void deleteRejectsPortfolioWithItems() {
        Portfolio portfolio = portfolio(10L, 3L);
        when(portfolioRepository.findByIdAndUserId(10L, 3L)).thenReturn(Optional.of(portfolio));
        when(portfolioItemRepository.existsByPortfolioId(10L)).thenReturn(true);

        assertThatThrownBy(() -> service.delete(10L, 3L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("pozisyon");

        verify(portfolioRepository, never()).delete(portfolio);
    }

    @Test
    @DisplayName("Açık manuel pozisyon varsa silmez")
    void deleteRejectsPortfolioWithOpenManualPositions() {
        Portfolio portfolio = portfolio(10L, 3L);
        when(portfolioRepository.findByIdAndUserId(10L, 3L)).thenReturn(Optional.of(portfolio));
        when(portfolioItemRepository.existsByPortfolioId(10L)).thenReturn(false);
        when(manualPositionRepository.existsByPortfolioIdAndPositionKind(10L, PositionKind.OPEN)).thenReturn(true);

        assertThatThrownBy(() -> service.delete(10L, 3L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("açık pozisyon");

        verify(portfolioRepository, never()).delete(portfolio);
    }

    @Test
    @DisplayName("Kullanıcıya ait portföy yoksa 404 davranışı korunur")
    void deleteRejectsUnknownPortfolio() {
        when(portfolioRepository.findByIdAndUserId(10L, 3L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(10L, 3L))
                .isInstanceOf(NotFoundException.class);

        verify(portfolioItemRepository, never()).existsByPortfolioId(10L);
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
