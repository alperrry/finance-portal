package com.alper.backend.user.drawing.mapper;

import com.alper.backend.user.drawing.model.UserChartDrawing;
import com.alper.backend.user.drawing.dto.DrawingResponse;
import org.springframework.stereotype.Component;

@Component
public class DrawingMapper {

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