import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  CheckCircle,
  Eye,
  FileCheck,
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { AlertBanner } from '../components/common/AlertBanner';
import { Material } from '../types';

export const MaterialsPage: React.FC = () => {
  const {
    materials,
    activeMaterialId,
    setActiveMaterial,
    refreshMaterials,
    showToast,
  } = useApp();

  // Tab: 'pdf' or 'notes'
  const [tab, setTab] = useState<'pdf' | 'notes'>('pdf');

  // PDF Upload state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notes state
  const [notesTitle, setNotesTitle] = useState('');
  const [notesContent, setNotesContent] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Preview Modal state
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Error message
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelected(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setErrorMessage(null);
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Please select a valid PDF file (.pdf).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 15 MB limit.');
      return;
    }
    setPdfFile(file);
    if (!pdfTitle) {
      setPdfTitle(file.name.replace(/\.pdf$/i, ''));
    }
  };

  const handleUploadPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) return;

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const created = await api.uploadPdf(pdfFile, pdfTitle);
      showToast(`Successfully extracted ${created.total_pages} page(s) from "${created.title}"`, 'success');
      setPdfFile(null);
      setPdfTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await refreshMaterials();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error processing PDF document.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesTitle.trim() || !notesContent.trim()) {
      setErrorMessage('Please provide both a title and study notes content.');
      return;
    }

    setIsSavingNotes(true);
    setErrorMessage(null);

    try {
      const created = await api.uploadNotes(notesTitle, notesContent);
      showToast(`Saved notes "${created.title}" (${created.total_pages} page segments)`, 'success');
      setNotesTitle('');
      setNotesContent('');
      await refreshMaterials();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save notes.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}" from temporary memory?`)) return;

    try {
      await api.deleteMaterial(id);
      showToast(`Removed "${title}" from memory`, 'info');
      await refreshMaterials();
      if (previewMaterial?.id === id) {
        setPreviewMaterial(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete material.';
      showToast(msg, 'error');
    }
  };

  const handleOpenPreview = async (id: string) => {
    setIsLoadingPreview(true);
    try {
      const full = await api.getMaterialById(id);
      setPreviewMaterial(full);
      setPreviewPage(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load document text.';
      showToast(msg, 'error');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Sample quick test notes loader
  const handleLoadSampleNotes = () => {
    setTab('notes');
    setNotesTitle('Photosynthesis and Cellular Respiration (Biology 101)');
    setNotesContent(
      `Photosynthesis is the biological process used by plants, algae, and cyanobacteria to convert light energy into chemical energy stored in glucose molecules. This complex energy conversion takes place inside the chloroplasts, specifically within the thylakoid membranes and stroma.\n\n` +
      `The light-dependent reactions occur within the thylakoid membrane where chlorophyll absorbs sunlight and photolysis splits water molecules into oxygen, protons, and high-energy electrons. This drives ATP synthase to produce ATP and NADPH.\n\n` +
      `The Calvin cycle (light-independent reactions) occurs in the stroma. The enzyme RuBisCO catalyzes carbon fixation, attaching atmospheric carbon dioxide to ribulose-1,5-bisphosphate to synthesize 3-phosphoglycerate and ultimately glucose.\n\n` +
      `Cellular respiration is the reciprocal metabolic pathway occurring inside the mitochondria, converting biochemical energy from nutrients into ATP. It consists of glycolysis in the cytoplasm, the Krebs citric acid cycle in the mitochondrial matrix, and oxidative phosphorylation along the inner mitochondrial membrane.`
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Study Materials
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Upload PDF documents or paste lecture notes. PyMuPDF extracts readable text with exact page numbers for verified citations.
          </p>
        </div>

        <button
          onClick={handleLoadSampleNotes}
          className="self-start sm:self-auto text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          + Load Sample Biology Notes
        </button>
      </div>

      {errorMessage && (
        <AlertBanner
          type="error"
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
      )}

      {/* Upload & Ingestion Tabs */}
      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-4 border-b border-slate-200 pb-4 mb-6">
          <button
            onClick={() => { setTab('pdf'); setErrorMessage(null); }}
            className={`pb-2 text-sm font-semibold transition-colors relative cursor-pointer ${
              tab === 'pdf'
                ? 'text-indigo-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Upload PDF Document
            {tab === 'pdf' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 -mb-4 rounded-full" />
            )}
          </button>
          <button
            onClick={() => { setTab('notes'); setErrorMessage(null); }}
            className={`pb-2 text-sm font-semibold transition-colors relative cursor-pointer ${
              tab === 'notes'
                ? 'text-indigo-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Paste Study Notes
            {tab === 'notes' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 -mb-4 rounded-full" />
            )}
          </button>
        </div>

        {tab === 'pdf' ? (
          <form onSubmit={handleUploadPdf} className="space-y-4">
            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/70'
                  : pdfFile
                  ? 'border-emerald-300 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex flex-col items-center justify-center space-y-2">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    pdfFile ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
                  }`}
                >
                  {pdfFile ? <FileCheck className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                </div>

                {pdfFile ? (
                  <div>
                    <p className="text-sm font-bold text-slate-900">{pdfFile.name}</p>
                    <p className="text-xs text-slate-500">
                      {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to process
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Drag & drop your PDF file here, or{' '}
                      <span className="text-indigo-600 hover:underline">browse</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      PDF files up to 15 MB. Note: Scanned documents without digital text are not supported.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Document Title input */}
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <input
                type="text"
                placeholder="Document Title (optional, defaults to filename)"
                value={pdfTitle}
                onChange={(e) => setPdfTitle(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />

              <Button
                type="submit"
                variant="primary"
                disabled={!pdfFile || isUploading}
                isLoading={isUploading}
                className="w-full sm:w-auto shrink-0"
                icon={<Upload className="w-4 h-4" />}
              >
                Upload & Process PDF
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSaveNotes} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notes Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Chapter 4: Organic Chemistry Summary"
                value={notesTitle}
                onChange={(e) => setNotesTitle(e.target.value)}
                required
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Study Notes Content *
              </label>
              <textarea
                rows={6}
                placeholder="Paste your study notes, textbook excerpts, or lecture transcripts here..."
                value={notesContent}
                onChange={(e) => setNotesContent(e.target.value)}
                required
                className="w-full text-sm p-3.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-sans"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                StudyPilot AI will automatically segment longer notes into numbered pages (~350 words each) for precise citations.
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={isSavingNotes || !notesTitle.trim() || !notesContent.trim()}
              isLoading={isSavingNotes}
              icon={<FileText className="w-4 h-4" />}
            >
              Save as Study Material
            </Button>
          </form>
        )}
      </Card>

      {/* Materials List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            Loaded Documents ({materials.length})
          </h3>
          <span className="text-xs text-slate-400">
            Stored securely in temporary memory
          </span>
        </div>

        {materials.length === 0 ? (
          <Card className="p-8 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">No study materials loaded</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload a PDF above or paste notes to begin asking questions and generating quizzes.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {materials.map((item) => {
              const isActive = item.id === activeMaterialId;
              return (
                <Card
                  key={item.id}
                  className={`p-5 transition-all ${
                    isActive ? 'ring-2 ring-indigo-600 border-indigo-300 bg-indigo-50/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100/70 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-900 leading-snug" title={item.title}>
                          {item.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <Badge variant="neutral" size="sm">
                            {item.file_type.toUpperCase()}
                          </Badge>
                          <span>•</span>
                          <span>{item.total_pages} {item.total_pages === 1 ? 'page' : 'pages'}</span>
                          <span>•</span>
                          <span>{item.total_words} words</span>
                        </div>
                      </div>
                    </div>

                    {isActive && (
                      <Badge variant="primary" icon={<CheckCircle className="w-3 h-3" />}>
                        Active
                      </Badge>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">{item.created_at}</span>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenPreview(item.id)}
                        icon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Preview Text
                      </Button>

                      {!isActive ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setActiveMaterial(item.id)}
                        >
                          Select Active
                        </Button>
                      ) : (
                        <span className="text-xs text-emerald-600 font-semibold px-2 py-1">
                          In Use
                        </span>
                      )}

                      <button
                        onClick={() => handleDelete(item.id, item.title)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete material"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Document Text Preview Modal */}
      {previewMaterial && (
        <Modal
          isOpen={!!previewMaterial}
          onClose={() => setPreviewMaterial(null)}
          title={`Document Text: ${previewMaterial.title}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-xl text-xs">
              <div className="font-semibold text-slate-700">
                Page {previewPage} of {previewMaterial.total_pages}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={previewPage <= 1}
                  onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                  icon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={previewPage >= previewMaterial.total_pages}
                  onClick={() => setPreviewPage((p) => Math.min(previewMaterial.total_pages, p + 1))}
                  icon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Next
                </Button>
              </div>
            </div>

            {/* Page Text Viewer */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 max-h-96 overflow-y-auto font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap select-text">
              {previewMaterial.pages[previewPage - 1]?.text || 'No text extracted for this page.'}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Word count: {previewMaterial.pages[previewPage - 1]?.word_count || 0}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewMaterial(null)}
              >
                Close Preview
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
