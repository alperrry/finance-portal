package com.alper.backend.user.drawing.mapper;

import com.alper.backend.user.drawing.model.UserChartDrawing;
import com.alper.backend.user.drawing.dto.DrawingResponse;
import org.springframework.stereotype.Component;

/**
 * Kullanıcı grafik çizimi entity'lerini ({@link UserChartDrawing}) API yanıt
 * DTO'suna dönüştüren mapper.
 */
@Component
public class DrawingMapper {

    /**
     * Çizim entity'sini yanıt DTO'suna dönüştürür.
     *
     * @param entity çizim kaydı
     * @return oluşturulan yanıt DTO'su
     */
    public DrawingResponse toResponse(UserChartDrawing entity) {
        return DrawingResponse.builder()
                .id(entity.getId())
                .instrumentType(entity.getInstrumentType())
                .instrumentCode(entity.getInstrumentCode())
                .drawingType(entity.getDrawingType())
                .drawingData(entity.getDrawingData())
                .color(entity.getColor())
                .lineWidth(entity.getLineWidth())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}