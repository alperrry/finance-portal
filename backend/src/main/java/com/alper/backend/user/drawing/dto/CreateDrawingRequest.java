package com.alper.backend.user.drawing.dto;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.user.drawing.model.DrawingType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Yeni grafik çizimi oluşturma isteğini; tip ve koordinat verilerini taşır.
 */
@Getter
@Setter
@NoArgsConstructor
public class CreateDrawingRequest {

    @NotNull(message = "Enstrüman tipi zorunludur")
    private InstrumentType instrumentType;

    @NotBlank(message = "Enstrüman kodu boş bırakılamaz")
    @Size(max = 50)
    private String instrumentCode;

    @NotNull(message = "Çizim tipi zorunludur")
    private DrawingType drawingType;

    @NotBlank(message = "Çizim verisi boş bırakılamaz")
    private String drawingData;   // JSON string, backend parse etmez, aynen saklar

    @Size(max = 20)
    private String color;         // opsiyonel

    @Min(1)
    @Max(10)
    private Integer lineWidth;    // opsiyonel
}