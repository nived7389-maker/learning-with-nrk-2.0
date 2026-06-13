import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Atom, FlaskConical, Calculator, BookOpen, GraduationCap, 
  Download, Eye, AlertCircle, Sparkles, Search, 
  ArrowLeft, FileText, CheckCircle2, ChevronRight, HelpCircle,
  Cpu, Dna, BookA, Languages, PenTool, Pi, Phone
} from "lucide-react";
import { Student, PdfAsset, BannerAsset, Subscription } from "../types";
import { fetchBanners, fetchPDFs, listenToUserSubscription } from "../firebase";
import { BotLogo } from "./BotLogo";

interface HomeProps {
  student: Student;
  onSubjectSelect: (subject: string) => void;
  selectedSubject: string | null;
  onBackToHome: () => void;
  onOpenAI?: () => void;
}

// Map icons and colors
const SUBJECT_STYLING: Record<string, { icon: any; color: string; bg: string }> = {
  "Physics": { icon: Atom, color: "text-blue-500 dark:text-blue-400", bg: "from-blue-500/10 to-blue-500/5 dark:from-blue-500/20 dark:to-blue-500/10" },
  "Chemistry": { icon: FlaskConical, color: "text-rose-500 dark:text-rose-400", bg: "from-rose-500/10 to-rose-500/5 dark:from-rose-500/20 dark:to-rose-500/10" },
  "Mathematics": { icon: Pi, color: "text-orange-500 dark:text-orange-400", bg: "from-orange-500/10 to-orange-500/5 dark:from-orange-500/20 dark:to-orange-500/10" },
  "English": { icon: BookA, color: "text-cyan-500 dark:text-cyan-400", bg: "from-cyan-500/10 to-cyan-500/5 dark:from-cyan-500/20 dark:to-cyan-500/10" },
  "Malayalam": { icon: Languages, color: "text-emerald-500 dark:text-emerald-400", bg: "from-emerald-500/10 to-emerald-500/5 dark:from-emerald-500/20 dark:to-emerald-500/10" },
  "Hindi": { icon: PenTool, color: "text-pink-500 dark:text-pink-400", bg: "from-pink-500/10 to-pink-500/5 dark:from-pink-500/20 dark:to-pink-500/10" },
  "Computer Science": { icon: Cpu, color: "text-purple-600 dark:text-purple-400", bg: "from-purple-500/10 to-purple-500/5 dark:from-purple-500/20 dark:to-purple-500/10" },
  "Biology": { icon: Dna, color: "text-green-600 dark:text-green-400", bg: "from-green-500/10 to-green-500/5 dark:from-green-500/20 dark:to-green-500/10" }
};

export default function Home({ student, selectedSubject, onSubjectSelect, onBackToHome, onOpenAI }: HomeProps) {
  const [banners, setBanners] = useState<BannerAsset[]>([]);
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);
  const [pdfs, setPdfs] = useState<PdfAsset[]>([]);
  const [subState, setSubState] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isWarping, setIsWarping] = useState(false);
  
  // Modal controllers
  const [showSubUpgradeModal, setShowSubUpgradeModal] = useState(false);
  const [viewingPdf, setViewingPdf] = useState<PdfAsset | null>(null);

  // Load subscriptions & banners
  useEffect(() => {
    async function loadBanners() {
      const bannerList = await fetchBanners();
      setBanners(bannerList);
    }
    loadBanners();
    
    const unsubscribe = listenToUserSubscription(student.uid, (sub) => {
      setSubState(sub);
    });

    return () => unsubscribe();
  }, [student]);

  const TriggerAIOpen = async () => {
    if (!onOpenAI) return;
    
    if (student.status === "pending" || student.status === "blocked" || !subState || subState.status !== "active") {
      setShowSubUpgradeModal(true);
      return;
    }

    setIsWarping(true);
    await new Promise((r) => setTimeout(r, 600));
    onOpenAI();
    setTimeout(() => setIsWarping(false), 300);
  };


  // Load subject PDFs when subject changes
  useEffect(() => {
    if (selectedSubject && student.class && student.stream) {
      setLoading(true);
      fetchPDFs(student.class, student.stream, selectedSubject)
        .then(list => {
          setPdfs(list);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [selectedSubject, student]);

  // Determine subjects depending on stream
  const subjects = student.stream === "Computer Science"
    ? ["Physics", "Chemistry", "Mathematics", "English", "Malayalam", "Hindi", "Computer Science"]
    : ["Physics", "Chemistry", "Mathematics", "English", "Malayalam", "Hindi", "Biology"];

  // Handle PDF view attempt
  const handleViewPdf = (pdf: PdfAsset) => {
    if (student.status === "pending" || !subState || subState.status !== "active") {
      setShowSubUpgradeModal(true);
      return;
    }
    setViewingPdf(pdf);
  };

  // Handle PDF download
  const handleDownloadPdf = (pdf: PdfAsset) => {
    if (student.status === "pending" || !subState || subState.status !== "active") {
      setShowSubUpgradeModal(true);
      return;
    }
    window.open(pdf.pdfUrl, "_blank");
  };

  // Filtered PDFs list
  const filteredPdfs = pdfs.filter(pdf => 
    pdf.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pdf.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="home-portal-container" className="px-5 pb-24">
      
      <AnimatePresence>
        {/* SUB UPGRADE BLOCKED POPUP MODAL */}
        {showSubUpgradeModal && (
          <motion.div
            id="sub-upgrade-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white dark:bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 border border-indigo-500/20 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />
              
              <div className="mx-auto w-14 h-14 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mb-4">
                <AlertCircle className="w-7 h-7 text-pink-400" />
              </div>
              
              <h3 className="font-sans font-bold text-lg text-slate-900 dark:text-white mb-2">Access Blocked</h3>
              <p className="font-sans text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                Only active subscribers can access premium features like study materials and the AI Assistant. Please subscribe to activate your premium benefits.
              </p>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    const message = `Want a new subscription.\nName: ${student.name}\nPhone: ${student.phone || "Not provided"}`;
                    window.open(`https://wa.me/918848198680?text=${encodeURIComponent(message)}`, "_blank");
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-600 text-white font-sans font-semibold text-xs hover:bg-emerald-500 active:scale-95 transition-all text-center"
                >
                  <Phone className="w-4 h-4" />
                  Subscribe
                </button>
                <button
                  onClick={() => setShowSubUpgradeModal(false)}
                  className="w-full py-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-sans font-medium text-xs hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* FULLSCREEN PDF VIEW MODAL */}
        {viewingPdf && (
          <motion.div
            id="pdf-view-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
          >
            {/* Nav area */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/5 shadow-md">
              <button
                onClick={() => setViewingPdf(null)}
                className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to subject</span>
              </button>
              <h3 className="font-sans font-semibold text-xs truncate max-w-[140px] md:max-w-xs">{viewingPdf.title}</h3>
              <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-green-400" />
              </div>
            </div>

            {/* Real PDF viewer */}
            <div className="flex-1 flex flex-col items-center justify-center p-2 md:p-6 w-full">
              <div className="w-full h-full max-w-4xl bg-slate-200 dark:bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-700 relative">
                <iframe
                  src={`${viewingPdf.pdfUrl}#toolbar=0`}
                  title={viewingPdf.title}
                  className="w-full h-full absolute inset-0"
                />
              </div>
            </div>
            
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/5 text-center">
              <button
                onClick={() => handleDownloadPdf(viewingPdf)}
                className="inline-flex items-center gap-1.5 px-6 py-2 rounded-xl bg-indigo-600 font-sans text-xs font-semibold hover:bg-indigo-500 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Offline File</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedSubject ? (
        // DASHBOARD HOME PREVIEW
        <motion.div
          id="student-dashboard"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 pt-4"
        >
          {/* Header area */}
          <div className="flex justify-between items-center bg-black/5 dark:bg-white/5 p-4 rounded-3xl border border-slate-200 dark:border-white/5 shadow">
            <div>
              <span className="font-sans text-xs text-indigo-400/80 font-semibold block mb-0.5">Welcome Back</span>
              <h2 id="student-greeting" className="font-sans font-extrabold text-xl text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                Hello, {student.name ? student.name.split(" ")[0] : "Student"}!
                <span className="animate-wiggle">👋</span>
              </h2>
            </div>
            {/* Status indicators */}
            <div className="text-right font-sans">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10.5px] font-semibold text-indigo-300">
                {student.class} {student.stream === "Computer Science" ? "CS" : "Biology"}
              </span>
              <span className={`block text-[10px] font-mono font-medium mt-1 uppercase tracking-wider ${
                subState?.status === "active" ? "text-green-400" : "text-amber-400"
              }`}>
                {subState?.status === "active" ? "● Active Subscriber" : "● Sub Pending"}
              </span>
            </div>
          </div>

          {/* Dynamic Slider Banner Managed by Admin */}
          <div id="dynamic-banners-slider" className="relative w-full rounded-2xl aspect-[2.1/1] overflow-hidden bg-slate-850 shadow-lg border border-slate-200 dark:border-white/5">
            {banners.length > 0 ? (
              <div className="absolute inset-0">
                <img 
                  referrerPolicy="no-referrer"
                  src={banners[activeBannerIdx].imageUrl} 
                  alt="Banner"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              // Empty banner fallback (Purple-Pink gradient slider)
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 flex flex-col justify-end p-5 text-slate-900 dark:text-white">
                <h3 className="font-sans font-extrabold text-base tracking-tight leading-none mb-1">Learning With NRK Banner</h3>
                <span className="text-[10px] font-mono text-pink-200">Exclusive HSE Science Lectures Portal</span>
              </div>
            )}

            {/* Slider dot controllers */}
            {banners.length > 1 && (
              <div className="absolute bottom-2.5 right-4 flex gap-1.5 z-10">
                {banners.map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => setActiveBannerIdx(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === activeBannerIdx ? "bg-white w-3" : "bg-white/40"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Subjects selection section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 id="subjects-heading" className="font-sans font-bold text-sm uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                Subjects 📚
              </h3>
              <span className="text-[10.5px] text-indigo-400 font-sans hover:underline cursor-pointer flex items-center">
                Syllabus Stream Index
                <ChevronRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>

            {/* Subject responsive display grid */}
            <div id="subjects-grid" className="grid grid-cols-2 gap-4">
              {subjects.map((sub) => {
                const config = SUBJECT_STYLING[sub] || { icon: GraduationCap, color: "text-indigo-400", bg: "from-indigo-500/10 to-indigo-500/20" };
                const Icon = config.icon;

                return (
                  <motion.button
                    key={sub}
                    id={`subject-card-${sub.toLowerCase().replace(" ", "-")}`}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (student.status === "pending" || !subState || subState.status !== "active") {
                        setShowSubUpgradeModal(true);
                      } else {
                        onSubjectSelect(sub);
                      }
                    }}
                    className={`relative overflow-hidden flex flex-col items-center justify-center text-center p-6 rounded-3xl bg-gradient-to-b ${config.bg} border border-slate-200 dark:border-slate-200 dark:border-white/5 shadow-sm hover:shadow-xl dark:hover:shadow-black/50 transition-all outline-none cursor-pointer group`}
                  >
                    <div className={`absolute -inset-2 opacity-0 group-hover:opacity-100 bg-gradient-to-tr ${config.bg} blur-xl transition-opacity duration-500`} />
                    <div className="relative w-14 h-14 rounded-2xl bg-white dark:bg-white/10 shadow-sm border border-slate-100 dark:border-slate-200 dark:border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                      <Icon className={`w-7 h-7 ${config.color} drop-shadow-md`} strokeWidth={2} />
                    </div>
                    <span className="relative font-sans font-extrabold text-[13px] text-slate-800 dark:text-white group-hover:text-slate-900 shadow-slate-900/5 dark:shadow-none transition-colors mb-1">
                      {sub}
                    </span>
                    <span className="relative font-mono text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">View notes</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>
      ) : (
        // SUBJECT PDFs FOLDER INNER INDEX
        <motion.div
          id="subject-inner-vault"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-5 pt-3 text-[#f2f2f2]"
        >
          {/* Internal Portal Directory Hero Header */}
          <div className="flex items-center gap-3">
            <button
              id="back-to-home-from-sub-btn"
              onClick={onBackToHome}
              className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer outline-none"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest">{student.class} Science</span>
                <span className="text-slate-500 font-mono text-[9px] uppercase">&bull; {selectedSubject}</span>
              </div>
              <h2 id="subject-inner-title" className="font-sans font-extrabold text-xl text-slate-900 dark:text-white leading-none">
                {selectedSubject} Notes
              </h2>
            </div>
          </div>

          {/* Search Study material files block */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 dark:text-slate-400" />
            <input 
              id="pdf-search-input"
              type="text"
              placeholder="Search PDF notes by code/title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-500/50 transition-all font-sans"
            />
          </div>

          {/* study materials list */}
          <div>
            <span className="font-mono text-[10px] tracking-wider text-slate-500 dark:text-slate-400 uppercase block mb-3.5">
              Available Files ({filteredPdfs.length})
            </span>

            {loading ? (
              <div className="text-center py-12">
                <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <span className="text-xs font-sans text-slate-600 dark:text-slate-400">Syncing digital assets...</span>
              </div>
            ) : filteredPdfs.length === 0 ? (
              <div className="text-center py-16 bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/5 rounded-2xl p-6">
                <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="font-sans text-xs font-semibold text-slate-300">No content uploaded yet</p>
                <p className="font-sans text-[11px] text-slate-500 max-w-xs mx-auto mt-1">
                  NRK administrator is currently compiling studies for this subject. PDFs automatically stream live here once published.
                </p>
              </div>
            ) : (
              <div id="subject-pdf-list" className="space-y-3.5">
                {filteredPdfs.map((pdf) => {
                  return (
                    <div 
                      key={pdf.id}
                      id={`pdf-row-${pdf.id}`}
                      className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex flex-col md:flex-row justify-between md:items-center gap-4 transition-all hover:bg-black/5 dark:bg-white/10 relative overflow-hidden"
                    >
                      <div className="flex gap-3.5 text-left">
                        <div className="w-10 h-10 shrink-0 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-orange-400" />
                        </div>
                        <div className="font-sans">
                          <h4 id={`pdf-title-${pdf.id}`} className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight mb-1 truncate max-w-[190px] sm:max-w-xs">{pdf.title}</h4>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400">
                            <span className="font-mono bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded text-indigo-400">{pdf.class} Science</span>
                            <span>&bull;</span>
                            <span className="font-mono">{new Date(pdf.uploadedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions buttons panel */}
                      <div className="flex items-center gap-2 mt-2 md:mt-0 shrink-0">
                        {/* VIEW SECURE DRM */}
                        <button
                          id={`pdf-view-btn-${pdf.id}`}
                          onClick={() => handleViewPdf(pdf)}
                          className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[10.5px] font-sans font-semibold text-indigo-300 hover:bg-indigo-500/20 transition-all cursor-pointer outline-none"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View PDF</span>
                        </button>

                        {/* DOWNLOAD FILE */}
                        <button
                          id={`pdf-download-btn-${pdf.id}`}
                          onClick={() => handleDownloadPdf(pdf)}
                          className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-[10.5px] font-sans font-semibold text-green-400 hover:bg-green-500/20 transition-all cursor-pointer outline-none"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Floating AI Button */}
      {onOpenAI && (
        <>
          {isWarping && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 150, opacity: 1 }}
              transition={{ duration: 0.7, ease: "easeIn" }}
              className="fixed bottom-[120px] right-[44px] w-4 h-4 rounded-full bg-cyan-700 z-50 origin-center pointer-events-none shadow-[0_0_100px_50px_rgba(34,211,238,1)]"
            />
          )}
          <motion.div
            className="fixed bottom-24 right-5 z-40"
          >
            <motion.button
              onClick={TriggerAIOpen}
              animate={isWarping ? { scale: 0, rotate: 180, opacity: 0 } : { scale: 1, rotate: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
              whileHover={{ scale: 1.15, filter: "drop-shadow(0 0 25px rgba(34,211,238,0.8))" }}
              whileTap={{ scale: 0.9 }}
              className="relative w-16 h-16 flex items-center justify-center flex-shrink-0 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] cursor-pointer outline-none"
            >
              <BotLogo className="w-14 h-14" />
              
              {/* Ambient Pulse Ring */}
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-[28px] border-[1.5px] border-cyan-400 pointer-events-none"
              />
            </motion.button>
          </motion.div>
        </>
      )}
    </div>
  );
}
