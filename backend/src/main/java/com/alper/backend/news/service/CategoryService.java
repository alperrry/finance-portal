package com.alper.backend.news.service;

import com.alper.backend.common.exception.ConflictException;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.news.model.Category;
import com.alper.backend.news.repository.CategoryRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public List<Category> getAllCategories(Boolean activeOnly) {
        if (activeOnly != null && activeOnly) {
            return getActiveCategoriesCached();
        }
        return categoryRepository.findAll();
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "activeCategories", key = "'all'")
    public List<CategorySnapshot> getActiveCategorySnapshotsCached() {
        return categoryRepository.findByIsActiveTrue().stream()
            .map(category -> new CategorySnapshot(category.getId(), category.getName()))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<Category> getActiveCategoriesCached() {
        List<CategorySnapshot> snapshots = getActiveCategorySnapshotsCached();
        if (snapshots.isEmpty()) {
            return List.of();
        }

        List<Long> idsInOrder = snapshots.stream()
            .map(CategorySnapshot::id)
            .toList();
        Map<Long, Category> categoriesById = new LinkedHashMap<>();
        for (Category category : categoryRepository.findAllById(idsInOrder)) {
            categoriesById.put(category.getId(), category);
        }

        List<Category> orderedCategories = new ArrayList<>();
        for (Long id : idsInOrder) {
            Category category = categoriesById.get(id);
            if (category != null) {
                orderedCategories.add(category);
            }
        }
        return orderedCategories;
    }

    public Category getCategoryById(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Category not found with id: " + id));
    }

    @CacheEvict(cacheNames = "activeCategories", allEntries = true)
    public Category createCategory(String name) {
        if (categoryRepository.existsByName(name)) {
            throw new ConflictException("Category already exists with name: " + name);
        }

        Category category = new Category();
        category.setName(name);
        category.setActive(true);
        return categoryRepository.save(category);
    }

    @CacheEvict(cacheNames = "activeCategories", allEntries = true)
    public Category updateCategory(Long id, String name, Boolean isActive) {
        Category category = getCategoryById(id);

        if (name != null && !name.equals(category.getName())) {
            if (categoryRepository.existsByName(name)) {
                throw new ConflictException("Category already exists with name: " + name);
            }
            category.setName(name);
        }

        if (isActive != null) {
            category.setActive(isActive);
        }

        return categoryRepository.save(category);
    }

    @CacheEvict(cacheNames = "activeCategories", allEntries = true)
    public void deleteCategory(Long id) {
        Category category = getCategoryById(id);
        categoryRepository.delete(category);
    }

    @CacheEvict(cacheNames = "activeCategories", allEntries = true)
    public void deactivateCategory(Long id) {
        Category category = getCategoryById(id);
        category.setActive(false);
        categoryRepository.save(category);
    }

    public record CategorySnapshot(Long id, String name) implements Serializable {}
}
