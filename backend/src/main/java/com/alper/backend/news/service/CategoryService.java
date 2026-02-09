package com.alper.backend.news.service;

import com.alper.backend.news.model.Category;
import com.alper.backend.news.repository.CategoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public List<Category> getAllCategories(Boolean activeOnly) {
        if (activeOnly != null && activeOnly) {
            return categoryRepository.findByIsActiveTrue();
        }
        return categoryRepository.findAll();
    }

    public Category getCategoryById(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found with id: " + id));
    }

    public Category createCategory(String name) {
        if (categoryRepository.existsByName(name)) {
            throw new RuntimeException("Category already exists with name: " + name);
        }

        Category category = new Category();
        category.setName(name);
        category.setActive(true);
        return categoryRepository.save(category);
    }

    public Category updateCategory(Long id, String name, Boolean isActive) {
        Category category = getCategoryById(id);

        if (name != null && !name.equals(category.getName())) {
            if (categoryRepository.existsByName(name)) {
                throw new RuntimeException("Category already exists with name: " + name);
            }
            category.setName(name);
        }

        if (isActive != null) {
            category.setActive(isActive);
        }

        return categoryRepository.save(category);
    }

    public void deleteCategory(Long id) {
        Category category = getCategoryById(id);
        categoryRepository.delete(category);
    }

    public void deactivateCategory(Long id) {
        Category category = getCategoryById(id);
        category.setActive(false);
        categoryRepository.save(category);
    }
}
