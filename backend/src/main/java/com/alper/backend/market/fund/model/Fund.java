package com.alper.backend.market.fund.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "fund")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Fund {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 10)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(name = "fund_type", nullable = false, length = 10)
    private String fundType;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "fund", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<FundPrice> prices = new ArrayList<>();

    @OneToMany(mappedBy = "fund", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<FundAllocation> allocations = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}