package com.alper.backend.user.drawing.service;

import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.user.drawing.model.UserChartDrawing;
import com.alper.backend.user.model.User;
import com.alper.backend.user.drawing.repository.UserChartDrawingRepository;
import com.alper.backend.user.drawing.dto.CreateDrawingRequest;
import com.alper.backend.user.drawing.dto.DrawingResponse;
import com.alper.backend.user.drawing.dto.UpdateDrawingRequest;
import com.alper.backend.user.drawing.mapper.DrawingMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Kullanıcının grafik üzerine çizdiği objelerin (trend çizgisi, fibonacci, vb.) iş katmanı.
 *
 * <p>Enstrüman bazlı listeleme, ekleme, güncelleme (kısmi), silme ve toplu temizleme
 * işlemlerini sağlar; tüm sorgular kullanıcının kendi çizimleriyle sınırlandırılır.</p>
 */
@Service
@Log4j2
@RequiredArgsConstructor
public class DrawingService {

    private final UserChartDrawingRepository drawingRepository;
    private final DrawingMapper drawingMapper;

    /**
     * Kullanıcının belirli enstrümandaki çizimlerini getirir.
     */
    @Transactional(readOnly = true)
    public List<DrawingResponse> listByInstrument(User user, InstrumentType instrumentType, String instrumentCode) {
        List<UserChartDrawing> drawings = drawingRepository
                .findByUserIdAndInstrumentTypeAndInstrumentCodeOrderByCreatedAtAsc(
                        user.getId(), instrumentType, instrumentCode);

        log.debug("Çizimler listelendi | userId={} | {} {} | adet={}",
                user.getId(), instrumentType, instrumentCode, drawings.size());

        return drawings.stream().map(drawingMapper::toResponse).toList();
    }

    /**
     * Yeni çizim oluşturur.
     */
    @Transactional
    public DrawingResponse create(User user, CreateDrawingRequest request) {
        UserChartDrawing drawing = UserChartDrawing.builder()
                .user(user)
                .instrumentType(request.getInstrumentType())
                .instrumentCode(request.getInstrumentCode())
                .drawingType(request.getDrawingType())
                .drawingData(request.getDrawingData())
                .color(request.getColor())
                .lineWidth(request.getLineWidth())
                .build();

        UserChartDrawing saved = drawingRepository.save(drawing);

        log.info("Yeni çizim oluşturuldu | userId={} | drawingId={} | type={} | {} {}",
                user.getId(), saved.getId(), saved.getDrawingType(),
                saved.getInstrumentType(), saved.getInstrumentCode());

        return drawingMapper.toResponse(saved);
    }

    /**
     * Mevcut çizimi günceller. Sadece sahibi güncelleyebilir.
     * Gönderilmeyen alanlar değiştirilmez (partial update).
     */
    @Transactional
    public DrawingResponse update(User user, Long drawingId, UpdateDrawingRequest request) {
        UserChartDrawing drawing = drawingRepository
                .findByIdAndUserId(drawingId, user.getId())
                .orElseThrow(() -> {
                    log.warn("Çizim bulunamadı veya erişim yetkisi yok | userId={} | drawingId={}",
                            user.getId(), drawingId);
                    return new NotFoundException("Çizim bulunamadı: " + drawingId);
                });

        if (request.getDrawingData() != null) {
            drawing.setDrawingData(request.getDrawingData());
        }
        if (request.getColor() != null) {
            drawing.setColor(request.getColor());
        }
        if (request.getLineWidth() != null) {
            drawing.setLineWidth(request.getLineWidth());
        }

        UserChartDrawing saved = drawingRepository.save(drawing);

        log.info("Çizim güncellendi | userId={} | drawingId={}", user.getId(), drawingId);

        return drawingMapper.toResponse(saved);
    }

    /**
     * Tek çizimi siler. Sadece sahibi silebilir.
     */
    @Transactional
    public void delete(User user, Long drawingId) {
        UserChartDrawing drawing = drawingRepository
                .findByIdAndUserId(drawingId, user.getId())
                .orElseThrow(() -> {
                    log.warn("Silinecek çizim bulunamadı | userId={} | drawingId={}",
                            user.getId(), drawingId);
                    return new NotFoundException("Çizim bulunamadı: " + drawingId);
                });

        drawingRepository.delete(drawing);

        log.info("Çizim silindi | userId={} | drawingId={}", user.getId(), drawingId);
    }

    /**
     * Kullanıcının belirli enstrümandaki tüm çizimlerini siler.
     * "Tümünü Temizle" butonu için.
     */
    @Transactional
    public int clearAllForInstrument(User user, InstrumentType instrumentType, String instrumentCode) {
        int deleted = drawingRepository.deleteAllByUserAndInstrument(
                user.getId(), instrumentType, instrumentCode);

        log.info("Tüm çizimler silindi | userId={} | {} {} | silinen={}",
                user.getId(), instrumentType, instrumentCode, deleted);

        return deleted;
    }
}