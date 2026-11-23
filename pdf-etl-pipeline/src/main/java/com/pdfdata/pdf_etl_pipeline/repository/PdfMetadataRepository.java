package com.pdfdata.pdf_etl_pipeline.repository;

import com.pdfdata.pdf_etl_pipeline.dto.CategoryCountDto;
import com.pdfdata.pdf_etl_pipeline.model.PdfMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface PdfMetadataRepository extends JpaRepository<PdfMetadata, Long> {

    boolean existsByFileHash(String fileHash);

    Optional<PdfMetadata> findByFileHash(String fileHash);

    @Query("SELECT COALESCE(SUM(p.pageCount), 0L) FROM PdfMetadata p")
    Long sumTotalPages();

    @Query("SELECT COALESCE(SUM(p.wordCount), 0L) FROM PdfMetadata p")
    Long sumTotalWords();

    @Query("SELECT COALESCE(SUM(p.fileSizeBytes), 0L) FROM PdfMetadata p")
    Long sumTotalFileSizeBytes();

    @Query("SELECT COALESCE(AVG(p.pageCount), 0.0) FROM PdfMetadata p")
    Double avgPagesPerDocument();

    @Query("""
           SELECT new com.pdfdata.pdf_etl_pipeline.dto.CategoryCountDto(p.author, COUNT(p))
           FROM PdfMetadata p
           GROUP BY p.author
           ORDER BY COUNT(p) DESC
           """)
    List<CategoryCountDto> countDocumentsByAuthor();
}