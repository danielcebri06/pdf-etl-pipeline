import { useState } from 'react';
import { Check, Copy, Download, FileCode2, X } from 'lucide-react';
import type { PdfMetadata } from '../types/pipeline';

interface XmlModalProps {
  document: PdfMetadata | null;
  onClose: () => void;
}

export function XmlModal({ document: doc, onClose }: XmlModalProps) {
  const [copied, setCopied] = useState(false);

  if (!doc) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(doc.xmlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([doc.xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${doc.fileName.replace(/\.pdf$/i, '')}.xml`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <FileCode2 className="h-5 w-5 text-sky-400" />
            <div>
              <h3 className="font-semibold text-slate-100">{doc.fileName}</h3>
              <p className="text-xs text-slate-400">
                S3 XML: {doc.s3XmlKey ?? 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-sky-500"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar .xml
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <pre className="overflow-auto bg-slate-950 p-5 text-xs leading-relaxed text-emerald-300">
          <code>{doc.xmlContent}</code>
        </pre>
      </div>
    </div>
  );
}