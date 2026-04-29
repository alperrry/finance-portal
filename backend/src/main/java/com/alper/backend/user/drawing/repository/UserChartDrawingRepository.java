package com.alper.backend.user.drawing.repository;

import com.alper.backend.common.model.InstrumentType;
import com.alper.backend.user.drawing.model.UserChartDrawing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserChartDrawingRepository extends JpaRepository<UserChartDrawing, Long> {

    /**
     * Kullanıcının belirli bir enstrümandaki tüm çizimlerini getirir.
     * Ana listeleme sorgusu — GET /api/v1/drawings.
     */
    List<UserChartDrawing> findByUserIdAndInstrumentTypeAndInstrumentCodeOrderByCreatedAtAsc(
            Long userId,
            InstrumentType instrumentType,
            String instrumentCode
    );

    /**
     * ID + userId birlikte — kullanıcı sadece kendi çizimine erişebilsin.
     * PUT ve DELETE endpoint'lerinde kullanılır.
     */
    Optional<UserChartDrawing> findByIdAndUserId(Long id, Long userId);

    /**
     * Kullanıcının belirli enstrümandaki tüm çizimlerini toplu siler.
     * "Tümünü Temizle" butonu için — DELETE /api/v1/drawings?...
     */
    @Modifying
    @Query("DELETE FROM UserChartDrawing d " +
            "WHERE d.user.id = :userId " +
            "AND d.instrumentType = :instrumentType " +
            "AND d.instrumentCode = :instrumentCode")
    int deleteAllByUserAndInstrument(
            @Param("userId") Long userId,
            @Param("instrumentType") InstrumentType instrumentType,
            @Param("instrumentCode") String instrumentCode
    );
}