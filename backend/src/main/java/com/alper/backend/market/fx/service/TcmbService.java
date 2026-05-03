package com.alper.backend.market.fx.service;

import com.alper.backend.common.exception.ExternalApiException;
import com.alper.backend.common.exception.ServiceType;
import com.alper.backend.market.fx.event.FxRatesUpdatedEvent;
import com.alper.backend.market.fx.model.ExchangeRate;
import com.alper.backend.market.fx.dto.TcmbCurrency;
import com.alper.backend.market.fx.dto.TcmbResponse;
import com.alper.backend.market.fx.mapper.TcmbMapper;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Log4j2
@Service
@RequiredArgsConstructor
public class TcmbService {

    private static final DateTimeFormatter TCMB_DATE_FORMAT = DateTimeFormatter.ofPattern("MM/dd/yyyy");

    @Value("${tcmb.url}")
    private String tcmbUrl;

    private final OkHttpClient okHttpClient;
    private final TcmbMapper tcmbMapper;
    private final ExchangeRateRepository exchangeRateRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public void fetchAndSave() {
        log.info("TCMB kur verisi çekiliyor...");
        String xml = fetchXml(tcmbUrl);
        TcmbResponse response = parseXml(xml);
        List<ExchangeRate> savedRates = saveAll(response);
        if (!savedRates.isEmpty()) {
            eventPublisher.publishEvent(FxRatesUpdatedEvent.of(savedRates));
        }
        log.info("TCMB kur verisi başarıyla kaydedildi. Tarih: {}", response.getRateDate());
    }

    @Transactional
    public void fetchAndSaveForDate(String url, LocalDate date) {
        log.debug("TCMB arşiv verisi çekiliyor. Tarih: {}", date);
        String xml = fetchXml(url);
        TcmbResponse response = parseXml(xml);
        saveAll(response);
    }

    private String fetchXml(String url) {
        Request request = new Request.Builder()
                .url(url)
                .build();

        try (Response response = okHttpClient.newCall(request).execute()) {
            if (!response.isSuccessful() || response.body() == null) {
                throw new ExternalApiException("Geçersiz yanıt alındı. HTTP: " + response.code(), ServiceType.TCMB);
            }
            return response.body().string();
        } catch (ExternalApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ExternalApiException("TCMB'ye bağlanılamadı.", e, ServiceType.TCMB);
        }
    }

    private TcmbResponse parseXml(String xml) {
        try {
            DocumentBuilder builder = DocumentBuilderFactory.newInstance().newDocumentBuilder();
            Document document = builder.parse(new ByteArrayInputStream(xml.getBytes()));
            document.getDocumentElement().normalize();

            Element root = document.getDocumentElement();
            String dateStr = root.getAttribute("Date");
            LocalDate rateDate = LocalDate.parse(dateStr, TCMB_DATE_FORMAT);

            NodeList currencyNodes = document.getElementsByTagName("Currency");
            List<TcmbCurrency> currencies = new ArrayList<>();

            for (int i = 0; i < currencyNodes.getLength(); i++) {
                Element element = (Element) currencyNodes.item(i);
                TcmbCurrency dto = TcmbCurrency.builder()
                        .currencyCode(element.getAttribute("CurrencyCode"))
                        .currencyName(getTagValue(element, "CurrencyName"))
                        .unit(Integer.parseInt(getTagValue(element, "Unit")))
                        .forexBuying(getTagValue(element, "ForexBuying"))
                        .forexSelling(getTagValue(element, "ForexSelling"))
                        .build();
                currencies.add(dto);
            }

            return TcmbResponse.builder()
                    .rateDate(rateDate)
                    .currencies(currencies)
                    .build();

        } catch (ExternalApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ExternalApiException("TCMB XML parse edilemedi.", e, ServiceType.TCMB);
        }
    }

    private List<ExchangeRate> saveAll(TcmbResponse response) {
        List<ExchangeRate> entities = tcmbMapper.toEntityList(response);
        List<ExchangeRate> savedRates = new ArrayList<>();
        int saved = 0, skipped = 0;

        for (ExchangeRate entity : entities) {
            if (exchangeRateRepository.findByCurrencyCodeAndRateDate(
                    entity.getCurrencyCode(), entity.getRateDate()).isPresent()) {
                skipped++;
            } else {
                ExchangeRate savedRate = exchangeRateRepository.save(entity);
                savedRates.add(savedRate);
                saved++;
            }
        }
        log.info("Kaydedildi: {}, Atlandı: {}", saved, skipped);
        return savedRates;
    }

    private String getTagValue(Element element, String tagName) {
        NodeList nodes = element.getElementsByTagName(tagName);
        if (nodes.getLength() == 0) return null;
        return nodes.item(0).getTextContent();
    }
}
