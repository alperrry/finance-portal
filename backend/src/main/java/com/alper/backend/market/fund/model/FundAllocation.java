package com.alper.backend.market.fund.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Fonun portföy dağılımını; varlık sınıfı ve yüzde ağırlığıyla tutar.
 */
@Entity
@Table(name = "fund_allocation")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FundAllocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fund_id", nullable = false)
    private Fund fund;

    @Column(name = "allocation_date", nullable = false)
    private LocalDate allocationDate;

    // Hisse & Borçlanma
    @Column(precision = 8, scale = 4)
    private BigDecimal hs;           // Hisse Senedi %

    @Column(precision = 8, scale = 4)
    private BigDecimal yhs;          // Yabancı Hisse Senedi %

    @Column(precision = 8, scale = 4)
    private BigDecimal kb;           // Kamu İç Borçlanma %

    @Column(precision = 8, scale = 4)
    private BigDecimal ob;           // Özel Sektör Borçlanma %

    @Column(precision = 8, scale = 4)
    private BigDecimal ykb;          // Yabancı Kamu Borçlanma %

    @Column(precision = 8, scale = 4)
    private BigDecimal yob;          // Yabancı Özel Borçlanma %

    // Para Piyasası & Mevduat
    @Column(precision = 8, scale = 4)
    private BigDecimal tpp;          // Takasbank Para Piyasası %

    @Column(precision = 8, scale = 4)
    private BigDecimal vdm;          // Vadeli Mevduat %

    @Column(precision = 8, scale = 4)
    private BigDecimal vm;           // Vadesiz Mevduat %

    @Column(precision = 8, scale = 4)
    private BigDecimal r;            // Repo %

    @Column(precision = 8, scale = 4)
    private BigDecimal t;            // Ters Repo %

    // Döviz & Emtia
    @Column(precision = 8, scale = 4)
    private BigDecimal d;            // Döviz %

    @Column(precision = 8, scale = 4)
    private BigDecimal gas;          // Altın/Gümüş/Emtia %

    // Diğer
    @Column(precision = 8, scale = 4)
    private BigDecimal byf;          // Borsa Yatırım Fonu %

    @Column(name = "vint", precision = 8, scale = 4)
    private BigDecimal vint;         // Yabancı Menkul Kıymet %

    @Column(precision = 8, scale = 4)
    private BigDecimal diger;        // Diğer %

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}