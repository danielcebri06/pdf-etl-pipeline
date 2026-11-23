package com.pdfdata.pdf_etl_pipeline.service;

import com.pdfdata.pdf_etl_pipeline.dto.GoldStatsDto;
import com.pdfdata.pdf_etl_pipeline.repository.PdfMetadataRepository;
import com.pdfdata.pdf_etl_pipeline.repository.QuarantineRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GoldAnalyticsService {

    private final PdfMetadataRepository metadataRepository;
    private final QuarantineRecordRepository quarantineRepository;

    @Transactional(readOnly = true)
    public GoldStatsDto getPipelineStats() {
        long processed = metadataRepository.count();
        long quarantined = quarantineRepository.count();
        long totalAttempts = processed + quarantined;

        double successRate = totalAttempts == 0
                ? 0.0
                : Math.round(((double) processed / totalAttempts) * 10000.0) / 100.0;

        double avgPages = Math.round(metadataRepository.avgPagesPerDocument() * 100.0) / 100.0;

        return new GoldStatsDto(
                processed,
                quarantined,
                successRate,
                metadataRepository.sumTotalPages(),
                metadataRepository.sumTotalWords(),
                avgPages,
                metadataRepository.sumTotalFileSizeBytes(),
                metadataRepository.countDocumentsByAuthor(),
                quarantineRepository.countQuarantineByErrorType()
        );
    }
}