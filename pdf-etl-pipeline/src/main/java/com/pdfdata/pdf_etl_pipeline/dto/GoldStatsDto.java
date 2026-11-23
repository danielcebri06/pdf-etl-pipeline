package com.pdfdata.pdf_etl_pipeline.dto;

import java.util.List;

public record GoldStatsDto(
        long totalProcessed,
        long totalQuarantined,
        double successRatePercent,
        long totalPages,
        long totalWords,
        double avgPagesPerDocument,
        long totalSizeBytes,
        List<CategoryCountDto> documentsByAuthor,
        List<CategoryCountDto> quarantineByErrorType
) {}