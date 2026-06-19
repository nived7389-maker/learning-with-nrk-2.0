import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import YouTubeLessonPlayer from "./YouTubeLessonPlayer";
import { 
  Atom, FlaskConical, Calculator, BookOpen, GraduationCap, 
  Download, Eye, AlertCircle, Sparkles, Search, 
  ArrowLeft, FileText, CheckCircle2, ChevronRight, HelpCircle,
  Cpu, Dna, BookA, Languages, PenTool, Pi, Phone, Video,
  Play, Pause, FastForward, Rewind, Maximize, Brain, Send
} from "lucide-react";
import { Student, PdfAsset, BannerAsset, Subscription } from "../types";
import { fetchBanners, fetchPDFs, listenToUserSubscription, listenAppConfig, fetchMicrobits, fetchVideos } from "../firebase";
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
  const [appConfig, setAppConfig] = useState<any>({});
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);
  const [pdfs, setPdfs] = useState<PdfAsset[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [subState, setSubState] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isWarping, setIsWarping] = useState(false);
  
  // Modal controllers
  const [showSubUpgradeModal, setShowSubUpgradeModal] = useState(false);
  const [viewingPdf, setViewingPdf] = useState<PdfAsset | null>(null);
  const [viewingVideo, setViewingVideo] = useState<any | null>(null);
  const [isClosingVideo, setIsClosingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Embedded video doubt chat states
  const [videoChatMessages, setVideoChatMessages] = useState<{ role: "user" | "model"; text: string }[]>([]);
  const [videoChatInput, setVideoChatInput] = useState("");
  const [isVideoChatSending, setIsVideoChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize and auto-scrolled chat whenever viewingVideo changes
  useEffect(() => {
    if (viewingVideo) {
      setVideoChatMessages([
        {
          role: "model",
          text: `Hi **${student.name ? student.name.split(" ")[0] : "Student"}**! I am **Astr AI**, your personal doubt clearance assistant. \n\nI have the full context of **"${viewingVideo.title}"** (${viewingVideo.subject || ""}). \n\nWhat would you like to ask or clarify from this class? Press any of the helpers below or write your doubts in Malayalam/English! 👇`
        }
      ]);
      setVideoChatInput("");
      setIsVideoChatSending(false);

      // Force scroll to top so the video player starts at the top of the view
      window.scrollTo({ top: 0, behavior: "instant" as any });
      const mainScroll = document.querySelector("main");
      if (mainScroll) {
        mainScroll.scrollTo({ top: 0, behavior: "instant" as any });
      }
      const vaultScroll = document.getElementById("subject-inner-vault");
      if (vaultScroll) {
        vaultScroll.scrollTo({ top: 0, behavior: "instant" as any });
      }
    } else {
      setVideoChatMessages([]);
    }
  }, [viewingVideo, student.name]);

  // Scroll to bottom when new message arrives (only when there are interactive user/model turns)
  useEffect(() => {
    if (videoChatMessages.length > 1) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [videoChatMessages]);

  const sendVideoChatDoubt = async (textToSend: string) => {
    if (!textToSend.trim() || isVideoChatSending) return;

    const userMsg = { role: "user" as const, text: textToSend.trim() };
    const updatedMessages = [...videoChatMessages, userMsg];
    setVideoChatMessages(updatedMessages);
    setVideoChatInput("");
    setIsVideoChatSending(true);

    try {
      const payload = {
        prompt: `The user is watching the Kerala Board syllabus video lesson:\nVideo Title: "${viewingVideo?.title || ''}"\nSubject: "${viewingVideo?.subject || ''}"\nChapter: "${viewingVideo?.chapter || ''}"\nPart: "${viewingVideo?.part || ''}"\n\nUser Question: ${textToSend.trim()}`,
        history: videoChatMessages.map(m => ({ role: m.role, text: m.text }))
      };

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Unable to contact doubt solver.");
      }

      const data = await response.json();
      setVideoChatMessages([...updatedMessages, { role: "model", text: data.text }]);
    } catch (e: any) {
      console.error(e);
      setVideoChatMessages([...updatedMessages, { 
        role: "model", 
        text: "Could not fetch dynamic hint from Astr AI. Please click submit again." 
      }]);
    } finally {
      setIsVideoChatSending(false);
    }
  };

  // If subject is deselected from outside, reset chapter
  useEffect(() => {
    if (!selectedSubject) {
      setSelectedChapter(null);
    }
  }, [selectedSubject]);

  // Load subscriptions & banners
  useEffect(() => {
    async function loadData() {
      const bannerList = await fetchBanners();
      setBanners(bannerList);
    }
    loadData();
    
    const unsubConfig = listenAppConfig((config) => {
      setAppConfig(config);
    });
    
    const unsubscribe = listenToUserSubscription(student.uid, (sub) => {
      setSubState(sub);
    });

    return () => {
      unsubscribe();
      unsubConfig();
    };
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


  // Load subject Videos when subject changes
  useEffect(() => {
    if (selectedSubject && student.class && student.stream) {
      setLoading(true);
      if (selectedSubject.startsWith("Microbit - ")) {
        fetchMicrobits(student.class, student.stream, selectedSubject).then((mbits) => {
          setPdfs(mbits);
          setLoading(false);
        }).catch(() => {
          setPdfs([]);
          setLoading(false);
        });
      } else {
        fetchVideos(student.class, student.stream, selectedSubject).then((vids) => {
          setVideos(vids);
          setLoading(false);
        }).catch(() => {
          setVideos([]);
          setLoading(false);
        });
      }
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
  const handleDownloadPdf = async (pdf: any) => {
    if (student.status === "pending" || !subState || subState.status !== "active") {
      setShowSubUpgradeModal(true);
      return;
    }
    
    const targetUrl = pdf.pdfUrl || pdf.fileUrl;
    try {
      const response = await fetch(targetUrl);
      const blob = await response.blob();
      const blobURL = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobURL;
      link.download = pdf.fileName || `${pdf.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobURL);
    } catch (e) {
      console.error("Download failed, opening in new tab instead", e);
      window.open(targetUrl, "_blank");
    }
  };

  // Filtered PDFs list
  const filteredPdfs = pdfs.filter(pdf => 
    pdf.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pdf.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper to extract clean URL if user pastes an iframe or weird format
  const getCleanVideoUrl = (rawUrl: string) => {
    if (!rawUrl) return "";
    let url = rawUrl.trim();
    // Extract src if it's an iframe snippet
    if (url.includes("<iframe") && url.includes("src=")) {
      const match = url.match(/src=["']([^"']+)["']/);
      if (match && match[1]) {
        url = match[1];
      }
    }
    return url;
  };

  const currentVideoUrl = viewingVideo ? getCleanVideoUrl(viewingVideo.videoUrl || viewingVideo.link) : "";

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
                    const message = `want a subscription`;
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
                  src={`${(viewingPdf as any).pdfUrl || (viewingPdf as any).fileUrl}#toolbar=0`}
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
        <div id="student-dashboard" className="space-y-6 pt-4 relative">
          {/* Header area */}
          <motion.div 
            initial={{ opacity: 0, y: 15, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0 }}
            className="flex justify-between items-center bg-black/5 dark:bg-white/5 p-4 rounded-3xl border border-slate-200 dark:border-white/5 shadow"
          >
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
          </motion.div>

          {/* Dynamic Slider Banner Managed by Admin */}
          <motion.div 
            initial={{ opacity: 0, y: 15, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            id="dynamic-banners-slider" 
            className="relative w-full rounded-2xl aspect-[2.1/1] overflow-hidden bg-slate-850 shadow-lg border border-slate-200 dark:border-white/5"
          >
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
          </motion.div>

          {/* Subjects selection section */}
          <motion.div
            initial={{ opacity: 0, y: 15, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
          >
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
            <div id="subjects-grid" className="grid grid-cols-2 gap-10 py-6">
              {subjects.map((sub) => {
                const config = SUBJECT_STYLING[sub] || { icon: GraduationCap, color: "text-indigo-400", bg: "from-indigo-500/10 to-indigo-500/20" };
                const Icon = config.icon;
                const customIconUrl = appConfig?.subjectIcons?.[sub];

                return (
                    <motion.button
                    key={sub}
                    id={`subject-card-${sub.toLowerCase().replace(" ", "-")}`}
                    initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.5, delay: 0.3 + (subjects.indexOf(sub) * 0.05) }}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (student.status === "pending" || !subState || subState.status !== "active") {
                        setShowSubUpgradeModal(true);
                      } else {
                        onSubjectSelect(sub);
                      }
                    }}
                    className="relative flex items-center justify-center outline-none cursor-pointer group"
                  >
                    <div className="relative flex flex-col items-center justify-center transition-transform duration-500 overflow-hidden">
                      {customIconUrl ? (
                         <img referrerPolicy="no-referrer" src={customIconUrl} alt={sub} className="w-32 h-32 object-contain drop-shadow-md group-hover:drop-shadow-xl transition-all" />
                      ) : (
                         <Icon className={`w-32 h-32 ${config.color} drop-shadow-md group-hover:drop-shadow-xl transition-all`} strokeWidth={1.5} />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>
      ) : (
        // SUBJECT PDFs FOLDER INNER INDEX
        <motion.div
          id="subject-inner-vault"
          initial={{ opacity: 0, scale: 0.98, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="space-y-5 pt-3 text-slate-800 dark:text-[#f2f2f2]"
        >
          {viewingVideo ? (
            <div className="space-y-6">
              {/* Back Button to get out of currently playing video and return to parts list */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setIsClosingVideo(true);
                    setTimeout(() => {
                      setIsClosingVideo(false);
                      setViewingVideo(null);
                      setVideoError(null);
                    }, 100);
                  }}
                  className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer outline-none"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 id="video-lesson-title" className="font-sans font-extrabold text-lg text-slate-900 dark:text-white leading-none">
                    Now Studying: {viewingVideo.title}
                  </h2>
                </div>
              </div>

              {/* 1. Video Player at the Top */}
              <div className="w-full bg-black rounded-3xl overflow-hidden shadow-2xl relative" id="video-player-container-integrated">
                <div className="aspect-video relative group bg-black/90">
                  <YouTubeLessonPlayer 
                    videoUrl={currentVideoUrl}
                    lessonId={selectedSubject || 'unknown-subject'}
                    chapterId={selectedChapter || 'unknown-chapter'}
                    isClosing={isClosingVideo}
                  />
                </div>
              </div>

              {/* 2. Video Info Card */}
              <div className="bg-white/70 dark:bg-slate-900/80 border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-xl">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10.5px] font-bold text-indigo-600 dark:text-indigo-400">
                    Part {viewingVideo.part || 1}
                  </span>
                </div>
                <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white tracking-tight leading-snug">{viewingVideo.title}</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Now playing dynamic video session. Scroll down further to ask doubts, summarize content, or practice exam questions directly with <strong>Astr AI Doubt Clarification</strong> below.
                </p>
              </div>

              {/* 3. Divider scroll indicator */}
              <div className="flex items-center justify-center py-2 text-slate-500 gap-2">
                <div className="h-[1px] bg-slate-200 dark:bg-white/5 flex-1" />
                <span className="text-[10px] font-mono tracking-widest uppercase text-slate-550 dark:text-slate-400">⬇️ Scroll down for AI Doubt Clearance</span>
                <div className="h-[1px] bg-slate-200 dark:bg-white/5 flex-1" />
              </div>

              {/* 4. Scroll Down to Doubts AI Box */}
              <div className="w-full flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl h-[480px] overflow-hidden shadow-2xl relative">
                {/* Chat Header */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-cyan-550 dark:text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="font-sans font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        Ask Question with AI
                      </h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Two-in-One Live Doubt Clearance</p>
                    </div>
                  </div>
                  <span className="bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 border border-cyan-500/20 text-[9px] px-2 py-0.5 rounded-full font-mono">
                    ONLINE
                  </span>
                </div>

                {/* Messages Panel */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {videoChatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl p-3.5 ${msg.role === 'user' ? 'bg-cyan-500/10 border border-cyan-500/20 text-slate-800 dark:text-cyan-53 rounded-tr-sm' : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 rounded-tl-sm'}`}>
                        {msg.role === 'model' && (
                          <div className="flex items-center gap-1.5 mb-1.5 border-b border-slate-200 dark:border-white/5 pb-1.5">
                            <BotLogo className="w-4 h-4 text-cyan-550 dark:text-cyan-400" />
                            <span className="text-[10px] font-bold text-cyan-500 dark:text-cyan-400 uppercase tracking-wider">ASTR AI</span>
                          </div>
                        )}
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                  {isVideoChatSending && (
                    <div className="flex justify-start">
                      <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl rounded-tl-sm p-3 w-14 flex items-center justify-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Suggestions Grid */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-white/5 space-y-1.5 select-none shrink-0">
                  <p className="text-[9px] text-slate-550 dark:text-slate-300 font-bold uppercase tracking-wider mb-1 px-1">Quick Helper Prompts:</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button 
                      onClick={() => sendVideoChatDoubt("Can you explain this topic in simple terms?")}
                      className="text-left p-2 rounded-lg bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-[10px] text-slate-655 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors border border-slate-200 dark:border-white/5 truncate cursor-pointer shadow-sm"
                    >
                      💡 Simple Explanation
                    </button>
                    <button 
                      onClick={() => sendVideoChatDoubt("Malayalam-il clear aayi paranju tharaamo?")}
                      className="text-left p-2 rounded-lg bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-[10px] text-slate-655 dark:text-slate-300 hover:text-slate-955 dark:hover:text-white transition-colors border border-slate-200 dark:border-white/5 truncate cursor-pointer shadow-sm"
                    >
                      🗣️ Explain in Malayalam
                    </button>
                    <button 
                      onClick={() => sendVideoChatDoubt("What are the most important formulas and points to remember?")}
                      className="text-left p-2 rounded-lg bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-[10px] text-slate-655 dark:text-slate-300 hover:text-slate-955 dark:hover:text-white transition-colors border border-slate-200 dark:border-white/5 truncate cursor-pointer shadow-sm"
                    >
                      📝 Key Exam Points
                    </button>
                    <button 
                      onClick={() => sendVideoChatDoubt("Generate 3 multiple choice questions for practice on this lesson with answer keys.")}
                      className="text-left p-2 rounded-lg bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-[10px] text-slate-655 dark:text-slate-300 hover:text-slate-955 dark:hover:text-white transition-colors border border-slate-200 dark:border-white/5 truncate cursor-pointer shadow-sm"
                    >
                      ✍️ Practice Questions
                    </button>
                  </div>
                </div>

                {/* Input Area */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendVideoChatDoubt(videoChatInput);
                  }}
                  className="p-3 bg-slate-50/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-white/5 flex gap-2 items-center text-slate-900 dark:text-white"
                >
                  <input 
                    type="text"
                    value={videoChatInput}
                    onChange={(e) => setVideoChatInput(e.target.value)}
                    placeholder="Ask doubts about this lesson..."
                    className="flex-1 h-9 bg-white dark:bg-white/10 border border-slate-250 dark:border-white/10 rounded-xl px-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all focus:border-cyan-500 animate-none"
                  />
                  <button 
                    type="submit"
                    disabled={isVideoChatSending || !videoChatInput.trim()}
                    className="w-9 h-9 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 flex items-center justify-center text-slate-950 transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <>
              {/* Internal Portal Directory Hero Header */}
              <div className="flex items-center gap-3">
                <button
                  id="back-to-home-from-sub-btn"
                  onClick={() => {
                    if (selectedChapter) {
                      setSelectedChapter(null);
                    } else {
                      onBackToHome();
                    }
                  }}
                  className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer outline-none"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 id="subject-inner-title" className="font-sans font-extrabold text-xl text-slate-900 dark:text-white leading-none">
                    {selectedChapter ? selectedChapter : (selectedSubject.startsWith("Microbit") ? selectedSubject : `${selectedSubject} Chapters`)}
                  </h2>
                </div>
              </div>

          {/* Search block */}
          {(!selectedSubject.startsWith("Microbit") && !selectedChapter) ? (
            <div className="relative">
               <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 dark:text-slate-400" />
               <input 
                 type="text"
                 placeholder="Search chapters..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full h-11 pl-10 pr-4 rounded-xl bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-500/50 transition-all font-sans"
               />
             </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 dark:text-slate-400" />
              <input 
                id="pdf-search-input"
                type="text"
                placeholder={selectedSubject.startsWith("Microbit") ? "Search materials by title..." : "Search videos in chapter..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-500/50 transition-all font-sans"
              />
            </div>
          )}

          {/* Content Views */}
          {selectedSubject.startsWith("Microbit") ? (
             <div>
                <span className="font-mono text-[10px] tracking-wider text-slate-500 dark:text-slate-400 uppercase block mb-3.5">
                  Available Materials ({filteredPdfs.length})
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
                       Administrator is currently compiling materials for this subject.
                    </p>
                  </div>
                ) : (
                  <div id="subject-pdf-list" className="space-y-3.5">
                    {filteredPdfs.map((pdf) => (
                        <div 
                          key={pdf.id}
                          className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex flex-col md:flex-row justify-between md:items-center gap-4 transition-all hover:bg-black/5 dark:bg-white/10 relative overflow-hidden"
                        >
                          <div className="flex gap-3.5 text-left">
                            <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-violet-500/10 border border-violet-500/20">
                              <FileText className="w-5 h-5 text-violet-400" />
                            </div>
                            <div className="font-sans">
                              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight mb-1 truncate max-w-[190px] sm:max-w-xs">{pdf.title}</h4>
                              <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400">
                                <span className="font-mono bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded text-indigo-400">{pdf.class} Science</span>
                                <span>&bull;</span>
                                <span className="font-mono">{new Date(pdf.uploadedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2 md:mt-0 shrink-0">
                            <button
                              onClick={() => handleViewPdf(pdf)}
                              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[10.5px] font-sans font-semibold text-indigo-300 hover:bg-indigo-500/20 transition-all cursor-pointer outline-none"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                            <button
                              onClick={() => handleDownloadPdf(pdf)}
                              className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:bg-black/5 dark:bg-white/10 flex flex-col items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer outline-none shrink-0"
                              title="Download Secure PDF Offline"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                    ))}
                  </div>
                )}
             </div>
          ) : (
             <div>
                {/* Regular video handling */}
                {!selectedChapter ? (
                  <div>
                    {/* Chapter list view */}
                    {loading ? (
                      <div className="text-center py-12">
                        <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <span className="text-xs font-sans text-slate-600 dark:text-slate-400">Loading chapters...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Array.from(new Set(videos.map(v => v.chapter)))
                           .filter(ch => ch.toLowerCase().includes(searchQuery.toLowerCase()))
                           .map(chapter => {
                             const chapterVideos = videos.filter(v => v.chapter === chapter);
                             return (
                               <button
                                 key={chapter}
                                 onClick={() => setSelectedChapter(chapter)}
                                 className="text-left p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:bg-black/5 dark:bg-white/10 transition-all group outline-none"
                               >
                                 <div className="flex gap-3.5 items-center">
                                   <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-rose-500/10 border border-rose-500/20">
                                     <Play className="w-5 h-5 text-rose-400 ml-0.5 group-hover:scale-110 transition-transform" />
                                   </div>
                                   <div>
                                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight mb-1">{chapter}</h4>
                                      <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">{chapterVideos.length} Parts Available</span>
                                   </div>
                                 </div>
                               </button>
                             )
                           })
                        }
                        {videos.length === 0 && (
                          <div className="col-span-1 md:col-span-2 text-center py-16 bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/5 rounded-2xl p-6">
                            <Video className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                            <p className="font-sans text-xs font-semibold text-slate-300">No chapters mapped</p>
                            <p className="font-sans text-[11px] text-slate-500 max-w-xs mx-auto mt-1">
                               Administrator is currently compiling sections.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {/* Specific chapter view */}
                    <div className="space-y-3.5">
                      {videos
                        .filter(v => v.chapter === selectedChapter && v.title.toLowerCase().includes(searchQuery.toLowerCase()))
                        .sort((a, b) => a.part - b.part)
                        .map(video => (
                          <div 
                            key={video.id}
                            className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex flex-col md:flex-row justify-between md:items-center gap-4 transition-all hover:bg-black/5 dark:bg-white/10 relative overflow-hidden"
                          >
                            <div className="flex gap-3.5 text-left">
                              <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-rose-500/10 border border-rose-500/20">
                                <Video className="w-5 h-5 text-rose-400" />
                              </div>
                              <div className="font-sans">
                                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight mb-1 truncate max-w-[190px] sm:max-w-xs">{video.title}</h4>
                                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400">
                                  <span className="font-mono bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded text-rose-400">Part {video.part}</span>
                                  <span>&bull;</span>
                                  <span className="font-mono">{new Date(video.uploadedAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2 md:mt-0 shrink-0">
                              <button
                                onClick={() => {
                                  if (student.status === "pending" || !subState || subState.status !== "active") {
                                    setShowSubUpgradeModal(true);
                                    return;
                                  }
                                  setViewingVideo(video);
                                  setVideoError(null);
                                }}
                                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[10.5px] font-sans font-semibold text-rose-300 hover:bg-rose-500/20 transition-all cursor-pointer outline-none"
                              >
                                <Play className="w-3.5 h-3.5" />
                                <span>Watch Video</span>
                              </button>
                            </div>
                          </div>
                      ))}
                    </div>
                  </div>
                )}
             </div>
          )}
            </>
          )}
        </motion.div>
      )}

      {/* Floating AI Button */}
      {onOpenAI && (!selectedSubject || !selectedSubject.startsWith("Microbit")) && (
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
