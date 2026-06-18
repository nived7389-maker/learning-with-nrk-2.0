import React, { useState, useEffect } from "react";
import { 
  FileText, Search, Download, Eye, BookOpen, ArrowLeft, ArrowRight
} from "lucide-react";
import { Student, PdfAsset } from "../types";
import { fetchPDFs } from "../firebase";
import { motion, AnimatePresence } from "motion/react";

interface NotesViewProps {
  student: Student | null;
}

export default function NotesView({ student }: NotesViewProps) {
  const [pdfs, setPdfs] = useState<PdfAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingPdf, setViewingPdf] = useState<PdfAsset | null>(null);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);

  useEffect(() => {
    if (student?.class && student?.stream) {
      setLoading(true);
      fetchPDFs(student.class, student.stream)
        .then(list => {
          setPdfs(list);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [student]);

  const filteredPdfs = pdfs.filter(pdf => 
    pdf.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pdf.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedPdfs = filteredPdfs.reduce((acc, pdf) => {
    if (!acc[pdf.subject]) {
      acc[pdf.subject] = [];
    }
    acc[pdf.subject].push(pdf);
    return acc;
  }, {} as Record<string, PdfAsset[]>);

  const availableSubjects = Object.keys(groupedPdfs);

  const handleDownloadPdf = (pdf: PdfAsset) => {
    window.open(pdf.pdfUrl, "_blank");
  };

  const handleViewPdf = (pdf: PdfAsset) => {
    setViewingPdf(pdf);
  };

  return (
    <div className="px-5 py-6 pb-24">
      <div className="mb-6 flex gap-3.5 items-center">
        {activeSubject ? (
          <button 
            onClick={() => setActiveSubject(null)}
            className="w-10 h-10 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer text-slate-800 dark:text-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-indigo-500" />
          </div>
        )}
        <div>
          <h2 className="text-2xl font-sans font-extrabold text-slate-900 dark:text-white leading-none mb-1">
            {activeSubject ? `${activeSubject} Notes` : "Study Notes"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
            {activeSubject ? "Available chapters and lessons" : "Select a subject to view available notes"}
          </p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 dark:text-slate-400" />
        <input 
          type="text"
          placeholder={activeSubject ? `Search ${activeSubject} notes...` : "Search subjects or notes..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-500/50 transition-all font-sans shadow-sm"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <span className="text-xs font-sans text-slate-600 dark:text-slate-400">Loading notes...</span>
        </div>
      ) : activeSubject ? (
        // SHOW PDFS FOR ACTIVE SUBJECT
        <div className="space-y-3.5">
          {(!groupedPdfs[activeSubject] || groupedPdfs[activeSubject].length === 0) ? (
            <div className="text-center py-16 bg-white border border-dashed border-slate-200 dark:bg-white/[0.02] dark:border-white/5 rounded-2xl p-6">
              <FileText className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
              <p className="font-sans text-xs font-semibold text-slate-600 dark:text-slate-300">No notes found for {activeSubject}</p>
            </div>
          ) : (
            groupedPdfs[activeSubject].map((pdf) => (
              <div 
                key={pdf.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 flex flex-col md:flex-row justify-between md:items-center gap-4 transition-all shadow-sm relative overflow-hidden"
              >
                <div className="flex gap-3.5 text-left">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                  </div>
                  <div className="font-sans">
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight mb-1 truncate max-w-[190px] sm:max-w-xs">{pdf.title}</h4>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="font-mono">{new Date(pdf.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2 md:mt-0 shrink-0">
                  <button
                    onClick={() => handleViewPdf(pdf)}
                    className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-[10.5px] font-sans font-semibold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 hover:dark:bg-indigo-500/20 transition-all cursor-pointer outline-none"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>

                  <button
                    onClick={() => handleDownloadPdf(pdf)}
                    className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-[10.5px] font-sans font-semibold text-green-600 dark:text-green-400 hover:bg-green-100 hover:dark:bg-green-500/20 transition-all cursor-pointer outline-none"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : availableSubjects.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-slate-200 dark:bg-white/[0.02] dark:border-white/5 rounded-2xl p-6">
          <FileText className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
          <p className="font-sans text-xs font-semibold text-slate-600 dark:text-slate-300">No notes found</p>
          <p className="font-sans text-[11px] text-slate-500 max-w-xs mx-auto mt-1">
            Check back later for newly uploaded study materials.
          </p>
        </div>
      ) : (
        // SHOW SUBJECTS GRID
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {availableSubjects.map((subject) => {
            const count = groupedPdfs[subject].length;
            return (
              <button
                key={subject}
                onClick={() => setActiveSubject(subject)}
                className="w-full text-left p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 shadow-sm transition-all flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-slate-900 dark:text-white text-base leading-tight mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {subject}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tracking-wide">
                      {count} {count === 1 ? 'NOTE' : 'NOTES'}
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/20 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* VIEW PDF FULLSCREEN MODAL */}
      <AnimatePresence>
        {viewingPdf && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-10"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-5xl h-[85vh] md:h-full flex flex-col bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10"
            >
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-900">
                <h3 className="font-sans font-bold text-sm text-slate-900 dark:text-white truncate pr-4">{viewingPdf.title}</h3>
                <button 
                  onClick={() => setViewingPdf(null)}
                  className="w-8 h-8 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-slate-500 dark:text-slate-400 outline-none cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 w-full bg-slate-100 dark:bg-black/20">
                <iframe
                  src={viewingPdf.pdfUrl}
                  className="w-full h-full border-none"
                  title={viewingPdf.fileName}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

