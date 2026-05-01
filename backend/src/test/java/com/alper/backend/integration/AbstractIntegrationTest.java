package com.alper.backend.integration;

import com.alper.backend.market.bond.model.Bond;
import com.alper.backend.market.bond.model.BondRateHistory;
import com.alper.backend.market.bond.repository.BondRateHistoryRepository;
import com.alper.backend.market.bond.repository.BondRepository;
import com.alper.backend.market.bond.service.BondBackfillService;
import com.alper.backend.market.bond.service.EvdsService;
import com.alper.backend.market.fund.model.Fund;
import com.alper.backend.market.fund.model.FundAllocation;
import com.alper.backend.market.fund.model.FundPrice;
import com.alper.backend.market.fund.repository.FundAllocationRepository;
import com.alper.backend.market.fund.repository.FundPriceRepository;
import com.alper.backend.market.fund.repository.FundRepository;
import com.alper.backend.market.fund.service.TefasBackfillService;
import com.alper.backend.market.fund.service.TefasCookieService;
import com.alper.backend.market.fund.service.TefasService;
import com.alper.backend.market.fx.model.ExchangeRate;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import com.alper.backend.market.fx.service.TcmbBackfillService;
import com.alper.backend.market.fx.service.TcmbService;
import com.alper.backend.market.stocks.model.Stock;
import com.alper.backend.market.stocks.model.StockPriceHistory;
import com.alper.backend.market.stocks.model.StockPriceSnapshot;
import com.alper.backend.market.stocks.repository.StockPriceHistoryRepository;
import com.alper.backend.market.stocks.repository.StockPriceSnapshotRepository;
import com.alper.backend.market.stocks.repository.StockRepository;
import com.alper.backend.market.stocks.repository.StockTechnicalIndicatorRepository;
import com.alper.backend.market.stocks.service.StockIndicatorService;
import com.alper.backend.market.stocks.service.YahooBackfillService;
import com.alper.backend.market.stocks.service.YahooCrumbService;
import com.alper.backend.market.stocks.service.YahooService;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.mockwebserver.Dispatcher;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.util.StreamUtils;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class AbstractIntegrationTest {

    protected static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("finance_test")
            .withUsername("finance_user")
            .withPassword("finance_pass")
            .withReuse(true);

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void registerProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
    }

    @Autowired protected MockMvc mockMvc;
    @Autowired protected ObjectMapper objectMapper;
    @Autowired protected JdbcTemplate jdbcTemplate;
    @Autowired protected BondRepository bondRepository;
    @Autowired protected BondRateHistoryRepository bondRateHistoryRepository;
    @Autowired protected ExchangeRateRepository exchangeRateRepository;
    @Autowired protected FundRepository fundRepository;
    @Autowired protected FundPriceRepository fundPriceRepository;
    @Autowired protected FundAllocationRepository fundAllocationRepository;
    @Autowired protected StockRepository stockRepository;
    @Autowired protected StockPriceHistoryRepository historyRepository;
    @Autowired protected StockPriceSnapshotRepository snapshotRepository;
    @Autowired protected StockTechnicalIndicatorRepository indicatorRepository;
    @Autowired protected BondBackfillService bondBackfillService;
    @Autowired protected EvdsService evdsService;
    @Autowired protected TcmbBackfillService tcmbBackfillService;
    @Autowired protected TcmbService tcmbService;
    @Autowired protected TefasBackfillService tefasBackfillService;
    @Autowired protected TefasService tefasService;
    @Autowired protected TefasCookieService tefasCookieService;
    @Autowired protected YahooBackfillService yahooBackfillService;
    @Autowired protected YahooService yahooService;
    @Autowired protected StockIndicatorService stockIndicatorService;
    @Autowired protected YahooCrumbService yahooCrumbService;

    @Value("${test.mock.server.port}")
    private int mockServerPort;

    protected MockWebServer mockWebServer;

    @BeforeEach
    void setUpIntegrationBase() throws Exception {
        cleanMarketTables();
        reactivateAllStocks();
        resetYahooCrumbCache();
        resetTefasCookieCache();

        mockWebServer = new MockWebServer();
        mockWebServer.start(mockServerPort);
        mockWebServer.setDispatcher(notFoundDispatcher());
    }

    @AfterEach
    void tearDownIntegrationBase() {
        if (mockWebServer != null) {
            try {
                mockWebServer.shutdown();
            } catch (IOException ignored) {
                // Test aktif olarak bağlantı refused senaryosu için server'ı kapatmış olabilir.
            }
        }
    }

    protected void cleanMarketTables() {
        jdbcTemplate.execute("TRUNCATE TABLE fund_allocation, fund_price, exchange_rate, bond_rate_history, stock_technical_indicator, stock_price_snapshot, stock_price_history RESTART IDENTITY");
    }

    protected void cleanStockTables() {
        jdbcTemplate.execute("TRUNCATE TABLE stock_technical_indicator, stock_price_snapshot, stock_price_history RESTART IDENTITY");
    }

    protected void reactivateAllStocks() {
        jdbcTemplate.update("UPDATE stock SET is_active = TRUE");
    }

    protected void activateOnlySymbol(String symbol) {
        jdbcTemplate.update("UPDATE stock SET is_active = (symbol = ?)", symbol);
    }

    protected Stock stock(String symbol) {
        return stockRepository.findBySymbol(symbol)
                .orElseThrow(() -> new IllegalArgumentException("Stock bulunamadı: " + symbol));
    }

    protected Bond bond(String seriesCode) {
        return bondRepository.findByEvdsSeriesCode(seriesCode)
                .orElseThrow(() -> new IllegalArgumentException("Bond bulunamadı: " + seriesCode));
    }

    protected Fund fund(String code) {
        return fundRepository.findByCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Fon bulunamadı: " + code));
    }

    protected BondRateHistory insertBondRate(String seriesCode, LocalDate rateDate, BigDecimal interestRate) {
        Bond bond = bond(seriesCode);
        return bondRateHistoryRepository.save(BondRateHistory.builder()
                .bond(bond)
                .rateDate(rateDate)
                .interestRate(interestRate)
                .compoundedRate(interestRate.add(new BigDecimal("0.55")))
                .source("TCMB_EVDS")
                .build());
    }

    protected ExchangeRate insertExchangeRate(String currencyCode, String currencyName, Integer unit,
                                              BigDecimal forexBuying, BigDecimal forexSelling, LocalDate rateDate) {
        return exchangeRateRepository.save(ExchangeRate.builder()
                .currencyCode(currencyCode)
                .currencyName(currencyName)
                .unit(unit)
                .forexBuying(forexBuying)
                .forexSelling(forexSelling)
                .rateDate(rateDate)
                .source("TCMB")
                .build());
    }

    protected FundPrice insertFundPrice(String code, LocalDate priceDate, BigDecimal price) {
        Fund fund = fund(code);
        return fundPriceRepository.save(FundPrice.builder()
                .fund(fund)
                .priceDate(priceDate)
                .price(price)
                .totalShares(new BigDecimal("100000000.00"))
                .investorCount(15000)
                .portfolioSize(new BigDecimal("1234567890.50"))
                .build());
    }

    protected FundAllocation insertFundAllocation(String code, LocalDate allocationDate) {
        Fund fund = fund(code);
        return fundAllocationRepository.save(FundAllocation.builder()
                .fund(fund)
                .allocationDate(allocationDate)
                .hs(new BigDecimal("45.5000"))
                .kb(new BigDecimal("15.0000"))
                .gas(new BigDecimal("3.5000"))
                .diger(new BigDecimal("1.0000"))
                .build());
    }

    protected StockPriceSnapshot insertSnapshot(String symbol, BigDecimal price) {
        Stock stock = stock(symbol);
        return snapshotRepository.save(StockPriceSnapshot.builder()
                .stock(stock)
                .price(price)
                .change(new BigDecimal("1.25"))
                .changePercent(new BigDecimal("1.54"))
                .open(price.subtract(new BigDecimal("0.60")))
                .dayHigh(price.add(new BigDecimal("0.80")))
                .dayLow(price.subtract(new BigDecimal("1.20")))
                .previousClose(price.subtract(new BigDecimal("0.45")))
                .volume(12_500_000L)
                .marketCap(450_000_000_000L)
                .fiftyTwoWeekHigh(price.add(new BigDecimal("10.00")))
                .fiftyTwoWeekLow(price.subtract(new BigDecimal("15.00")))
                .tradeDate(LocalDate.now())
                .build());
    }

    protected List<StockPriceHistory> insertHistorySeries(String symbol, LocalDate startDate, int days, BigDecimal startingClose) {
        Stock stock = stock(symbol);
        List<StockPriceHistory> rows = new ArrayList<>();

        for (int i = 0; i < days; i++) {
            LocalDate tradeDate = startDate.plusDays(i);
            BigDecimal close = startingClose.add(BigDecimal.valueOf(i));
            rows.add(StockPriceHistory.builder()
                    .stock(stock)
                    .tradeDate(tradeDate)
                    .openPrice(close.subtract(new BigDecimal("0.80")))
                    .highPrice(close.add(new BigDecimal("1.20")))
                    .lowPrice(close.subtract(new BigDecimal("1.50")))
                    .closePrice(close)
                    .adjClose(close)
                    .volume(1_000_000L + (i * 10_000L))
                    .build());
        }

        return historyRepository.saveAll(rows);
    }

    protected String fixture(String path) throws IOException {
        ClassPathResource resource = new ClassPathResource(path);
        return StreamUtils.copyToString(resource.getInputStream(), StandardCharsets.UTF_8);
    }

    protected void useDispatcher(Dispatcher dispatcher) {
        mockWebServer.setDispatcher(dispatcher);
    }

    protected MockResponse jsonResponse(String body) {
        return new MockResponse()
                .setResponseCode(200)
                .addHeader("Content-Type", "application/json")
                .setBody(body);
    }

    protected MockResponse textResponse(String body) {
        return new MockResponse()
                .setResponseCode(200)
                .addHeader("Content-Type", "text/plain")
                .setBody(body);
    }

    protected MockResponse xmlResponse(String body) {
        return new MockResponse()
                .setResponseCode(200)
                .addHeader("Content-Type", "application/xml")
                .setBody(body);
    }

    private void resetYahooCrumbCache() {
        ReflectionTestUtils.setField(yahooCrumbService, "cachedCrumb", null);
        ReflectionTestUtils.setField(yahooCrumbService, "cachedCookie", null);
    }

    private void resetTefasCookieCache() {
        ReflectionTestUtils.setField(tefasCookieService, "cachedCookie", null);
    }

    private Dispatcher notFoundDispatcher() {
        return new Dispatcher() {
            @Override
            public MockResponse dispatch(okhttp3.mockwebserver.RecordedRequest request) {
                return new MockResponse().setResponseCode(404);
            }
        };
    }
}
