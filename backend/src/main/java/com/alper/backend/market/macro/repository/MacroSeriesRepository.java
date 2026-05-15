package com.alper.backend.market.macro.repository;

import com.alper.backend.market.macro.model.MacroDataType;
import com.alper.backend.market.macro.model.MacroSeries;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MacroSeriesRepository extends JpaRepository<MacroSeries, Long> {
    List<MacroSeries> findByDataTypeAndIsActiveTrue(MacroDataType dataType);
}
