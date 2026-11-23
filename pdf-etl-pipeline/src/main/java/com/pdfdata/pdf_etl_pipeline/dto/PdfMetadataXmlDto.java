package com.pdfdata.pdf_etl_pipeline.dto;

import lombok.Builder;
import lombok.Data;
import tools.jackson.dataformat.xml.annotation.JacksonXmlRootElement;

@Data
@Builder
@JacksonXmlRootElement(localName = "pdfDocument")
public class PdfMetadataXmlDto {

    private String fileName;
    private String fileHash;
    private String title;
    private String author;
    private String subject;
    private String keywords;
    private String creator;
    private Integer pageCount;
    private Integer wordCount;
    private Long fileSizeBytes;
    private String pdfCreationDate;
    private String processedAt;
}
