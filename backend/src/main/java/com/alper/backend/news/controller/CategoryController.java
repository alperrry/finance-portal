package com.alper.backend.news.controller;

import com.alper.backend.news.dto.CategoryRequest;
import com.alper.backend.news.dto.CategoryResponse;
import com.alper.backend.news.model.Category;
import com.alper.backend.news.service.CategoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    public ResponseEntity<List<CategoryResponse>> getAllCategories(
            @RequestParam(required = false) Boolean activeOnly
    ) {
        List<Category> categories = categoryService.getAllCategories(activeOnly);
        List<CategoryResponse> response = categories.stream()
                .map(CategoryResponse::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CategoryResponse> getCategoryById(@PathVariable Long id) {
        Category category = categoryService.getCategoryById(id);
        return ResponseEntity.ok(new CategoryResponse(category));
    }

    @PostMapping
    public ResponseEntity<CategoryResponse> createCategory(@Valid @RequestBody CategoryRequest request) {
        Category category = categoryService.createCategory(request.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(new CategoryResponse(category));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoryResponse> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody CategoryRequest request
    ) {
        Category category = categoryService.updateCategory(id, request.getName(), request.getIsActive());
        return ResponseEntity.ok(new CategoryResponse(category));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<CategoryResponse> deactivateCategory(@PathVariable Long id) {
        categoryService.deactivateCategory(id);
        Category category = categoryService.getCategoryById(id);
        return ResponseEntity.ok(new CategoryResponse(category));
    }
}
