package com.alper.backend.admin.service;

import com.alper.backend.market.bond.repository.BondRateHistoryRepository;
import com.alper.backend.market.fund.repository.FundAllocationRepository;
import com.alper.backend.market.fund.repository.FundPriceRepository;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import com.alper.backend.market.macro.repository.MacroObservationRepository;
import com.alper.backend.market.stocks.repository.StockPriceHistoryRepository;
import com.alper.backend.market.stocks.repository.StockPriceSnapshotRepository;
import com.alper.backend.market.stocks.repository.StockTechnicalIndicatorRepository;
import com.alper.backend.market.viop.repository.ViopContractPriceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminMarketClearService Testleri")
class AdminMarketClearServiceTest {

    @Mock private ExchangeRateRepository exchangeRateRepository;
    @Mock private StockPriceHistoryRepository stockPriceHistoryRepository;
    @Mock private StockPriceSnapshotRepository stockPriceSnapshotRepository;
    @Mock private StockTechnicalIndicatorRepository stockTechnicalIndicatorRepository;
    @Mock private BondRateHistoryRepository bondRateHistoryRepository;
    @Mock private FundPriceRepository fundPriceRepository;
    @Mock private FundAllocationRepository fundAllocationRepository;
    @Mock private MacroObservationRepository macroObservationRepository;
    @Mock private ViopContractPriceRepository viopContractPriceRepository;

    private AdminMarketClearService service;

    @BeforeEach
    void setUp() {
        service = new AdminMarketClearService(
                exchangeRateRepository,
                stockPriceHistoryRepository,
                stockPriceSnapshotRepository,
                stockTechnicalIndicatorRepository,
                bondRateHistoryRepository,
                fundPriceRepository,
                fundAllocationRepository,
                macroObservationRepository,
                viopContractPriceRepository
        );
    }

    @Nested
    @DisplayName("Veri Temizleme")
    class ClearOperations {

        @Test
        @DisplayName("clearFx — tüm fx kayıtlarını siler ve sayıyı döner")
        void clearFx_deletesAllAndReturnsCount() {
            when(exchangeRateRepository.count()).thenReturn(150L);

            long result = service.clearFx();

            assertThat(result).isEqualTo(150L);
            verify(exchangeRateRepository).deleteAllInBatch();
        }

        @Test
        @DisplayName("clearStocks — üç tabloyu siler ve toplamı döner")
        void clearStocks_deletesAllThreeTablesAndReturnsTotal() {
            when(stockTechnicalIndicatorRepository.count()).thenReturn(300L);
            when(stockPriceSnapshotRepository.count()).thenReturn(200L);
            when(stockPriceHistoryRepository.count()).thenReturn(1000L);

            long result = service.clearStocks();

            assertThat(result).isEqualTo(1500L);
            verify(stockTechnicalIndicatorRepository).deleteAllInBatch();
            verify(stockPriceSnapshotRepository).deleteAllInBatch();
            verify(stockPriceHistoryRepository).deleteAllInBatch();
        }

        @Test
        @DisplayName("clearBonds — bond geçmişini siler ve sayıyı döner")
        void clearBonds_deletesAndReturnsCount() {
            when(bondRateHistoryRepository.count()).thenReturn(80L);

            long result = service.clearBonds();

            assertThat(result).isEqualTo(80L);
            verify(bondRateHistoryRepository).deleteAllInBatch();
        }

        @Test
        @DisplayName("clearFunds — iki tabloyu siler ve toplamı döner")
        void clearFunds_deletesTwoTablesAndReturnsTotal() {
            when(fundAllocationRepository.count()).thenReturn(50L);
            when(fundPriceRepository.count()).thenReturn(200L);

            long result = service.clearFunds();

            assertThat(result).isEqualTo(250L);
            verify(fundAllocationRepository).deleteAllInBatch();
            verify(fundPriceRepository).deleteAllInBatch();
        }

        @Test
        @DisplayName("clearMacro — makro gözlemleri siler ve sayıyı döner")
        void clearMacro_deletesAndReturnsCount() {
            when(macroObservationRepository.count()).thenReturn(36L);

            long result = service.clearMacro();

            assertThat(result).isEqualTo(36L);
            verify(macroObservationRepository).deleteAllInBatch();
        }

        @Test
        @DisplayName("clearViop — viop fiyatlarını siler ve sayıyı döner")
        void clearViop_deletesAndReturnsCount() {
            when(viopContractPriceRepository.count()).thenReturn(500L);

            long result = service.clearViop();

            assertThat(result).isEqualTo(500L);
            verify(viopContractPriceRepository).deleteAllInBatch();
        }
    }

    @Nested
    @DisplayName("Sınır Durumları")
    class EdgeCases {

        @Test
        @DisplayName("Tablo boş iken clear çağrıldığında 0 döner")
        void clearFx_whenEmpty_returnsZero() {
            when(exchangeRateRepository.count()).thenReturn(0L);

            long result = service.clearFx();

            assertThat(result).isZero();
            verify(exchangeRateRepository).deleteAllInBatch();
        }

        @Test
        @DisplayName("clearStocks — tüm tablolar boş iken 0 döner")
        void clearStocks_whenAllEmpty_returnsZero() {
            when(stockTechnicalIndicatorRepository.count()).thenReturn(0L);
            when(stockPriceSnapshotRepository.count()).thenReturn(0L);
            when(stockPriceHistoryRepository.count()).thenReturn(0L);

            long result = service.clearStocks();

            assertThat(result).isZero();
        }
    }
}
