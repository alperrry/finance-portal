package com.alper.backend.admin.service;

import com.alper.backend.admin.audit.AdminAudited;
import com.alper.backend.admin.dto.BackfillResponse;
import com.alper.backend.admin.model.AuditAction;
import com.alper.backend.market.bond.service.BondBackfillService;
import com.alper.backend.market.fund.service.TefasBackfillService;
import com.alper.backend.market.fx.service.TcmbBackfillService;
import com.alper.backend.market.stocks.service.YahooBackfillService;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
@RequiredArgsConstructor
@Log4j2
public class AdminMarketService {

    private final YahooBackfillService yahooBackfillService;
    private final TcmbBackfillService tcmbBackfillService;
    private final BondBackfillService bondBackfillService;
    private final TefasBackfillService tefasBackfillService;

    private final Map<String, AtomicBoolean> runningFlags = Map.of(
            "fx",     new AtomicBoolean(false),
            "stocks", new AtomicBoolean(false),
            "bonds",  new AtomicBoolean(false),
            "funds",  new AtomicBoolean(false)
    );

    @AdminAudited(action = AuditAction.BACKFILL_TRIGGERED, targetType = "market")
    public BackfillResponse triggerFxBackfill() {
        AtomicBoolean flag = runningFlags.get("fx");
        if (!flag.compareAndSet(false, true)) {
            log.warn("Backfill zaten çalışıyor: fx");
            return BackfillResponse.alreadyRunning("fx");
        }
        runFxAsync(flag);
        return BackfillResponse.triggered("fx");
    }

    @AdminAudited(action = AuditAction.BACKFILL_TRIGGERED, targetType = "market")
    public BackfillResponse triggerStocksBackfill() {
        AtomicBoolean flag = runningFlags.get("stocks");
        if (!flag.compareAndSet(false, true)) {
            log.warn("Backfill zaten çalışıyor: stocks");
            return BackfillResponse.alreadyRunning("stocks");
        }
        runStocksAsync(flag);
        return BackfillResponse.triggered("stocks");
    }

    @AdminAudited(action = AuditAction.BACKFILL_TRIGGERED, targetType = "market")
    public BackfillResponse triggerBondsBackfill() {
        AtomicBoolean flag = runningFlags.get("bonds");
        if (!flag.compareAndSet(false, true)) {
            log.warn("Backfill zaten çalışıyor: bonds");
            return BackfillResponse.alreadyRunning("bonds");
        }
        runBondsAsync(flag);
        return BackfillResponse.triggered("bonds");
    }

    @AdminAudited(action = AuditAction.BACKFILL_TRIGGERED, targetType = "market")
    public BackfillResponse triggerFundsBackfill() {
        AtomicBoolean flag = runningFlags.get("funds");
        if (!flag.compareAndSet(false, true)) {
            log.warn("Backfill zaten çalışıyor: funds");
            return BackfillResponse.alreadyRunning("funds");
        }
        runFundsAsync(flag);
        return BackfillResponse.triggered("funds");
    }

    @Async
    public void runFxAsync(AtomicBoolean flag) {
        try {
            log.info("Manuel backfill başladı: fx");
            tcmbBackfillService.backfillIfNeeded();
            log.info("Manuel backfill tamamlandı: fx");
        } catch (Exception e) {
            log.error("Manuel backfill hatası: fx → {}", e.getMessage(), e);
        } finally {
            flag.set(false);
        }
    }

    @Async
    public void runStocksAsync(AtomicBoolean flag) {
        try {
            log.info("Manuel backfill başladı: stocks");
            yahooBackfillService.backfillIfEmpty();
            log.info("Manuel backfill tamamlandı: stocks");
        } catch (Exception e) {
            log.error("Manuel backfill hatası: stocks → {}", e.getMessage(), e);
        } finally {
            flag.set(false);
        }
    }

    @Async
    public void runBondsAsync(AtomicBoolean flag) {
        try {
            log.info("Manuel backfill başladı: bonds");
            bondBackfillService.backfillIfEmpty();
            log.info("Manuel backfill tamamlandı: bonds");
        } catch (Exception e) {
            log.error("Manuel backfill hatası: bonds → {}", e.getMessage(), e);
        } finally {
            flag.set(false);
        }
    }

    @Async
    public void runFundsAsync(AtomicBoolean flag) {
        try {
            log.info("Manuel backfill başladı: funds");
            tefasBackfillService.backfillIfEmpty();
            log.info("Manuel backfill tamamlandı: funds");
        } catch (Exception e) {
            log.error("Manuel backfill hatası: funds → {}", e.getMessage(), e);
        } finally {
            flag.set(false);
        }
    }
}