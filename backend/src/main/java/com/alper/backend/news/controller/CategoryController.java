package com.alper.backend.news.controller;

import com.alper.backend.news.dto.CategoryResponse;
import com.alper.backend.news.service.CategoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Haber kategorilerini listeleyen kamuya açık uç nokta.
 *
 * <p>Read-only; veriyi {@link CategoryService} üzerinden döner. Yönetim için
 * {@code AdminCategoryController} kullanılır.</p>
 */
@RestController
@RequestMapping("/api/v1/categories")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    public ResponseEntity<List<CategoryResponse>> listCategories(
            @RequestParam(defaultValue = "true") boolean activeOnly
    ) {
        List<CategoryResponse> categories = categoryService.getAllCategories(activeOnly).stream()
                .map(CategoryResponse::new)
                .toList();
        return ResponseEntity.ok(categories);
    }
}
