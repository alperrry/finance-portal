package com.alper.backend.portfolio.service;

import com.alper.backend.common.exception.BadRequestException;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.portfolio.dto.ClosePositionRequest;
import com.alper.backend.portfolio.dto.ManualPositionRequest;
import com.alper.backend.portfolio.dto.ManualPositionResponse;
import com.alper.backend.portfolio.model.ManualPosition;
import com.alper.backend.portfolio.model.PositionDirection;
import com.alper.backend.portfolio.model.PositionKind;
import com.alper.backend.portfolio.pnl.PnlCalculatorRegistry;
import com.alper.backend.portfolio.repository.ManualPositionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ManualPositionService Testleri")
class ManualPositionServiceTest {

    @Mock private ManualPositionRepository repository;
    @Mock private PortfolioService portfolioService;
    @Mock private InstrumentPriceResolverService priceResolver;

    private ManualPositionService service;

    private static final Long PORTFOLIO_ID = 1L;
    private static final Long USER_ID = 99L;
    private static final Long POSITION_ID = 10L;
    private static final LocalDate ENTRY = LocalDate.of(2026, 1, 1);
    private static final LocalDate EXIT = LocalDate.of(2026, 6, 1);

    @BeforeEach
    void setUp() {
        service = new ManualPositionService(
                repository,
                portfolioService,
                priceResolver,
                new PnlCalculatorRegistry()
        );
    }

    private ManualPosition buildOpenPosition(BigDecimal qty) {
        return ManualPosition.builder()
                .id(POSITION_ID)
                .portfolioId(PORTFOLIO_ID)
                .instrumentType(InstrumentType.STOCK)
                .positionKind(PositionKind.OPEN)
                .instrumentId(20L)
                .instrumentSymbol("AKBNK")
                .instrumentName("Akbank")
                .direction(PositionDirection.LONG)
                .quantity(qty)
                .entryPrice(new BigDecimal("100.00"))
                .entryDate(ENTRY)
                .build();
    }

    private ManualPosition buildClosedPosition() {
        return ManualPosition.builder()
                .id(POSITION_ID)
                .portfolioId(PORTFOLIO_ID)
                .instrumentType(InstrumentType.STOCK)
                .positionKind(PositionKind.CLOSED)
                .instrumentId(20L)
                .instrumentSymbol("AKBNK")
                .instrumentName("Akbank")
                .direction(PositionDirection.LONG)
                .quantity(new BigDecimal("100"))
                .entryPrice(new BigDecimal("100.00"))
                .entryDate(ENTRY)
                .exitPrice(new BigDecimal("120.00"))
                .exitDate(EXIT)
                .realizedPnl(new BigDecimal("2000.00"))
                .build();
    }

    @Nested
    @DisplayName("Pozisyon Oluşturma")
    class CreatePosition {

        @Test
        @DisplayName("Açık pozisyon başarıyla oluşturulur")
        void create_openPosition_savesAndReturns() {
            ManualPositionRequest req = new ManualPositionRequest(
                    InstrumentType.STOCK, PositionKind.OPEN,
                    20L, null, null, PositionDirection.LONG,
                    new BigDecimal("100"), new BigDecimal("50.00"), ENTRY,
                    null, null, null, null, null, null, null, null, null
            );
            ManualPosition saved = buildOpenPosition(new BigDecimal("100"));

            when(portfolioService.getOwnedPortfolio(PORTFOLIO_ID, USER_ID)).thenReturn(null);
            when(priceResolver.resolve(InstrumentType.STOCK, 20L))
                    .thenReturn(new InstrumentPriceResolverService.InstrumentInfo("AKBNK", "Akbank", "TRY", new BigDecimal("55.00")));
            when(repository.save(any())).thenReturn(saved);

            ManualPositionResponse result = service.create(PORTFOLIO_ID, USER_ID, req);

            assertThat(result.positionKind()).isEqualTo(PositionKind.OPEN);
            assertThat(result.instrumentSymbol()).isEqualTo("AKBNK");
            verify(repository).save(any());
        }

        @Test
        @DisplayName("Kapalı pozisyon oluşturulduğunda gerçekleşen K/Z hesaplanır")
        void create_closedPosition_calculatesRealizedPnl() {
            ManualPositionRequest req = new ManualPositionRequest(
                    InstrumentType.STOCK, PositionKind.CLOSED,
                    20L, null, null, PositionDirection.LONG,
                    new BigDecimal("100"), new BigDecimal("100.00"), ENTRY,
                    new BigDecimal("120.00"), EXIT,
                    null, null, null, null, null, null, null
            );
            ManualPosition saved = buildClosedPosition();

            when(portfolioService.getOwnedPortfolio(PORTFOLIO_ID, USER_ID)).thenReturn(null);
            when(priceResolver.resolve(InstrumentType.STOCK, 20L))
                    .thenReturn(new InstrumentPriceResolverService.InstrumentInfo("AKBNK", "Akbank", "TRY", new BigDecimal("120.00")));
            when(repository.save(any())).thenReturn(saved);

            ManualPositionResponse result = service.create(PORTFOLIO_ID, USER_ID, req);

            assertThat(result.positionKind()).isEqualTo(PositionKind.CLOSED);
            assertThat(result.realizedPnl()).isNotNull();
        }

        @Test
        @DisplayName("Kapalı pozisyon için çıkış fiyatı yoksa BadRequestException fırlatılır")
        void create_closedWithoutExitPrice_throwsBadRequest() {
            ManualPositionRequest req = new ManualPositionRequest(
                    InstrumentType.STOCK, PositionKind.CLOSED,
                    20L, null, null, PositionDirection.LONG,
                    new BigDecimal("100"), new BigDecimal("100.00"), ENTRY,
                    null, EXIT,  // exitPrice null
                    null, null, null, null, null, null, null
            );
            when(portfolioService.getOwnedPortfolio(PORTFOLIO_ID, USER_ID)).thenReturn(null);

            assertThatThrownBy(() -> service.create(PORTFOLIO_ID, USER_ID, req))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Çıkış tarihi giriş tarihinden önceyse BadRequestException fırlatılır")
        void create_exitDateBeforeEntryDate_throwsBadRequest() {
            ManualPositionRequest req = new ManualPositionRequest(
                    InstrumentType.STOCK, PositionKind.CLOSED,
                    20L, null, null, PositionDirection.LONG,
                    new BigDecimal("100"), new BigDecimal("100.00"),
                    LocalDate.of(2026, 6, 1),
                    new BigDecimal("120.00"), LocalDate.of(2026, 1, 1),  // exitDate before entryDate
                    null, null, null, null, null, null, null
            );
            when(portfolioService.getOwnedPortfolio(PORTFOLIO_ID, USER_ID)).thenReturn(null);

            assertThatThrownBy(() -> service.create(PORTFOLIO_ID, USER_ID, req))
                    .isInstanceOf(BadRequestException.class);
        }
    }

    @Nested
    @DisplayName("Pozisyon Sorgulama")
    class GetPosition {

        @Test
        @DisplayName("Kapalı pozisyon ID ile başarıyla döner")
        void getById_closedPosition_returns() {
            ManualPosition pos = buildClosedPosition();
            when(repository.findByIdAndPortfolioId(POSITION_ID, PORTFOLIO_ID)).thenReturn(Optional.of(pos));

            ManualPositionResponse result = service.getById(PORTFOLIO_ID, USER_ID, POSITION_ID);

            assertThat(result.id()).isEqualTo(POSITION_ID);
            assertThat(result.positionKind()).isEqualTo(PositionKind.CLOSED);
        }

        @Test
        @DisplayName("Pozisyon bulunamazsa NotFoundException fırlatılır")
        void getById_whenNotFound_throwsNotFoundException() {
            when(repository.findByIdAndPortfolioId(99L, PORTFOLIO_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.getById(PORTFOLIO_ID, USER_ID, 99L))
                    .isInstanceOf(NotFoundException.class);
        }
    }

    @Nested
    @DisplayName("Pozisyon Listeleme")
    class ListPositions {

        @Test
        @DisplayName("Açık CURRENCY listesinde güncel kur, değer ve K/Z döner")
        void listOpenCurrency_returnsCurrentPriceValueAndPnl() {
            ManualPosition eur = ManualPosition.builder()
                    .id(10L)
                    .portfolioId(PORTFOLIO_ID)
                    .instrumentType(InstrumentType.CURRENCY)
                    .positionKind(PositionKind.OPEN)
                    .instrumentId(20L)
                    .instrumentSymbol("EUR")
                    .instrumentName("Euro")
                    .quantity(new BigDecimal("1000.00"))
                    .entryPrice(new BigDecimal("35.00"))
                    .entryDate(ENTRY)
                    .build();

            when(repository.findAllByPortfolioIdAndPositionKind(PORTFOLIO_ID, PositionKind.OPEN, PageRequest.of(0, 20)))
                    .thenReturn(new PageImpl<>(List.of(eur)));
            when(priceResolver.resolve(InstrumentType.CURRENCY, 20L, "EUR"))
                    .thenReturn(new InstrumentPriceResolverService.InstrumentInfo(
                            "EUR", "Euro", "TRY", new BigDecimal("40.00")));

            Page<ManualPositionResponse> page = service.list(PORTFOLIO_ID, USER_ID, PositionKind.OPEN, PageRequest.of(0, 20));

            ManualPositionResponse response = page.getContent().getFirst();
            assertThat(response.currentPrice()).isEqualByComparingTo("40.00");
            assertThat(response.currentValue()).isEqualByComparingTo("40000.00");
            assertThat(response.unrealizedPnl()).isEqualByComparingTo("5000.00");
            assertThat(response.pnlPercent()).isEqualByComparingTo("14.29");
        }
    }

    @Nested
    @DisplayName("Pozisyon Kapatma")
    class ClosePosition {

        @Test
        @DisplayName("Tam kapamada tek kapalı pozisyon döner, açık pozisyon kalmaz")
        void closePosition_fullClose_returnsOnlyClosedPosition() {
            ManualPosition open = buildOpenPosition(new BigDecimal("100"));
            ClosePositionRequest req = new ClosePositionRequest(
                    new BigDecimal("120.00"), EXIT, new BigDecimal("100"));

            when(portfolioService.getOwnedPortfolio(PORTFOLIO_ID, USER_ID)).thenReturn(null);
            when(repository.findByIdAndPortfolioId(POSITION_ID, PORTFOLIO_ID)).thenReturn(Optional.of(open));
            when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            List<ManualPositionResponse> results = service.closePosition(PORTFOLIO_ID, USER_ID, POSITION_ID, req);

            assertThat(results).hasSize(1);
            assertThat(results.getFirst().positionKind()).isEqualTo(PositionKind.CLOSED);
            verify(repository).delete(open);
        }

        @Test
        @DisplayName("Kısmi kapamada kapalı + yeni açık pozisyon döner")
        void closePosition_partialClose_returnsTwoPositions() {
            ManualPosition open = buildOpenPosition(new BigDecimal("100"));
            ClosePositionRequest req = new ClosePositionRequest(
                    new BigDecimal("120.00"), EXIT, new BigDecimal("60"));

            when(portfolioService.getOwnedPortfolio(PORTFOLIO_ID, USER_ID)).thenReturn(null);
            when(repository.findByIdAndPortfolioId(POSITION_ID, PORTFOLIO_ID)).thenReturn(Optional.of(open));
            when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            List<ManualPositionResponse> results = service.closePosition(PORTFOLIO_ID, USER_ID, POSITION_ID, req);

            assertThat(results).hasSize(2);
            assertThat(results.get(0).positionKind()).isEqualTo(PositionKind.CLOSED);
            assertThat(results.get(0).quantity()).isEqualByComparingTo("60");
            assertThat(results.get(1).positionKind()).isEqualTo(PositionKind.OPEN);
            assertThat(results.get(1).quantity()).isEqualByComparingTo("40");
        }

        @Test
        @DisplayName("Kapalı pozisyon tekrar kapatılamaz — BadRequestException")
        void closePosition_whenAlreadyClosed_throwsBadRequest() {
            ManualPosition closed = buildClosedPosition();
            ClosePositionRequest req = new ClosePositionRequest(
                    new BigDecimal("130.00"), EXIT, new BigDecimal("100"));

            when(portfolioService.getOwnedPortfolio(PORTFOLIO_ID, USER_ID)).thenReturn(null);
            when(repository.findByIdAndPortfolioId(POSITION_ID, PORTFOLIO_ID)).thenReturn(Optional.of(closed));

            assertThatThrownBy(() -> service.closePosition(PORTFOLIO_ID, USER_ID, POSITION_ID, req))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Satış miktarı pozisyon miktarını aşarsa BadRequestException fırlatılır")
        void closePosition_whenExceedingQuantity_throwsBadRequest() {
            ManualPosition open = buildOpenPosition(new BigDecimal("50"));
            ClosePositionRequest req = new ClosePositionRequest(
                    new BigDecimal("120.00"), EXIT, new BigDecimal("100"));

            when(portfolioService.getOwnedPortfolio(PORTFOLIO_ID, USER_ID)).thenReturn(null);
            when(repository.findByIdAndPortfolioId(POSITION_ID, PORTFOLIO_ID)).thenReturn(Optional.of(open));

            assertThatThrownBy(() -> service.closePosition(PORTFOLIO_ID, USER_ID, POSITION_ID, req))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Satış tarihi alış tarihinden önceyse BadRequestException fırlatılır")
        void closePosition_whenExitDateBeforeEntryDate_throwsBadRequest() {
            ManualPosition open = buildOpenPosition(new BigDecimal("100"));
            ClosePositionRequest req = new ClosePositionRequest(
                    new BigDecimal("120.00"), ENTRY.minusDays(1), new BigDecimal("50"));

            when(portfolioService.getOwnedPortfolio(PORTFOLIO_ID, USER_ID)).thenReturn(null);
            when(repository.findByIdAndPortfolioId(POSITION_ID, PORTFOLIO_ID)).thenReturn(Optional.of(open));

            assertThatThrownBy(() -> service.closePosition(PORTFOLIO_ID, USER_ID, POSITION_ID, req))
                    .isInstanceOf(BadRequestException.class);
        }
    }

    @Nested
    @DisplayName("Pozisyon Silme")
    class DeletePosition {

        @Test
        @DisplayName("Sahip olunan pozisyon başarıyla silinir")
        void delete_deletesOwnedPosition() {
            ManualPosition pos = buildOpenPosition(new BigDecimal("100"));
            when(portfolioService.getOwnedPortfolio(PORTFOLIO_ID, USER_ID)).thenReturn(null);
            when(repository.findByIdAndPortfolioId(POSITION_ID, PORTFOLIO_ID)).thenReturn(Optional.of(pos));

            service.delete(PORTFOLIO_ID, USER_ID, POSITION_ID);

            verify(repository).delete(pos);
        }

        @Test
        @DisplayName("Pozisyon bulunamazsa NotFoundException fırlatılır")
        void delete_whenNotFound_throwsNotFoundException() {
            when(portfolioService.getOwnedPortfolio(PORTFOLIO_ID, USER_ID)).thenReturn(null);
            when(repository.findByIdAndPortfolioId(99L, PORTFOLIO_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.delete(PORTFOLIO_ID, USER_ID, 99L))
                    .isInstanceOf(NotFoundException.class);
        }
    }
}
