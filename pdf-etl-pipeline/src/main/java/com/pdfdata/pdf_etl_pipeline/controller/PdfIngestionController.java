package com.pdfdata.pdf_etl_pipeline.controller;

import com.pdfdata.pdf_etl_pipeline.dto.GoldStatsDto;
import com.pdfdata.pdf_etl_pipeline.model.PdfMetadata;
import com.pdfdata.pdf_etl_pipeline.model.QuarantineRecord;
import com.pdfdata.pdf_etl_pipeline.repository.PdfMetadataRepository;
import com.pdfdata.pdf_etl_pipeline.repository.QuarantineRecordRepository;
import com.pdfdata.pdf_etl_pipeline.service.GoldAnalyticsService;
import com.pdfdata.pdf_etl_pipeline.service.PdfEtlService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping(value = "/api/v1/pdfs", produces = MediaType.APPLICATION_JSON_VALUE)
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class PdfIngestionController {

    private final PdfEtlService pdfEtlService;
    private final GoldAnalyticsService goldAnalyticsService;
    private final PdfMetadataRepository metadataRepository;
    private final QuarantineRecordRepository quarantineRepository;

    @PostMapping(value = "/ingest", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public List<?> ingestPdfs(@RequestParam("files") MultipartFile[] files) {
        return Arrays.stream(files)
                .map(pdfEtlService::processFile)
                .toList();
    }

    @GetMapping
    public List<PdfMetadata> getAllMetadata() {
        return metadataRepository.findAll();
    }

    @GetMapping(value = "/{id}/xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> getXmlById(@PathVariable Long id) {
        return metadataRepository.findById(id)
                .map(doc -> ResponseEntity.ok()
                        .contentType(MediaType.APPLICATION_XML)
                        .body(doc.getXmlContent()))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/quarantine")
    public List<QuarantineRecord> getQuarantineRecords() {
        return quarantineRepository.findAll();
    }

    // Capa Oro: métricas analíticas agregadas en PostgreSQL
    @GetMapping("/stats")
    public GoldStatsDto getGoldStats() {
        return goldAnalyticsService.getPipelineStats();
    }
}