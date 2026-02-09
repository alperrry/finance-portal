package com.alper.backend.news.controller;

import com.alper.backend.news.dto.SourceRequest;
import com.alper.backend.news.dto.SourceResponse;
import com.alper.backend.news.model.Source;
import com.alper.backend.news.service.SourceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sources")
public class SourceController {

    private final SourceService sourceService;

    public SourceController(SourceService sourceService) {
        this.sourceService = sourceService;
    }

    @GetMapping
    public ResponseEntity<List<SourceResponse>> getAllSources(
            @RequestParam(required = false) Boolean activeOnly
    ) {
        List<Source> sources = sourceService.getAllSources(activeOnly);
        List<SourceResponse> response = sources.stream()
                .map(SourceResponse::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SourceResponse> getSourceById(@PathVariable Long id) {
        Source source = sourceService.getSourceById(id);
        return ResponseEntity.ok(new SourceResponse(source));
    }

    @PostMapping
    public ResponseEntity<SourceResponse> createSource(@Valid @RequestBody SourceRequest request) {
        Source source = sourceService.createSource(request.getName(), request.getSourceUrl());
        return ResponseEntity.status(HttpStatus.CREATED).body(new SourceResponse(source));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SourceResponse> updateSource(
            @PathVariable Long id,
            @Valid @RequestBody SourceRequest request
    ) {
        Source source = sourceService.updateSource(
                id,
                request.getName(),
                request.getSourceUrl(),
                request.getIsActive()
        );
        return ResponseEntity.ok(new SourceResponse(source));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSource(@PathVariable Long id) {
        sourceService.deleteSource(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<SourceResponse> deactivateSource(@PathVariable Long id) {
        sourceService.deactivateSource(id);
        Source source = sourceService.getSourceById(id);
        return ResponseEntity.ok(new SourceResponse(source));
    }
}
