package com.alper.backend.user.drawing.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UpdateDrawingRequest {

    // Hepsi opsiyonel — partial update
    private String drawingData;

    @Size(max = 20)
    private String color;

    @Min(1)
    @Max(10)
    private Integer lineWidth;
}