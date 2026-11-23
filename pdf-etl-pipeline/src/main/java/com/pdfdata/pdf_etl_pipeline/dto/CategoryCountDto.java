package com.pdfdata.pdf_etl_pipeline.dto;

public record CategoryCountDto(
        String label,
        Long count
) {}