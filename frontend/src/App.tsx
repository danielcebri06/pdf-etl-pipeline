import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Eye,
  FileCode2,
  FileText,
  HardDrive,
  Layers,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import {
  deletePdfDocument,
  deleteQuarantineRecord,
  getGoldStats,
  getProcessedPdfs,
  getQuarantineRecords,
  ingestPdfFiles,
} from './services/api';
import { ConfirmModal } from './components/ConfirmModal';
import { PdfModal } from './components/PdfModal';
import { XmlModal } from './components/XmlModal';
import type {
  GoldStats,
  IngestResult,
  PdfMetadata,
  QuarantineRecord,
} from './types/pipeline';

interface DeleteTarget {
  type: 'silver' | 'quarantine';
  id: number;
  fileName: string;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export default function App() {
  const [stats, setStats] = useState<GoldStats | null>(null);
  const [documents, setDocuments] = useState<PdfMetadata[]>([]);
  const [quarantine, setQuarantine] = useState<QuarantineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'silver' | 'quarantine'>('silver');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<PdfMetadata | null>(null);
  const [previewDoc, setPreviewDoc] = useState<PdfMetadata | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastBatchResults, setLastBatchResults] = useState<IngestResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 3500);
  };

  const loadPipelineData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, docsData, quarantineData] = await Promise.all([
        getGoldStats(),
        getProcessedPdfs(),
        getQuarantineRecords(),
      ]);
      setStats(statsData);
      setDocuments(docsData);
      setQuarantine(quarantineData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo conectar con Spring Boot en http://localhost:8080'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPipelineData();
  }, [loadPipelineData]);

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    setUploading(true);
    setError(null);
    try {
      const results = await ingestPdfFiles(files);
      setLastBatchResults(results);
      await loadPipelineData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error durante la ingesta de archivos'
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    void handleUpload(e.dataTransfer.files);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    void handleUpload(e.target.files);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      if (deleteTarget.type === 'silver') {
        await deletePdfDocument(deleteTarget.id);
        showToast(`"${deleteTarget.fileName}" eliminado de S3 y PostgreSQL.`);
      } else {
        await deleteQuarantineRecord(deleteTarget.id);
        showToast(`Registro "${deleteTarget.fileName}" eliminado de cuarentena.`);
      }
      setDeleteTarget(null);
      await loadPipelineData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el elemento');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      doc.fileName.toLowerCase().includes(q) ||
      doc.title.toLowerCase().includes(q) ||
      doc.author.toLowerCase().includes(q) ||
      doc.fileHash.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Barra superior */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                PDF ETL Data Pipeline
              </h1>
              <p className="text-xs text-slate-400">
                Arquitectura Medallion · S3 Bronce · PostgreSQL Plata &amp; Oro
              </p>
            </div>
          </div>

          <button
            onClick={() => void loadPipelineData()}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar métricas
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        {/* Alerta de error de conexión */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-sm text-rose-200">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
            <div>
              <p className="font-medium">Error de conexión con el backend</p>
              <p className="text-xs text-rose-300/80">
                {error}. Comprueba que Spring Boot (puerto 8080) y Docker están activos.
              </p>
            </div>
          </div>
        )}

        {/* CAPA ORO: KPIs principales */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <h2 className="text-xs font-semibold tracking-wider text-amber-400 uppercase">
              Capa Oro · Métricas Analíticas
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Procesados (Plata)</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="mt-2 text-3xl font-bold text-white">
                {stats?.totalProcessed ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Tasa de éxito:{' '}
                <span className="font-semibold text-emerald-400">
                  {stats?.successRatePercent ?? 0}%
                </span>
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">En Cuarentena</span>
                <ShieldAlert className="h-4 w-4 text-amber-400" />
              </div>
              <p className="mt-2 text-3xl font-bold text-white">
                {stats?.totalQuarantined ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Duplicados, cifrados o corruptos
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Páginas y Palabras</span>
                <FileText className="h-4 w-4 text-sky-400" />
              </div>
              <p className="mt-2 text-3xl font-bold text-white">
                {(stats?.totalPages ?? 0).toLocaleString('es-ES')}
                <span className="ml-1.5 text-sm font-normal text-slate-400">págs</span>
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {(stats?.totalWords ?? 0).toLocaleString('es-ES')} palabras · Media{' '}
                {stats?.avgPagesPerDocument ?? 0} págs/doc
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Volumen S3 (Bronce)</span>
                <HardDrive className="h-4 w-4 text-violet-400" />
              </div>
              <p className="mt-2 text-3xl font-bold text-white">
                {formatBytes(stats?.totalSizeBytes ?? 0)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Almacenado en bucket pdf-bronze
              </p>
            </div>
          </div>

          {/* Desglose Capa Oro */}
          {stats && (stats.documentsByAuthor.length > 0 || stats.quarantineByErrorType.length > 0) && (
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <h3 className="mb-3 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  Documentos por Autor
                </h3>
                <div className="space-y-2.5">
                  {stats.documentsByAuthor.slice(0, 5).map((item) => {
                    const pct =
                      stats.totalProcessed > 0
                        ? Math.round((item.count / stats.totalProcessed) * 100)
                        : 0;
                    return (
                      <div key={item.label}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="truncate text-slate-200">{item.label}</span>
                          <span className="text-slate-400">
                            {item.count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-sky-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <h3 className="mb-3 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  Motivos de Cuarentena
                </h3>
                {stats.quarantineByErrorType.length === 0 ? (
                  <p className="text-xs text-slate-500">Sin incidentes registrados.</p>
                ) : (
                  <div className="space-y-2.5">
                    {stats.quarantineByErrorType.map((item) => {
                      const pct =
                        stats.totalQuarantined > 0
                          ? Math.round((item.count / stats.totalQuarantined) * 100)
                          : 0;
                      return (
                        <div key={item.label}>
                          <div className="mb-1 flex justify-between text-xs">
                            <span className="font-mono text-amber-300">{item.label}</span>
                            <span className="text-slate-400">
                              {item.count} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-amber-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ZONA DE INGESTA (DRAG & DROP) */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange-400" />
            <h2 className="text-xs font-semibold tracking-wider text-orange-400 uppercase">
              Ingesta por Lotes · Capa Bronce
            </h2>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition ${
              isDragging
                ? 'border-sky-400 bg-sky-500/10'
                : 'border-slate-700 bg-slate-900/60 hover:border-slate-500 hover:bg-slate-900'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <UploadCloud
              className={`h-10 w-10 ${
                uploading ? 'animate-bounce text-sky-400' : 'text-slate-400'
              }`}
            />
            <p className="mt-3 text-sm font-medium text-slate-200">
              {uploading
                ? 'Ejecutando pipeline ETL (SHA-256, PDFBox, XML y S3)...'
                : 'Arrastra aquí uno o varios archivos PDF o haz clic para seleccionar'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Los duplicados y archivos corruptos se desvían automáticamente a Cuarentena
            </p>
          </div>

          {lastBatchResults.length > 0 && (
            <div className="mt-3 space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs font-semibold text-slate-400">
                Resultado del último lote ({lastBatchResults.length} archivo/s):
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {lastBatchResults.map((res, idx) => (
                  <div
                    key={`${res.fileName}-${idx}`}
                    className={`flex items-start justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${
                      res.status === 'PROCESSED'
                        ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-200'
                        : 'border-amber-500/30 bg-amber-950/30 text-amber-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{res.fileName}</p>
                      <p className="truncate text-[11px] opacity-80">
                        {res.status === 'PROCESSED'
                          ? `ID #${res.id} · Guardado en S3 y PostgreSQL`
                          : `${res.errorType}: ${res.reason}`}
                      </p>
                    </div>
                    <span className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ring-1 ring-current/30">
                      {res.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* TABLAS: CAPA PLATA Y CUARENTENA */}
        <section className="rounded-xl border border-slate-800 bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-5 py-4">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('silver')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                  activeTab === 'silver'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Database className="h-3.5 w-3.5" />
                Capa Plata ({documents.length})
              </button>
              <button
                onClick={() => setActiveTab('quarantine')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                  activeTab === 'quarantine'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                Cuarentena ({quarantine.length})
              </button>
            </div>

            {activeTab === 'silver' && (
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por archivo, título, autor o hash..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pr-3 pl-9 text-xs text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {activeTab === 'silver' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase">
                  <tr>
                    <th className="px-5 py-3">Archivo / Título</th>
                    <th className="px-4 py-3">Autor</th>
                    <th className="px-4 py-3">Págs / Palabras</th>
                    <th className="px-4 py-3">Tamaño</th>
                    <th className="px-4 py-3">SHA-256 (Idempotencia)</th>
                    <th className="px-4 py-3">Procesado</th>
                    <th className="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredDocs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                        No hay documentos procesados que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredDocs.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-800/40">
                        <td className="max-w-xs px-5 py-3.5">
                          <p className="truncate font-medium text-slate-100">
                            {doc.fileName}
                          </p>
                          <p className="truncate text-[11px] text-slate-400">
                            {doc.title}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-slate-300">{doc.author}</td>
                        <td className="px-4 py-3.5 text-slate-300">
                          {doc.pageCount} págs · {doc.wordCount.toLocaleString('es-ES')} pal.
                        </td>
                        <td className="px-4 py-3.5 text-slate-300">
                          {formatBytes(doc.fileSizeBytes)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            title={doc.fileHash}
                            className="rounded bg-slate-800 px-2 py-1 font-mono text-[11px] text-sky-300"
                          >
                            {doc.fileHash.slice(0, 12)}...
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-400">
                          {formatDate(doc.processedAt)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              title="Previsualizar PDF original desde S3"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 font-medium text-violet-300 transition hover:bg-violet-500/20"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              PDF
                            </button>
                            <button
                              onClick={() => setSelectedDoc(doc)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 font-medium text-sky-300 transition hover:bg-sky-500/20"
                            >
                              <FileCode2 className="h-3.5 w-3.5" />
                              XML
                            </button>
                            <button
                              onClick={() =>
                                setDeleteTarget({
                                  type: 'silver',
                                  id: doc.id,
                                  fileName: doc.fileName,
                                })
                              }
                              title="Eliminar de S3 y PostgreSQL"
                              className="inline-flex items-center rounded-lg border border-rose-500/30 bg-rose-500/10 p-1.5 text-rose-400 transition hover:bg-rose-500/20 hover:text-rose-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase">
                  <tr>
                    <th className="px-5 py-3">Archivo</th>
                    <th className="px-4 py-3">Tipo de Error</th>
                    <th className="px-4 py-3">Motivo</th>
                    <th className="px-4 py-3">Tamaño</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-5 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {quarantine.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                        No hay archivos en cuarentena.
                      </td>
                    </tr>
                  ) : (
                    quarantine.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40">
                        <td className="px-5 py-3.5 font-medium text-slate-100">
                          {item.fileName}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="rounded bg-amber-500/15 px-2 py-1 font-mono text-[11px] font-semibold text-amber-300 ring-1 ring-amber-500/30">
                            {item.errorType}
                          </span>
                        </td>
                        <td className="max-w-md px-4 py-3.5 text-slate-300">
                          {item.errorReason}
                        </td>
                        <td className="px-4 py-3.5 text-slate-400">
                          {formatBytes(item.fileSizeBytes)}
                        </td>
                        <td className="px-4 py-3.5 text-slate-400">
                          {formatDate(item.failedAt)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() =>
                              setDeleteTarget({
                                type: 'quarantine',
                                id: item.id,
                                fileName: item.fileName,
                              })
                            }
                            title="Eliminar de cuarentena"
                            className="inline-flex items-center rounded-lg border border-rose-500/30 bg-rose-500/10 p-1.5 text-rose-400 transition hover:bg-rose-500/20 hover:text-rose-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <XmlModal document={selectedDoc} onClose={() => setSelectedDoc(null)} />
      <PdfModal document={previewDoc} onClose={() => setPreviewDoc(null)} />

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title={
          deleteTarget?.type === 'silver'
            ? 'Eliminar documento del pipeline'
            : 'Eliminar registro de cuarentena'
        }
        description={
          deleteTarget?.type === 'silver'
            ? `Se eliminará "${deleteTarget.fileName}" de PostgreSQL (Capa Plata) junto con el PDF original y el XML en LocalStack S3 (Capa Bronce). Esta acción no se puede deshacer.`
            : `Se eliminará el registro de error de "${deleteTarget?.fileName ?? ''}" de la tabla de cuarentena.`
        }
        confirmLabel="Sí, eliminar"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      {toastMessage && (
        <div className="fixed right-5 bottom-5 z-50 flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-slate-900 px-4 py-3 text-xs font-medium text-emerald-200 shadow-xl">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}