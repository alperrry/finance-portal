package com.alper.backend.news.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "categories")
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;

    // News tarafında JoinTable var; burası mappedBy
    @ManyToMany(mappedBy = "categories")
    private Set<News> news = new HashSet<>();

    public Category() {}

    public Long getId() { return id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }

    public Set<News> getNews() { return news; }
}
