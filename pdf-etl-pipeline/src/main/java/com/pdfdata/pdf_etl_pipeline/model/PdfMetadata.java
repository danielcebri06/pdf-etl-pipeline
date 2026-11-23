package com.pdfdata.pdf_etl_pipeline.model;


import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "pdf_metadata", indexes = {
        @Index(name = "idx_pdf_file_hash", columnList = "file_hash", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PdfMetadata {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    // Huella única del archivo (evitar duplicados)
    @Column(name = "file_hash", nullable = false, unique = true, length = 64)
    private String fileHash;

    // Linaje de datos: dónde está guardado el original y el XML crudo en S3 (Capa Bronce)
    @Column(name = "s3_bronze_key")
    private String s3BronzeKey;

    @Column(name = "s3_xml_key")
    private String s3XmlKey;

    // Metadatos extraídos del PDF
    private String title;
    private String author;
    private String subject;
    private String keywords;
    private String creator;

    @Column(name = "page_count")
    private Integer pageCount;

    @Column(name = "word_count")
    private Integer wordCount;

    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;

    @Column(name = "pdf_creation_date")
    private LocalDateTime pdfCreationDate;

    // Guardamos el XML como TEXT
    @Column(name = "xml_content", columnDefinition = "TEXT")
    private String xmlContent;

    @Column(name = "processed_at", nullable = false, updatable = false)
    private LocalDateTime processedAt;

    @PrePersist
    protected void onCreate() {
        this.processedAt = LocalDateTime.now();
    }
}