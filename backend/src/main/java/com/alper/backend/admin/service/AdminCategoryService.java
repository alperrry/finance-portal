package com.alper.backend.admin.service;

import com.alper.backend.admin.audit.AdminAudited;
import com.alper.backend.admin.dto.CategoryRequest;
import com.alper.backend.admin.dto.CategoryResponse;
import com.alper.backend.admin.model.AuditAction;
import com.alper.backend.common.exception.ConflictException;
import com.alper.backend.common.exception.ErrorCode;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.news.model.Category;
import com.alper.backend.news.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Log4j2
public class AdminCategoryService {

    private final CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public List<CategoryResponse> listCategories() {
        return categoryRepository.findAll().stream()
                .map(CategoryResponse::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public CategoryResponse getCategory(Long id) {
        return new CategoryResponse(resolveCategory(id));
    }

    @Transactional
    @CacheEvict(cacheNames = "activeCategories", allEntries = true)
    @AdminAudited(action = AuditAction.CATEGORY_CREATED, targetType = "category")
    public CategoryResponse createCategory(CategoryRequest request) {
        if (categoryRepository.existsByName(request.getName())) {
            throw new ConflictException(ErrorCode.CONFLICT, "Bu isimde kategori zaten mevcut: " + request.getName());
        }
        Category category = new Category();
        category.setName(request.getName());
        category.setActive(true);
        Category saved = categoryRepository.save(category);
        log.info("Kategori oluşturuldu | id={}, name={}", saved.getId(), saved.getName());
        return new CategoryResponse(saved);
    }

    @Transactional
    @CacheEvict(cacheNames = "activeCategories", allEntries = true)
    @AdminAudited(action = AuditAction.CATEGORY_UPDATED, targetType = "category")
    public CategoryResponse updateCategory(Long id, CategoryRequest request) {
        Category category = resolveCategory(id);

        if (request.getName() != null && !request.getName().equals(category.getName())) {
            if (categoryRepository.existsByName(request.getName())) {
                throw new ConflictException(ErrorCode.CONFLICT, "Bu isimde kategori zaten mevcut: " + request.getName());
            }
            category.setName(request.getName());
        }

        if (request.getIsActive() != null) {
            category.setActive(request.getIsActive());
        }

        Category saved = categoryRepository.save(category);
        log.info("Kategori güncellendi | id={}", saved.getId());
        return new CategoryResponse(saved);
    }

    @Transactional
    @CacheEvict(cacheNames = "activeCategories", allEntries = true)
    @AdminAudited(action = AuditAction.CATEGORY_DELETED, targetType = "category")
    public void deleteCategory(Long id) {
        Category category = resolveCategory(id);
        categoryRepository.delete(category);
        log.info("Kategori silindi | id={}", id);
    }

    private Category resolveCategory(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(ErrorCode.NOT_FOUND, "Kategori bulunamadı: " + id));
    }
}