package com.pdfdata.pdf_etl_pipeline.repository;

import com.pdfdata.pdf_etl_pipeline.dto.CategoryCountDto;
import com.pdfdata.pdf_etl_pipeline.model.QuarantineRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface QuarantineRecordRepository extends JpaRepository<QuarantineRecord, Long> {

    @Query("""
           SELECT new com.pdfdata.pdf_etl_pipeline.dto.CategoryCountDto(q.errorType, COUNT(q))
           FROM QuarantineRecord q
           GROUP BY q.errorType
           ORDER BY COUNT(q) DESC
           """)
    List<CategoryCountDto> countQuarantineByErrorType();
}