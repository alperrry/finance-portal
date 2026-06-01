package com.alper.backend.user.drawing.dto;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.user.drawing.model.DrawingType;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Grafik çizim verilerini API yanıtı olarak döndürür.
 */
@Getter
@Builder
public class DrawingResponse {

    private Long id;
    private InstrumentType instrumentType;
    private String instrumentCode;
    private DrawingType drawingType;
    private String drawingData;   // JSON string olarak döner, frontend parse eder
    private String color;
    private Integer lineWidth;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}