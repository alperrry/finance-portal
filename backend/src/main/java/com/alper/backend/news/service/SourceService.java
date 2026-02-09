package com.alper.backend.news.service;

import com.alper.backend.news.model.Source;
import com.alper.backend.news.repository.SourceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class SourceService {

    private final SourceRepository sourceRepository;

    public SourceService(SourceRepository sourceRepository) {
        this.sourceRepository = sourceRepository;
    }

    public List<Source> getAllSources(Boolean activeOnly) {
        if (activeOnly != null && activeOnly) {
            return sourceRepository.findByIsActiveTrue();
        }
        return sourceRepository.findAll();
    }

    public Source getSourceById(Long id) {
        return sourceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Source not found with id: " + id));
    }

    public Source createSource(String name, String sourceUrl) {
        if (sourceRepository.existsBySourceUrl(sourceUrl)) {
            throw new RuntimeException("Source already exists with URL: " + sourceUrl);
        }

        Source source = new Source();
        source.setName(name);
        source.setSourceUrl(sourceUrl);
        source.setActive(true);
        return sourceRepository.save(source);
    }

    public Source updateSource(Long id, String name, String sourceUrl, Boolean isActive) {
        Source source = getSourceById(id);

        if (name != null) {
            source.setName(name);
        }

        if (sourceUrl != null && !sourceUrl.equals(source.getSourceUrl())) {
            if (sourceRepository.existsBySourceUrl(sourceUrl)) {
                throw new RuntimeException("Source already exists with URL: " + sourceUrl);
            }
            source.setSourceUrl(sourceUrl);
        }

        if (isActive != null) {
            source.setActive(isActive);
        }

        return sourceRepository.save(source);
    }

    public void deleteSource(Long id) {
        Source source = getSourceById(id);
        sourceRepository.delete(source);
    }

    public void deactivateSource(Long id) {
        Source source = getSourceById(id);
        source.setActive(false);
        sourceRepository.save(source);
    }
}
