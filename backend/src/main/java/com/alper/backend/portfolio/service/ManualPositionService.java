package com.alper.backend.portfolio.service;

import com.alper.backend.common.exception.BadRequestException;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.portfolio.dto.ClosePositionRequest;
import com.alper.backend.portfolio.dto.ManualPositionRequest;
import com.alper.backend.portfolio.dto.ManualPositionResponse;
import com.alper.backend.portfolio.model.ManualPosition;
import com.alper.backend.portfolio.model.PositionDirection;
import com.alper.backend.portfolio.model.PositionKind;
import com.alper.backend.portfolio.pnl.PnlCalculatorRegistry;
import com.alper.backend.portfolio.repository.ManualPositionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Manuel pozisyon CRUD ve kapama (close) iş mantığı.
 *
 * <p>Kullanıcının portföyüne pozisyon ekler, listeler/sayfalar, günceller, siler ve
 * close akışında {@link PnlCalculatorRegistry} ile gerçekleşen P/L'yi hesaplar.</p>
 */
@Service
@RequiredArgsConstructor
@Log4j2
public class ManualPositionService {

    private final ManualPositionRepository repository;
    private final PortfolioService portfolioService;
    private final InstrumentPriceResolverService priceResolver;
    private final PnlCalculatorRegistry pnlRegistry;
    private final ManualPositionValuator valuator;

    @Transactional
    @CacheEvict(value = "portfolioValuation", key = "#portfolioId")
    public ManualPositionResponse create(Long portfolioId, Long userId, ManualPositionRequest request) {
        portfolioService.getOwnedPortfolio(portfolioId, userId);

        // Validation
        if (request.positionKind() == PositionKind.CLOSED) {
            if (request.exitPrice() == null || request.exitDate() == null) {
                throw new BadRequestException("Geçmiş pozisyon için satış fiyatı ve satım tarihi zorunludur");
            }
            if (request.exitDate().isBefore(request.entryDate())) {
                throw new BadRequestException("Satım tarihi alım tarihinden önce olamaz");
            }
        }

        // Snapshot instrument info
        var info = priceResolver.resolve(request.instrumentType(), request.instrumentId());

        // User-provided symbol/name (manual entry) takes precedence over resolver
        String symbol = request.instrumentSymbol() != null ? request.instrumentSymbol() : info.symbol();
        String name   = request.instrumentName()   != null ? request.instrumentName()   : info.name();

        PositionDirection direction = request.direction() != null ? request.direction() : PositionDirection.LONG;

        ManualPosition position = ManualPosition.builder()
                .portfolioId(portfolioId)
                .instrumentType(request.instrumentType())
                .positionKind(request.positionKind())
                .instrumentId(request.instrumentId())
                .instrumentSymbol(symbol)
                .instrumentName(name)
                .direction(direction)
                .quantity(request.quantity())
                .entryPrice(request.entryPrice())
                .entryDate(request.entryDate())
                .exitPrice(request.exitPrice())
                .exitDate(request.exitDate())
                .contractMultiplier(request.contractMultiplier())
                .maturityDate(request.maturityDate())
                .marginAmount(request.marginAmount())
                .underlyingSymbol(request.underlyingSymbol() != null ? request.underlyingSymbol() : info.symbol())
                .interestRate(request.interestRate())
                .bankName(request.bankName())
                .notes(request.notes())
                .build();

        // Calculate realized PnL for CLOSED positions
        if (request.positionKind() == PositionKind.CLOSED) {
            BigDecimal pnl = pnlRegistry.get(request.instrumentType()).calculate(position, request.exitPrice());
            position.setRealizedPnl(pnl);
        }

        ManualPosition saved = repository.save(position);
        log.info("Manuel pozisyon oluşturuldu. positionId={}, portfolioId={}, type={}, kind={}",
                saved.getId(), portfolioId, request.instrumentType(), request.positionKind());

        return toResponse(saved, null, null);
    }

    @Transactional(readOnly = true)
    public Page<ManualPositionResponse> list(Long portfolioId, Long userId, PositionKind kind, Pageable pageable) {
        portfolioService.verifyPortfolioBelongsToUser(portfolioId, userId);

        Page<ManualPosition> page = repository.findAllByPortfolioIdAndPositionKind(portfolioId, kind, pageable);

        return page.map(pos -> {
            var valuation = valuator.valuateOpen(pos);
            return toResponse(pos, valuation.currentPrice(), valuation.unrealizedPnl());
        });
    }

    @Transactional(readOnly = true)
    public ManualPositionResponse getById(Long portfolioId, Long userId, Long positionId) {
        portfolioService.verifyPortfolioBelongsToUser(portfolioId, userId);
        ManualPosition pos = repository.findByIdAndPortfolioId(positionId, portfolioId)
                .orElseThrow(() -> new NotFoundException("position"));

        var valuation = valuator.valuateOpen(pos);
        return toResponse(pos, valuation.currentPrice(), valuation.unrealizedPnl());
    }

    @Transactional
    @CacheEvict(value = "portfolioValuation", key = "#portfolioId")
    public List<ManualPositionResponse> closePosition(Long portfolioId, Long userId, Long positionId, ClosePositionRequest req) {
        portfolioService.getOwnedPortfolio(portfolioId, userId);
        ManualPosition pos = repository.findByIdAndPortfolioId(positionId, portfolioId)
                .orElseThrow(() -> new NotFoundException("position"));

        if (pos.getPositionKind() != PositionKind.OPEN) {
            throw new BadRequestException("Sadece açık pozisyonlar kapatılabilir");
        }
        if (req.quantity().compareTo(pos.getQuantity()) > 0) {
            throw new BadRequestException("Satış miktarı pozisyon miktarından fazla olamaz");
        }
        if (req.exitDate().isBefore(pos.getEntryDate())) {
            throw new BadRequestException("Satış tarihi alış tarihinden önce olamaz");
        }

        repository.delete(pos);

        ManualPosition closed = ManualPosition.builder()
                .portfolioId(pos.getPortfolioId())
                .instrumentType(pos.getInstrumentType())
                .positionKind(PositionKind.CLOSED)
                .instrumentId(pos.getInstrumentId())
                .instrumentSymbol(pos.getInstrumentSymbol())
                .instrumentName(pos.getInstrumentName())
                .direction(pos.getDirection())
                .quantity(req.quantity())
                .entryPrice(pos.getEntryPrice())
                .entryDate(pos.getEntryDate())
                .exitPrice(req.exitPrice())
                .exitDate(req.exitDate())
                .contractMultiplier(pos.getContractMultiplier())
                .maturityDate(pos.getMaturityDate())
                .marginAmount(pos.getMarginAmount())
                .underlyingSymbol(pos.getUnderlyingSymbol())
                .interestRate(pos.getInterestRate())
                .bankName(pos.getBankName())
                .notes(pos.getNotes())
                .build();
        BigDecimal pnl = pnlRegistry.get(pos.getInstrumentType()).calculate(closed, req.exitPrice());
        closed.setRealizedPnl(pnl);
        ManualPosition savedClosed = repository.save(closed);

        List<ManualPositionResponse> results = new ArrayList<>();
        results.add(toResponse(savedClosed, null, null));

        BigDecimal remaining = pos.getQuantity().subtract(req.quantity());
        if (remaining.compareTo(BigDecimal.ZERO) > 0) {
            ManualPosition open = ManualPosition.builder()
                    .portfolioId(pos.getPortfolioId())
                    .instrumentType(pos.getInstrumentType())
                    .positionKind(PositionKind.OPEN)
                    .instrumentId(pos.getInstrumentId())
                    .instrumentSymbol(pos.getInstrumentSymbol())
                    .instrumentName(pos.getInstrumentName())
                    .direction(pos.getDirection())
                    .quantity(remaining)
                    .entryPrice(pos.getEntryPrice())
                    .entryDate(pos.getEntryDate())
                    .contractMultiplier(pos.getContractMultiplier())
                    .maturityDate(pos.getMaturityDate())
                    .marginAmount(pos.getMarginAmount())
                    .underlyingSymbol(pos.getUnderlyingSymbol())
                    .interestRate(pos.getInterestRate())
                    .bankName(pos.getBankName())
                    .notes(pos.getNotes())
                    .build();
            results.add(toResponse(repository.save(open), null, null));
        }

        log.info("Pozisyon kapatıldı. originalId={}, portfolioId={}, soldQty={}, remainingQty={}",
                positionId, portfolioId, req.quantity(), remaining);
        return results;
    }

    @Transactional
    @CacheEvict(value = "portfolioValuation", key = "#portfolioId")
    public void delete(Long portfolioId, Long userId, Long positionId) {
        portfolioService.getOwnedPortfolio(portfolioId, userId);
        ManualPosition pos = repository.findByIdAndPortfolioId(positionId, portfolioId)
                .orElseThrow(() -> new NotFoundException("position"));
        repository.delete(pos);
        log.info("Manuel pozisyon silindi. positionId={}, portfolioId={}, userId={}", positionId, portfolioId, userId);
    }

    private ManualPositionResponse toResponse(ManualPosition pos, BigDecimal currentPrice, BigDecimal unrealizedPnl) {
        BigDecimal pnlPercent = null;
        BigDecimal pnl = pos.getPositionKind() == PositionKind.CLOSED ? pos.getRealizedPnl() : unrealizedPnl;
        BigDecimal costBasis = pos.getEntryPrice().multiply(pos.getQuantity());
        BigDecimal multiplier = pos.getContractMultiplier() != null ? pos.getContractMultiplier() : BigDecimal.ONE;
        BigDecimal currentValue = currentPrice != null
                ? currentPrice.multiply(pos.getQuantity()).multiply(multiplier).setScale(2, RoundingMode.HALF_UP)
                : null;
        if (pnl != null && costBasis != null && costBasis.compareTo(BigDecimal.ZERO) != 0) {
            pnlPercent = pnl.multiply(BigDecimal.valueOf(100))
                    .divide(costBasis, 2, RoundingMode.HALF_UP);
        }

        return new ManualPositionResponse(
                pos.getId(), pos.getPortfolioId(), pos.getInstrumentType(), pos.getPositionKind(),
                pos.getInstrumentId(), pos.getInstrumentSymbol(), pos.getInstrumentName(),
                pos.getDirection(), pos.getQuantity(), pos.getEntryPrice(), pos.getEntryDate(),
                pos.getExitPrice(), pos.getExitDate(), pos.getContractMultiplier(), pos.getMaturityDate(),
                pos.getMarginAmount(), pos.getUnderlyingSymbol(), pos.getInterestRate(), pos.getBankName(),
                pos.getRealizedPnl(), unrealizedPnl, currentPrice, currentValue, pnlPercent,
                pos.getNotes(), pos.getCreatedAt()
        );
    }
}
