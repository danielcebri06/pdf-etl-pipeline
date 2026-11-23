export interface CategoryCount {
  label: string;
  count: number;
}

export interface GoldStats {
  totalProcessed: number;
  totalQuarantined: number;
  successRatePercent: number;
  totalPages: number;
  totalWords: number;
  avgPagesPerDocument: number;
  totalSizeBytes: number;
  documentsByAuthor: CategoryCount[];
  quarantineByErrorType: CategoryCount[];
}

export interface PdfMetadata {
  id: number;
  fileName: string;
  fileHash: string;
  s3BronzeKey: string | null;
  s3XmlKey: string | null;
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  pageCount: number;
  wordCount: number;
  fileSizeBytes: number;
  pdfCreationDate: string | null;
  xmlContent: string;
  processedAt: string;
}

export interface QuarantineRecord {
  id: number;
  fileName: string;
  fileSizeBytes: number;
  errorType: string;
  errorReason: string;
  failedAt: string;
}

export interface IngestResult {
  status: 'PROCESSED' | 'QUARANTINED';
  fileName: string;
  id?: number;
  fileHash?: string;
  s3BronzeKey?: string;
  quarantineId?: number;
  errorType?: string;
  reason?: string;
}