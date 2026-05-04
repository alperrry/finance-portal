package com.alper.backend.portfolio.service;

import com.alper.backend.common.exception.BadRequestException;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.market.bond.model.Bond;
import com.alper.backend.market.bond.model.BondRateHistory;
import com.alper.backend.market.bond.repository.BondRateHistoryRepository;
import com.alper.backend.market.bond.repository.BondRepository;
import com.alper.backend.market.fund.model.Fund;
import com.alper.backend.market.fund.repository.FundRepository;
import com.alper.backend.market.fx.model.ExchangeRate;
import com.alper.backend.market.fx.repository.ExchangeRateRepository;
import com.alper.backend.market.stocks.model.Stock;
import com.alper.backend.market.stocks.repository.StockRepository;
import com.alper.backend.portfolio.dto.TradeRequest;
import com.alper.backend.portfolio.dto.TradeResponse;
import com.alper.backend.portfolio.event.TradeCancelledEvent;
import com.alper.backend.portfolio.mapper.TradeMapper;
import com.alper.backend.portfolio.model.OrderType;
import com.alper.backend.portfolio.model.Portfolio;
import com.alper.backend.portfolio.model.PortfolioItem;
import com.alper.backend.portfolio.model.TradeTransaction;
import com.alper.backend.portfolio.model.TransactionStatus;
import com.alper.backend.portfolio.model.TransactionType;
import com.alper.backend.portfolio.repository.PortfolioItemRepository;
import com.alper.backend.portfolio.repository.TradeTransactionRepository;
import com.alper.backend.user.event.UserBalanceUpdatedEvent;
import com.alper.backend.user.service.UserBalanceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Trade lifecycle controller-facing service.
 *
 * <p>Sorumluluklar:
 * <ul>
 *     <li>Submit: enstrüman varlık kontrolü, SELL submit-time pozisyon kontrolü</li>
 *     <li>Bond özel akışı: market order olarak anında TradeProcessService.execute</li>
 *     <li>Diğer enstrümanlar: PENDING kaydet, scheduler eşleştirsin</li>
 *     <li>List/Get: ownership-aware sorgular</li>
 *     <li>Cancel: sadece PENDING durumdaki trade'leri CANCELLED'a çevir</li>
 *     <li>Reconnect: WebSocket bağlantı koparınca eksik mesajların REST'ten çekilmesi</li>
 * </ul>
 * </p>
 */
@Service
@RequiredArgsConstructor
@Log4j2
public class TradeService {

    private static final String UNKNOWN_INSTRUMENT_SYMBOL = "Bilinmiyor";

    private final TradeTransactionRepository tradeTransactionRepository;
    private final PortfolioItemRepository portfolioItemRepository;
    private final TradeMapper tradeMapper;
    private final PortfolioService portfolioService;
    private final TradeProcessService tradeProcessService;
    private final TradeCurrencyService tradeCurrencyService;
    private final UserBalanceService userBalanceService;
    private final MockMarketPriceService mockMarketPriceService;
    private final ApplicationEventPublisher eventPublisher;

    private final StockRepository stockRepository;
    private final FundRepository fundRepository;
    private final ExchangeRateRepository exchangeRateRepository;
    private final BondRepository bondRepository;
    private final BondRateHistoryRepository bondRateHistoryRepository;

    /**
     * Yeni alış/satış talebi.
     *
     * <p>Akış:
     * <ol>
     *     <li>Portföy ownership kontrolü</li>
     *     <li>Enstrüman varlık kontrolü</li>
     *     <li>SELL ise submit-time pozisyon kontrolü (available = current - pending sells)</li>
     *     <li>BOND ise market order: anında execute, scheduler'a düşmesin</li>
     *     <li>Diğer enstrümanlar: PENDING kaydet, scheduler eşleştirsin</li>
     * </ol>
     * </p>
     */
    @Transactional
    public TradeResponse submitTrade(Long portfolioId, Long userId, TradeRequest request) {
        Portfolio portfolio = portfolioService.getOwnedPortfolio(portfolioId, userId);

        verifyInstrumentExists(request.instrumentType(), request.instrumentId());

        if (request.transactionType() == TransactionType.SELL) {
            verifySellable(portfolio.getId(), request);
        }

        OrderType orderType = request.orderType() == null ? OrderType.LIMIT : request.orderType();
        if (orderType == OrderType.LIMIT && request.targetPrice() == null) {
            throw new BadRequestException("LIMIT emir için hedef fiyat zorunludur");
        }

        TradeTransaction transaction = tradeMapper.toEntity(request, portfolio.getId());
        transaction.setOrderType(orderType);

        if (orderType == OrderType.LIMIT) {
            BigDecimal nativeTargetPrice = tradeCurrencyService.convertTargetPriceToNative(
                    request.targetPrice(),
                    portfolio.getDisplayCurrency(),
                    request.instrumentType(),
                    request.instrumentId()
            );
            transaction.setTargetPrice(nativeTargetPrice);
        } else {
            transaction.setTargetPrice(null);
        }

        if (orderType == OrderType.MARKET) {
            return submitMarketOrder(transaction);
        }

        if (request.instrumentType() == InstrumentType.BOND) {
            return submitBondMarketOrder(transaction);
        }

        reserveBuyBalanceIfNeeded(transaction, portfolio);
        TradeTransaction saved = tradeTransactionRepository.save(transaction);
        if (saved.getReservedAmount() != null) {
            eventPublisher.publishEvent(UserBalanceUpdatedEvent.of(portfolio.getUserId()));
        }
        log.info("Trade PENDING olarak kaydedildi. tradeId={}, portfolioId={}, type={}, target={}, reservedAmount={}",
                saved.getId(), portfolioId, request.transactionType(), request.targetPrice(), saved.getReservedAmount());
        return toEnrichedResponses(List.of(saved)).get(0);
    }

    private TradeResponse submitMarketOrder(TradeTransaction transaction) {
        BigDecimal executionPrice = mockMarketPriceService
                .getQuote(transaction.getInstrumentType(), transaction.getInstrumentId())
                .map(MockMarketPriceService.MarketPriceQuote::currentPrice)
                .orElseThrow(() -> new BadRequestException("Market order için güncel fiyat verisi bulunamadı"));

        TradeTransaction saved = tradeTransactionRepository.save(transaction);
        tradeProcessService.execute(saved, executionPrice);

        TradeTransaction refreshed = tradeTransactionRepository.findById(saved.getId()).orElse(saved);
        log.info("Market order tamamlandı. tradeId={}, status={}, executionPrice={}",
                refreshed.getId(), refreshed.getStatus(), executionPrice);
        return toEnrichedResponses(List.of(refreshed)).get(0);
    }

    private void reserveBuyBalanceIfNeeded(TradeTransaction transaction, Portfolio portfolio) {
        if (transaction.getTransactionType() != TransactionType.BUY) {
            return;
        }

        BigDecimal reservedAmount = calculateBalanceAmount(transaction, portfolio, transaction.getTargetPrice());
        userBalanceService.reserveBalance(portfolio.getUserId(), reservedAmount);
        transaction.setReservedAmount(reservedAmount);
    }

    private BigDecimal calculateBalanceAmount(TradeTransaction transaction, Portfolio portfolio, BigDecimal nativePrice) {
        BigDecimal totalNative = transaction.getQuantity().multiply(nativePrice);
        String nativeCurrency = tradeCurrencyService.resolveNativeCurrency(
                transaction.getInstrumentType(),
                transaction.getInstrumentId()
        );
        return tradeCurrencyService
                .convertOrThrow(totalNative, nativeCurrency, TradeCurrencyService.BALANCE_CURRENCY)
                .setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Bond için market order: bond_rate_history'den son faiz oranını çek,
     * bunu execution price olarak kullan ve TradeProcessService ile anında işle.
     * Faiz verisi yoksa BadRequestException.
     */
    private TradeResponse submitBondMarketOrder(TradeTransaction transaction) {
        Optional<BondRateHistory> historyOpt = bondRateHistoryRepository
                .findFirstByBondIdOrderByRateDateDesc(transaction.getInstrumentId());

        if (historyOpt.isEmpty() || historyOpt.get().getInterestRate() == null) {
            throw new BadRequestException("Bond için güncel fiyat verisi bulunamadı");
        }

        // Bond için target_price doldurulması gerekiyor (NOT NULL constraint).
        // Market order olduğu için target = execution.
        BigDecimal executionPrice = historyOpt.get().getInterestRate();
        transaction.setTargetPrice(executionPrice);

        TradeTransaction saved = tradeTransactionRepository.save(transaction);
        tradeProcessService.execute(saved, executionPrice);

        // execute() içinde status APPROVED'a çekildi ve event yayınlandı.
        // saved entity güncel halini almak için yeniden fetch.
        TradeTransaction refreshed = tradeTransactionRepository.findById(saved.getId()).orElse(saved);
        log.info("Bond market order tamamlandı. tradeId={}, status={}", refreshed.getId(), refreshed.getStatus());
        return toEnrichedResponses(List.of(refreshed)).get(0);
    }

    /**
     * SELL submit-time kontrolü: available_qty = current_qty - SUM(pending SELL qty).
     * Yetersizse 422 BusinessRuleException.
     */
    private void verifySellable(Long portfolioId, TradeRequest request) {
        BigDecimal currentQty = portfolioItemRepository
                .findByPortfolioIdAndInstrumentTypeAndInstrumentId(
                        portfolioId, request.instrumentType(), request.instrumentId())
                .map(PortfolioItem::getQuantity)
                .orElse(BigDecimal.ZERO);

        BigDecimal pendingSellQty = tradeTransactionRepository
                .sumQuantityByPortfolioInstrumentTypeAndStatus(
                        portfolioId,
                        request.instrumentType(),
                        request.instrumentId(),
                        TransactionType.SELL,
                        TransactionStatus.PENDING
                );
        if (pendingSellQty == null) {
            pendingSellQty = BigDecimal.ZERO;
        }

        BigDecimal available = currentQty.subtract(pendingSellQty);
        if (request.quantity().compareTo(available) > 0) {
            String reason = String.format(
                    "Yetersiz pozisyon. Mevcut: %s, talep: %s, beklemede: %s",
                    currentQty, request.quantity(), pendingSellQty);
            log.warn("SELL submit reddedildi. portfolioId={}, {}", portfolioId, reason);
            throw new BadRequestException(reason);
        }
    }

    /**
     * Enstrümanın ilgili master tablodan varlığını doğrular.
     */
    private void verifyInstrumentExists(InstrumentType type, Long instrumentId) {
        boolean exists = switch (type) {
            case STOCK -> stockRepository.existsById(instrumentId);
            case FUND -> fundRepository.existsById(instrumentId);
            case CURRENCY -> exchangeRateRepository.existsById(instrumentId);
            case BOND -> bondRepository.existsById(instrumentId);
            case VIOP -> false;
        };
        if (!exists) {
            log.warn("Enstrüman bulunamadı. type={}, id={}", type, instrumentId);
            throw new NotFoundException(type.name().toLowerCase());
        }
    }

    @Transactional(readOnly = true)
    public Page<TradeResponse> getTrades(Long portfolioId, Long userId, TransactionStatus statusFilter, Pageable pageable) {
        portfolioService.verifyPortfolioBelongsToUser(portfolioId, userId);

        Page<TradeTransaction> page = (statusFilter == null)
                ? tradeTransactionRepository.findAllByPortfolioId(portfolioId, pageable)
                : tradeTransactionRepository.findAllByPortfolioIdAndStatus(portfolioId, statusFilter, pageable);

        Map<InstrumentType, Map<Long, InstrumentInfo>> instrumentInfoByType = loadInstrumentInfo(page.getContent());
        return page.map(tx -> toEnrichedResponse(tx, instrumentInfoByType));
    }

    @Transactional(readOnly = true)
    public TradeResponse getTradeById(Long portfolioId, Long userId, Long tradeId) {
        portfolioService.verifyPortfolioBelongsToUser(portfolioId, userId);
        TradeTransaction tx = tradeTransactionRepository.findByIdAndPortfolioId(tradeId, portfolioId)
                .orElseThrow(() -> new NotFoundException("trade"));
        return toEnrichedResponses(List.of(tx)).get(0);
    }

    /**
     * WebSocket reconnect senaryosu: belirtilen tarihten sonra updated_at almış trade'leri döner.
     * Frontend bağlantı koptuğunda kaçırdığı event'leri bu endpoint'ten çekerek senkronize olur.
     */
    @Transactional(readOnly = true)
    public List<TradeResponse> getTradesSince(Long portfolioId, Long userId, Instant since) {
        portfolioService.verifyPortfolioBelongsToUser(portfolioId, userId);
        List<TradeTransaction> trades = tradeTransactionRepository.findAllByPortfolioIdAndUpdatedAtAfter(portfolioId, since);
        return toEnrichedResponses(trades);
    }

    private List<TradeResponse> toEnrichedResponses(List<TradeTransaction> trades) {
        Map<InstrumentType, Map<Long, InstrumentInfo>> instrumentInfoByType = loadInstrumentInfo(trades);
        return trades.stream()
                .map(tx -> toEnrichedResponse(tx, instrumentInfoByType))
                .toList();
    }

    private TradeResponse toEnrichedResponse(
            TradeTransaction tx,
            Map<InstrumentType, Map<Long, InstrumentInfo>> instrumentInfoByType
    ) {
        InstrumentInfo info = instrumentInfoByType
                .getOrDefault(tx.getInstrumentType(), Map.of())
                .getOrDefault(tx.getInstrumentId(), InstrumentInfo.unknown());
        return tradeMapper.toResponse(tx, info.symbol(), info.name());
    }

    private Map<InstrumentType, Map<Long, InstrumentInfo>> loadInstrumentInfo(List<TradeTransaction> trades) {
        Map<InstrumentType, Set<Long>> idsByType = trades.stream()
                .filter(tx -> tx.getInstrumentType() != null && tx.getInstrumentId() != null)
                .collect(Collectors.groupingBy(
                        TradeTransaction::getInstrumentType,
                        () -> new EnumMap<>(InstrumentType.class),
                        Collectors.mapping(TradeTransaction::getInstrumentId, Collectors.toSet())
                ));

        Map<InstrumentType, Map<Long, InstrumentInfo>> result = new EnumMap<>(InstrumentType.class);

        Set<Long> stockIds = idsByType.getOrDefault(InstrumentType.STOCK, Set.of());
        if (!stockIds.isEmpty()) {
            result.put(InstrumentType.STOCK, stockRepository.findAllById(stockIds).stream()
                    .collect(Collectors.toMap(
                            Stock::getId,
                            stock -> new InstrumentInfo(stock.getSymbol(), firstNonBlank(stock.getShortName(), stock.getLongName()))
                    )));
        }

        Set<Long> fundIds = idsByType.getOrDefault(InstrumentType.FUND, Set.of());
        if (!fundIds.isEmpty()) {
            result.put(InstrumentType.FUND, fundRepository.findAllById(fundIds).stream()
                    .collect(Collectors.toMap(
                            Fund::getId,
                            fund -> new InstrumentInfo(fund.getCode(), fund.getName())
                    )));
        }

        Set<Long> currencyIds = idsByType.getOrDefault(InstrumentType.CURRENCY, Set.of());
        if (!currencyIds.isEmpty()) {
            result.put(InstrumentType.CURRENCY, exchangeRateRepository.findAllById(currencyIds).stream()
                    .collect(Collectors.toMap(
                            ExchangeRate::getId,
                            rate -> new InstrumentInfo(rate.getCurrencyCode(), rate.getCurrencyName())
                    )));
        }

        Set<Long> bondIds = idsByType.getOrDefault(InstrumentType.BOND, Set.of());
        if (!bondIds.isEmpty()) {
            result.put(InstrumentType.BOND, bondRepository.findAllById(bondIds).stream()
                    .collect(Collectors.toMap(
                            Bond::getId,
                            bond -> new InstrumentInfo(bond.getEvdsSeriesCode(), bond.getName())
                    )));
        }

        return result;
    }

    private String firstNonBlank(String primary, String fallback) {
        return primary == null || primary.isBlank() ? fallback : primary;
    }

    private record InstrumentInfo(String symbol, String name) {

        private InstrumentInfo {
            symbol = symbol == null || symbol.isBlank() ? UNKNOWN_INSTRUMENT_SYMBOL : symbol;
            name = name == null || name.isBlank() ? null : name;
        }

        private static InstrumentInfo unknown() {
            return new InstrumentInfo(UNKNOWN_INSTRUMENT_SYMBOL, null);
        }
    }

    /**
     * Sadece PENDING durumdaki trade kullanıcı tarafından iptal edilebilir.
     * Diğer durumlar 400 BadRequest döner.
     */
    @Transactional
    public void cancelTrade(Long portfolioId, Long userId, Long tradeId) {
        Portfolio portfolio = portfolioService.getOwnedPortfolio(portfolioId, userId);
        TradeTransaction tx = tradeTransactionRepository.findByIdAndPortfolioId(tradeId, portfolio.getId())
                .orElseThrow(() -> new NotFoundException("trade"));

        if (tx.getStatus() != TransactionStatus.PENDING) {
            log.warn("Sadece PENDING trade iptal edilebilir. tradeId={}, status={}", tradeId, tx.getStatus());
            throw new BadRequestException("Sadece PENDING durumdaki işlem iptal edilebilir");
        }

        tx.setStatus(TransactionStatus.CANCELLED);
        tx.setProcessedAt(Instant.now());
        refundReservedBuyBalanceIfNeeded(tx, portfolio);
        TradeTransaction saved = tradeTransactionRepository.save(tx);
        log.info("Trade CANCELLED. tradeId={}, userId={}", saved.getId(), userId);

        eventPublisher.publishEvent(TradeCancelledEvent.of(saved, portfolio.getUserId()));
    }

    private void refundReservedBuyBalanceIfNeeded(TradeTransaction tx, Portfolio portfolio) {
        if (tx.getTransactionType() != TransactionType.BUY || tx.getReservedAmount() == null) {
            return;
        }

        userBalanceService.adjustBalance(portfolio.getUserId(), tx.getReservedAmount());
        log.debug("PENDING BUY blokesi iade edildi. tradeId={}, userId={}, amount={}",
                tx.getId(), portfolio.getUserId(), tx.getReservedAmount());
    }
}
