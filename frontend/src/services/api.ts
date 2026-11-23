import type {
  GoldStats,
  IngestResult,
  PdfMetadata,
  QuarantineRecord,
} from '../types/pipeline';

const API_BASE = 'http://localhost:8080/api/v1/pdfs';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status} al consultar ${url}`);
  }

  return response.json() as Promise<T>;
}

export function getGoldStats(): Promise<GoldStats> {
  return fetchJson<GoldStats>(`${API_BASE}/stats`);
}

export function getProcessedPdfs(): Promise<PdfMetadata[]> {
  return fetchJson<PdfMetadata[]>(API_BASE);
}

export function getQuarantineRecords(): Promise<QuarantineRecord[]> {
  return fetchJson<QuarantineRecord[]>(`${API_BASE}/quarantine`);
}

export function ingestPdfFiles(files: File[]): Promise<IngestResult[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  return fetchJson<IngestResult[]>(`${API_BASE}/ingest`, {
    method: 'POST',
    body: formData,
  });
}

export function getXmlDownloadUrl(id: number): string {
  return `${API_BASE}/${id}/xml`;
}

export async function deletePdfDocument(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status} al eliminar el documento #${id}`);
  }
}

export async function deleteQuarantineRecord(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/quarantine/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status} al eliminar el registro #${id}`);
  }
}

export async function getPdfPreviewBlob(id: number): Promise<Blob> {
  const response = await fetch(`${API_BASE}/${id}/pdf`, {
    headers: { Accept: 'application/pdf' },
  });

  if (response.status === 404) {
    throw new Error(
      'El archivo original no está disponible en LocalStack S3 (puede haberse borrado al reiniciar Docker).'
    );
  }
  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status} al recuperar el PDF #${id}`);
  }

  return response.blob();
}