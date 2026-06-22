package com.alper.backend.market.macro.repository;

import com.alper.backend.market.macro.model.MacroDataType;
import com.alper.backend.market.macro.model.MacroObservation;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * MacroObservation varlığı için CRUD ve tarih/seri bazlı gözlem sorguları.
 */
public interface MacroObservationRepository extends JpaRepository<MacroObservation, Long> {
    boolean existsBySeriesIdAndObservationDate(Long seriesId, LocalDate observationDate);

    Optional<MacroObservation> findFirstBySeriesIdOrderByObservationDateDesc(Long seriesId);

    // Dashboard veri tazeliği — tüm modülde en son gözlem günü
    Optional<MacroObservation> findTopByOrderByObservationDateDesc();

    @EntityGraph(attributePaths = "series")
    List<MacroObservation> findBySeries_DataTypeAndObservationDateBetweenOrderBySeries_DisplayNameAscObservationDateAsc(
            MacroDataType dataType, LocalDate from, LocalDate to);

    @EntityGraph(attributePaths = "series")
    @Query("""
            SELECT o FROM MacroObservation o
            WHERE o.series.dataType = :dataType
              AND o.series.isActive = true
              AND o.observationDate = (
                SELECT MAX(o2.observationDate) FROM MacroObservation o2
                WHERE o2.series.id = o.series.id
              )
            ORDER BY o.series.displayName ASC
            """)
    List<MacroObservation> findLatestByActiveSeriesDataType(MacroDataType dataType);

    List<MacroObservation> findBySeries_SeriesCodeAndObservationDateBetweenOrderByObservationDateAsc(
            String seriesCode, LocalDate from, LocalDate to);
    // INFLATION veya DEPOSIT_RATE gibi tipe göre filtreleyip,
// tarihten geriye doğru en yakın kaydı getiren metot
    Optional<MacroObservation> findFirstBySeries_DataTypeAndObservationDateLessThanEqualOrderByObservationDateDesc(
            MacroDataType dataType,
            LocalDate observationDate
    );
}
