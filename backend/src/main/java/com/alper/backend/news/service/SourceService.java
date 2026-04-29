package com.alper.backend.news.service;

import com.alper.backend.common.exception.ConflictException;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.news.model.Source;
import com.alper.backend.news.repository.NewsRepository;
import com.alper.backend.news.repository.SourceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class SourceService {

    private final SourceRepository sourceRepository;
    private final NewsRepository newsRepository;

    public SourceService(SourceRepository sourceRepository,
                         NewsRepository newsRepository) {
        this.sourceRepository = sourceRepository;
        this.newsRepository = newsRepository;
    }

    public List<Source> getAllSources(Boolean activeOnly) {
        if (activeOnly != null && activeOnly) {
            return sourceRepository.findByIsActiveTrue();
        }
        return sourceRepository.findAll();
    }

    public Source getSourceById(Long id) {
        return sourceRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Source not found with id: " + id));
    }

    public Source createSource(String name, String sourceUrl) {
        if (sourceRepository.existsBySourceUrl(sourceUrl)) {
            throw new ConflictException("Source already exists with URL: " + sourceUrl);
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
                throw new ConflictException("Source already exists with URL: " + sourceUrl);
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
        long newsCount = newsRepository.countBySourceId(source.getId());
        if (newsCount > 0) {
            throw new ConflictException(
                "Source cannot be deleted because it is linked to " + newsCount
                    + " news record(s). Remove or reassign those news first."
            );
        }
        sourceRepository.delete(source);
    }

    public void deactivateSource(Long id) {
        Source source = getSourceById(id);
        source.setActive(false);
        sourceRepository.save(source);
    }
}
