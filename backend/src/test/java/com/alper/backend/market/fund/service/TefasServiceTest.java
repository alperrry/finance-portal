package com.alper.backend.market.fund.service;

import com.alper.backend.common.exception.ExternalApiException;
import com.alper.backend.market.fund.mapper.TefasMapper;
import com.alper.backend.market.fund.model.Fund;
import com.alper.backend.market.fund.repository.FundAllocationRepository;
import com.alper.backend.market.fund.repository.FundPriceRepository;
import com.alper.backend.market.fund.repository.FundRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.OkHttpClient;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("TefasService")
class TefasServiceTest {

    private MockWebServer server;
    private TefasService service;
    private TefasCookieService cookieService;
    private FundPriceRepository fundPriceRepository;
    private FundAllocationRepository fundAllocationRepository;

    @BeforeEach
    void setUp() throws Exception {
        server = new MockWebServer();
        server.start();

        FundRepository fundRepository = mock(FundRepository.class);
        fundPriceRepository = mock(FundPriceRepository.class);
        fundAllocationRepository = mock(FundAllocationRepository.class);
        cookieService = mock(TefasCookieService.class);

        Fund fund = Fund.builder()
                .id(1L)
                .code("MAC")
                .name("Marmara Capital")
                .fundType("YAT")
                .build();
        when(fundRepository.findByCode("MAC")).thenReturn(Optional.of(fund));
        when(cookieService.getCookie()).thenReturn("TEFASSESSION=test-cookie");

        service = new TefasService(
                new OkHttpClient(),
                new ObjectMapper(),
                new TefasMapper(),
                cookieService,
                fundRepository,
                fundPriceRepository,
                fundAllocationRepository,
                mock(ApplicationEventPublisher.class));
        ReflectionTestUtils.setField(service, "baseUrl", server.url("").toString());
        ReflectionTestUtils.setField(service, "portalUrl", server.url("/dummy/tefas/fon-verileri").toString());
        ReflectionTestUtils.setField(service, "requestDelayMs", 0L);
        ReflectionTestUtils.setField(service, "retryDelaysMs", List.of(0L, 0L, 0L));
    }

    @AfterEach
    void tearDown() throws Exception {
        server.shutdown();
    }

    @Test
    @DisplayName("Yeni TEFAS API endpointlerini JSON payload ile çağırır")
    void callsNewApiEndpointsWithJsonPayload() throws Exception {
        server.enqueue(jsonResponse("""
                {"errorCode":null,"errorMessage":null,"resultList":[
                  {"fonKodu":"MAC","fonUnvan":"MAC","tarih":"2026-04-24","fiyat":12.345678,
                   "tedPaySayisi":100000000.00,"kisiSayisi":15000,"portfoyBuyukluk":1234567890.50}
                ],"toplamSayi":1,"toplamSayfa":1}
                """));
        server.enqueue(jsonResponse("""
                {"errorCode":null,"errorMessage":null,"resultList":[
                  {"fonKodu":"MAC","fonUnvan":"MAC","tarih":"2026-04-24","hs":45.5,"tpp":2.1}
                ],"toplamSayi":1,"toplamSayfa":1}
                """));

        TefasFetchResult result = service.fetchAndSaveForDate(
                "MAC", LocalDate.of(2026, 4, 24), LocalDate.of(2026, 4, 24));

        RecordedRequest infoRequest = server.takeRequest();
        RecordedRequest allocationRequest = server.takeRequest();

        assertThat(infoRequest.getPath()).isEqualTo("/api/funds/fonGnlBlgSiraliGetir");
        assertThat(allocationRequest.getPath()).isEqualTo("/api/funds/dagilimSiraliGetirT");
        assertThat(infoRequest.getHeader("Content-Type")).contains("application/json");
        assertThat(infoRequest.getBody().readUtf8())
                .contains("\"fonKodu\":\"MAC\"")
                .contains("\"basTarih\":\"20260424\"")
                .contains("\"bitTarih\":\"20260424\"");
        assertThat(allocationRequest.getBody().readUtf8())
                .contains("\"fonKodu\":null")
                .contains("\"aramaMetni\":\"MAC\"");
        assertThat(result.infoRowCount()).isEqualTo(1);
        assertThat(result.allocationRowCount()).isEqualTo(1);
        assertThat(result.empty()).isFalse();
        verify(fundPriceRepository).save(any());
        verify(fundAllocationRepository).save(any());
    }

    @Test
    @DisplayName("Allocation response'unu trim sonrası exact fon kodu ile filtreler")
    void filtersAllocationRowsByExactTrimmedFundCode() {
        server.enqueue(jsonResponse("""
                {"errorCode":null,"errorMessage":null,"resultList":[
                  {"fonKodu":"MAC","fonUnvan":"MAC","tarih":"2026-04-24","fiyat":12.345678}
                ],"toplamSayi":1,"toplamSayfa":1}
                """));
        server.enqueue(jsonResponse("""
                {"errorCode":null,"errorMessage":null,"resultList":[
                  {"fonKodu":"XMAC","fonUnvan":"XMAC","tarih":"2026-04-24","hs":10.0},
                  {"fonKodu":" MAC ","fonUnvan":"MAC","tarih":"2026-04-24","hs":45.5}
                ],"toplamSayi":2,"toplamSayfa":1}
                """));

        TefasFetchResult result = service.fetchAndSaveForDate(
                "MAC", LocalDate.of(2026, 4, 24), LocalDate.of(2026, 4, 24));

        assertThat(result.allocationRowCount()).isEqualTo(1);
        verify(fundAllocationRepository).save(any());
    }

    @Test
    @DisplayName("Info ve matching allocation boşsa sonucu boş olarak döndürür")
    void returnsEmptyResultWhenInfoAndMatchingAllocationRowsAreEmpty() {
        server.enqueue(jsonResponse("""
                {"errorCode":null,"errorMessage":null,"resultList":[],"toplamSayi":0,"toplamSayfa":0}
                """));
        server.enqueue(jsonResponse("""
                {"errorCode":null,"errorMessage":null,"resultList":[
                  {"fonKodu":"XMAC","fonUnvan":"XMAC","tarih":"2026-04-24","hs":10.0}
                ],"toplamSayi":1,"toplamSayfa":1}
                """));

        TefasFetchResult result = service.fetchAndSaveForDate(
                "MAC", LocalDate.of(2026, 4, 24), LocalDate.of(2026, 4, 24));

        assertThat(result.infoRowCount()).isZero();
        assertThat(result.allocationRowCount()).isZero();
        assertThat(result.empty()).isTrue();
    }

    @Test
    @DisplayName("TEFAS API errorMessage yanıtını hata olarak sınıflandırır")
    void classifiesApiErrorMessageAsFailure() {
        server.enqueue(jsonResponse("""
                {"errorCode":null,"errorMessage":"Geçersiz veri: Tarih aralığı 1 ayı aşamaz",
                 "resultList":null,"toplamSayi":null,"toplamSayfa":null}
                """));

        ExternalApiException ex = assertThrows(ExternalApiException.class,
                () -> service.fetchAndSaveForDate("MAC", LocalDate.of(2026, 5, 7), LocalDate.of(2026, 5, 7)));

        assertThat(ex.getMessage())
                .contains("TEFAS API hata döndü")
                .contains("Tarih aralığı 1 ayı aşamaz");
    }

    private MockResponse jsonResponse(String body) {
        return new MockResponse()
                .setResponseCode(200)
                .addHeader("Content-Type", "application/json")
                .setBody(body);
    }
}
