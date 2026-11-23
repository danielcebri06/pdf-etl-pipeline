package com.pdfdata.pdf_etl_pipeline.service;

import com.pdfdata.pdf_etl_pipeline.dto.PdfMetadataXmlDto;
import com.pdfdata.pdf_etl_pipeline.model.PdfMetadata;
import com.pdfdata.pdf_etl_pipeline.model.QuarantineRecord;
import com.pdfdata.pdf_etl_pipeline.repository.PdfMetadataRepository;
import com.pdfdata.pdf_etl_pipeline.repository.QuarantineRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentInformation;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.SerializationFeature;
import tools.jackson.dataformat.xml.XmlMapper;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class PdfEtlService {

    private final PdfMetadataRepository metadataRepository;
    private final QuarantineRecordRepository quarantineRepository;
    private final S3StorageService s3StorageService;

    private final XmlMapper xmlMapper = XmlMapper.builder()
            .enable(SerializationFeature.INDENT_OUTPUT)
            .build();

    public Optional<byte[]> getRawPdfBytes(PdfMetadata doc) {
        return s3StorageService.downloadBytes(doc.getS3BronzeKey());
    }

    public boolean deleteDocument(Long id) {
        return metadataRepository.findById(id).map(doc -> {
            s3StorageService.deleteObject(doc.getS3BronzeKey());
            s3StorageService.deleteObject(doc.getS3XmlKey());
            metadataRepository.delete(doc);
            log.info("Documento eliminado de S3 y PostgreSQL (ID={})", id);
            return true;
        }).orElse(false);
    }

    public Map<String, Object> processFile(MultipartFile file) {
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "unnamed.pdf";
        long fileSize = file.getSize();

        try {
            if (file.isEmpty()) {
                return sendToQuarantine(originalName, fileSize, "EMPTY_FILE", "El archivo está vacío.");
            }

            byte[] pdfBytes = file.getBytes();
            String fileHash = calculateSha256(pdfBytes);

            // 1. Control de idempotencia (duplicados)
            if (metadataRepository.existsByFileHash(fileHash)) {
                return sendToQuarantine(originalName, fileSize, "DUPLICATE",
                        "Ya existe un documento procesado con el mismo SHA-256: " + fileHash);
            }

            // 2. Extracción con Apache PDFBox 3
            try (PDDocument document = Loader.loadPDF(pdfBytes)) {
                PDDocumentInformation info = document.getDocumentInformation();
                int pageCount = document.getNumberOfPages();

                PDFTextStripper textStripper = new PDFTextStripper();
                String extractedText = textStripper.getText(document);
                int wordCount = extractedText.isBlank() ? 0 : extractedText.trim().split("\\s+").length;

                LocalDateTime creationDate = toLocalDateTime(info.getCreationDate());
                LocalDateTime now = LocalDateTime.now();

                // 3. Limpieza de metadatos (Capa Plata)
                String title = cleanValue(info.getTitle(), "Sin título");
                String author = cleanValue(info.getAuthor(), "Desconocido");
                String subject = cleanValue(info.getSubject(), "");
                String keywords = cleanValue(info.getKeywords(), "");
                String creator = cleanValue(info.getCreator(), "Desconocido");

                // 4. Transformación a XML
                PdfMetadataXmlDto xmlDto = PdfMetadataXmlDto.builder()
                        .fileName(originalName)
                        .fileHash(fileHash)
                        .title(title)
                        .author(author)
                        .subject(subject)
                        .keywords(keywords)
                        .creator(creator)
                        .pageCount(pageCount)
                        .wordCount(wordCount)
                        .fileSizeBytes(fileSize)
                        .pdfCreationDate(creationDate != null ? creationDate.toString() : null)
                        .processedAt(now.toString())
                        .build();

                String xmlContent = xmlMapper.writeValueAsString(xmlDto);

                // 5. Carga en Capa Bronce (LocalStack S3)
                String safeName = originalName.replaceAll("[^a-zA-Z0-9._-]", "_");
                String s3PdfKey = s3StorageService.uploadBytes(
                        "raw-pdfs/" + fileHash + "_" + safeName, pdfBytes, "application/pdf");
                String s3XmlKey = s3StorageService.uploadBytes(
                        "raw-xml/" + fileHash + ".xml", xmlContent.getBytes(StandardCharsets.UTF_8), "application/xml");

                // 6. Carga en Capa Plata (PostgreSQL)
                PdfMetadata saved = metadataRepository.save(PdfMetadata.builder()
                        .fileName(originalName)
                        .fileHash(fileHash)
                        .s3BronzeKey(s3PdfKey)
                        .s3XmlKey(s3XmlKey)
                        .title(title)
                        .author(author)
                        .subject(subject)
                        .keywords(keywords)
                        .creator(creator)
                        .pageCount(pageCount)
                        .wordCount(wordCount)
                        .fileSizeBytes(fileSize)
                        .pdfCreationDate(creationDate)
                        .xmlContent(xmlContent)
                        .build());

                log.info("PDF procesado correctamente: {} (ID={})", originalName, saved.getId());

                return Map.of(
                        "status", "PROCESSED",
                        "fileName", originalName,
                        "id", saved.getId(),
                        "fileHash", fileHash,
                        "s3BronzeKey", s3PdfKey
                );
            }

        } catch (InvalidPasswordException e) {
            return sendToQuarantine(originalName, fileSize, "ENCRYPTED_PDF",
                    "El PDF está protegido con contraseña y no se puede leer.");
        } catch (Exception e) {
            log.error("Error procesando {}: {}", originalName, e.getMessage());
            return sendToQuarantine(originalName, fileSize, "CORRUPT_OR_INVALID_PDF", e.getMessage());
        }
    }

    private Map<String, Object> sendToQuarantine(String fileName, long fileSize, String errorType, String reason) {
        QuarantineRecord record = quarantineRepository.save(QuarantineRecord.builder()
                .fileName(fileName)
                .fileSizeBytes(fileSize)
                .errorType(errorType)
                .errorReason(reason)
                .build());

        log.warn("Archivo enviado a cuarentena: {} [{}]", fileName, errorType);

        return Map.of(
                "status", "QUARANTINED",
                "fileName", fileName,
                "quarantineId", record.getId(),
                "errorType", errorType,
                "reason", reason
        );
    }

    private String calculateSha256(byte[] data) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        return HexFormat.of().formatHex(digest.digest(data));
    }

    private String cleanValue(String value, String defaultValue) {
        return (value == null || value.isBlank()) ? defaultValue : value.trim();
    }

    private LocalDateTime toLocalDateTime(Calendar calendar) {
        if (calendar == null) return null;
        return LocalDateTime.ofInstant(calendar.toInstant(), ZoneId.systemDefault());
    }


}