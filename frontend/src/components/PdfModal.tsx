import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  X,
} from 'lucide-react';
import { getPdfPreviewBlob } from '../services/api';
import type { PdfMetadata } from '../types/pipeline';

interface PdfModalProps {
  document: PdfMetadata | null;
  onClose: () => void;
}

export function PdfModal({ document: doc, onClose }: PdfModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!doc) return;

    let active = true;
    let objectUrl: string | null = null;

    setLoading(true);
    setError(null);
    setPdfUrl(null);

    getPdfPreviewBlob(doc.id)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : 'No se pudo cargar la vista previa del PDF.'
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc]);

  if (!doc) return null;

  const handleDownload = () => {
    if (!pdfUrl) return;
    const link = window.document.createElement('a');
    link.href = pdfUrl;
    link.download = doc.fileName;
    link.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <FileText className="h-5 w-5 shrink-0 text-violet-400" />
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-slate-100">{doc.fileName}</h3>
              <p className="truncate text-xs text-slate-400">
                Capa Bronce (S3): {doc.s3BronzeKey ?? 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {pdfUrl && (
              <>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Nueva pestaña
                </a>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-violet-500"
                >
                  <Download className="h-3.5 w-3.5" />
                  Descargar .pdf
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="relative flex flex-1 items-center justify-center bg-slate-950">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
              <span>Recuperando PDF desde LocalStack S3...</span>
            </div>
          )}

          {error && (
            <div className="flex max-w-md flex-col items-center gap-2 p-6 text-center text-xs text-rose-300">
              <AlertTriangle className="h-7 w-7 text-rose-400" />
              <p className="font-medium text-rose-200">No se pudo previsualizar el archivo</p>
              <p className="text-rose-300/80">{error}</p>
            </div>
          )}

          {pdfUrl && !loading && !error && (
            <iframe
              src={pdfUrl}
              title={`Vista previa de ${doc.fileName}`}
              className="h-full w-full border-0"
            />
          )}
        </div>
      </div>
    </div>
  );
}