package com.alper.backend.news.repository;

import com.alper.backend.news.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByIsActiveTrue();
    Optional<Category> findByName(String name);
    boolean existsByName(String name);
}
