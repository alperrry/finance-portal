package com.alper.backend.admin.service;

import com.alper.backend.admin.dto.BackfillResponse;
import com.alper.backend.market.bond.service.BondBackfillService;
import com.alper.backend.market.fund.service.TefasBackfillService;
import com.alper.backend.market.fx.service.TcmbBackfillService;
import com.alper.backend.market.macro.service.MacroFetchService;
import com.alper.backend.market.stocks.service.YahooBackfillService;
import com.alper.backend.market.viop.service.ViopScraperService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminMarketService Testleri")
class AdminMarketServiceTest {

    @Mock private YahooBackfillService yahooBackfillService;
    @Mock private TcmbBackfillService tcmbBackfillService;
    @Mock private BondBackfillService bondBackfillService;
    @Mock private TefasBackfillService tefasBackfillService;
    @Mock private MacroFetchService macroFetchService;
    @Mock private ViopScraperService viopScraperService;

    private AdminMarketService service;

    @BeforeEach
    void setUp() {
        service = new AdminMarketService(
                yahooBackfillService,
                tcmbBackfillService,
                bondBackfillService,
                tefasBackfillService,
                macroFetchService,
                viopScraperService
        );
    }

    private Map<String, AtomicBoolean> getRunningFlags() throws Exception {
        Field field = AdminMarketService.class.getDeclaredField("runningFlags");
        field.setAccessible(true);
        @SuppressWarnings("unchecked")
        Map<String, AtomicBoolean> flags = (Map<String, AtomicBoolean>) field.get(service);
        return flags;
    }

    @Nested
    @DisplayName("Backfill Tetikleme — TRIGGERED")
    class BackfillTriggered {

        @Test
        @DisplayName("triggerFxBackfill — idle iken TRIGGERED döner")
        void triggerFxBackfill_whenIdle_returnsTriggered() {
            BackfillResponse response = service.triggerFxBackfill();

            assertThat(response.status()).isEqualTo("TRIGGERED");
            assertThat(response.module()).isEqualTo("fx");
        }

        @Test
        @DisplayName("triggerStocksBackfill — idle iken TRIGGERED döner")
        void triggerStocksBackfill_whenIdle_returnsTriggered() {
            BackfillResponse response = service.triggerStocksBackfill();

            assertThat(response.status()).isEqualTo("TRIGGERED");
            assertThat(response.module()).isEqualTo("stocks");
        }

        @Test
        @DisplayName("triggerBondsBackfill — idle iken TRIGGERED döner")
        void triggerBondsBackfill_whenIdle_returnsTriggered() {
            BackfillResponse response = service.triggerBondsBackfill();

            assertThat(response.status()).isEqualTo("TRIGGERED");
            assertThat(response.module()).isEqualTo("bonds");
        }

        @Test
        @DisplayName("triggerFundsBackfill — idle iken TRIGGERED döner")
        void triggerFundsBackfill_whenIdle_returnsTriggered() {
            BackfillResponse response = service.triggerFundsBackfill();

            assertThat(response.status()).isEqualTo("TRIGGERED");
            assertThat(response.module()).isEqualTo("funds");
        }

        @Test
        @DisplayName("triggerMacroBackfill — idle iken TRIGGERED döner")
        void triggerMacroBackfill_whenIdle_returnsTriggered() {
            BackfillResponse response = service.triggerMacroBackfill();

            assertThat(response.status()).isEqualTo("TRIGGERED");
            assertThat(response.module()).isEqualTo("macro");
        }

        @Test
        @DisplayName("triggerViopBackfill — idle iken TRIGGERED döner")
        void triggerViopBackfill_whenIdle_returnsTriggered() {
            BackfillResponse response = service.triggerViopBackfill();

            assertThat(response.status()).isEqualTo("TRIGGERED");
            assertThat(response.module()).isEqualTo("viop");
        }
    }

    @Nested
    @DisplayName("Backfill Tetikleme — ALREADY_RUNNING")
    class BackfillAlreadyRunning {

        @Test
        @DisplayName("triggerFxBackfill — bayrak zaten true iken ALREADY_RUNNING döner")
        void triggerFxBackfill_whenRunning_returnsAlreadyRunning() throws Exception {
            getRunningFlags().get("fx").set(true);

            BackfillResponse response = service.triggerFxBackfill();

            assertThat(response.status()).isEqualTo("ALREADY_RUNNING");
            assertThat(response.module()).isEqualTo("fx");
        }

        @Test
        @DisplayName("triggerStocksBackfill — bayrak zaten true iken ALREADY_RUNNING döner")
        void triggerStocksBackfill_whenRunning_returnsAlreadyRunning() throws Exception {
            getRunningFlags().get("stocks").set(true);

            BackfillResponse response = service.triggerStocksBackfill();

            assertThat(response.status()).isEqualTo("ALREADY_RUNNING");
        }
    }

    @Nested
    @DisplayName("AtomicBoolean Flag Yönetimi")
    class FlagManagement {

        @Test
        @DisplayName("runFxAsync tamamlandığında bayrak false'a döner")
        void runFxAsync_resetsFlag() {
            AtomicBoolean flag = new AtomicBoolean(true);

            service.runFxAsync(flag);

            assertThat(flag.get()).isFalse();
        }

        @Test
        @DisplayName("runStocksAsync tamamlandığında bayrak false'a döner")
        void runStocksAsync_resetsFlag() {
            AtomicBoolean flag = new AtomicBoolean(true);

            service.runStocksAsync(flag);

            assertThat(flag.get()).isFalse();
        }

        @Test
        @DisplayName("runBondsAsync tamamlandığında bayrak false'a döner")
        void runBondsAsync_resetsFlag() {
            AtomicBoolean flag = new AtomicBoolean(true);

            service.runBondsAsync(flag);

            assertThat(flag.get()).isFalse();
        }
    }
}
