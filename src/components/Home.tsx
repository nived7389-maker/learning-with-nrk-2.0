import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import YouTubeLessonPlayer from "./YouTubeLessonPlayer";
import { 
  Atom, FlaskConical, Calculator, BookOpen, GraduationCap, 
  Download, Eye, AlertCircle, Sparkles, Search, 
  ArrowLeft, FileText, CheckCircle2, ChevronRight, HelpCircle,
  Cpu, Dna, BookA, Languages, PenTool, Pi, Phone, Video,
  Play, Pause, FastForward, Rewind, Maximize, Brain, Send, ExternalLink,
  Coins, Award, Zap, RotateCcw, Check, X, Lock
} from "lucide-react";
import { Student, PdfAsset, BannerAsset, Subscription } from "../types";
import { fetchBanners, fetchPDFs, listenToUserSubscription, listenAppConfig, fetchMicrobits, fetchVideos, submitLessonFeedback, saveStudentPerformance } from "../firebase";
import { BotLogo } from "./BotLogo";

interface HomeProps {
  student: Student;
  onSubjectSelect: (subject: string) => void;
  selectedSubject: string | null;
  onBackToHome: () => void;
  onOpenAI?: () => void;
  showSuperCoinPage?: boolean;
  onCloseSuperCoinPage?: () => void;
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

export default function Home({
  student,
  selectedSubject,
  onSubjectSelect,
  onBackToHome,
  onOpenAI,
  showSuperCoinPage: showSuperCoinPageProp,
  onCloseSuperCoinPage
}: HomeProps) {
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

  // Super Coin & Exam execution states
  const [showSuperCoinPage, setShowSuperCoinPage] = useState(false);
  const [showExamOfferModal, setShowExamOfferModal] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [isGeneratingExam, setIsGeneratingExam] = useState(false);
  const [examQuestions, setExamQuestions] = useState<Array<{
    question: string;
    options: string[];
    correctIndex: number;
  }>>([]);
  const [examStep, setExamStep] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submittedSteps, setSubmittedSteps] = useState<Record<number, boolean>>({});
  const [examFinished, setExamFinished] = useState(false);
  const [examScore, setExamScore] = useState(0);

  // Embedded video doubt chat states
  const [videoChatMessages, setVideoChatMessages] = useState<{ role: "user" | "model"; text: string }[]>([]);
  const [videoChatInput, setVideoChatInput] = useState("");
  const [isVideoChatSending, setIsVideoChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // AI Block state
  const [isAIBlocked, setIsAIBlocked] = useState(false);
  const [aiBlockedTimeRemaining, setAiBlockedTimeRemaining] = useState(0);
  const [aiBlockReason, setAiBlockReason] = useState("");

  useEffect(() => {
    if (showSuperCoinPageProp !== undefined) {
      setShowSuperCoinPage(showSuperCoinPageProp);
    }
  }, [showSuperCoinPageProp]);

  useEffect(() => {
    const checkBlockStatus = () => {
      const blockedUntil = localStorage.getItem(`ai_blocked_until_${student.uid}`);
      const reason = localStorage.getItem(`ai_blocked_reason_${student.uid}`) || "Questions from outside the lesson are not allowed.";
      if (blockedUntil) {
        const remaining = Math.ceil((Number(blockedUntil) - Date.now()) / 1000);
        if (remaining > 0) {
          setIsAIBlocked(true);
          setAiBlockedTimeRemaining(remaining);
          setAiBlockReason(reason);
          return;
        }
      }
      setIsAIBlocked(false);
      setAiBlockedTimeRemaining(0);
    };

    checkBlockStatus();
    const interval = setInterval(checkBlockStatus, 1000);
    return () => clearInterval(interval);
  }, [student.uid]);

  const triggerAIBlock = (reason: string) => {
    const blockUntil = Date.now() + 5 * 60 * 1000;
    localStorage.setItem(`ai_blocked_until_${student.uid}`, blockUntil.toString());
    localStorage.setItem(`ai_blocked_reason_${student.uid}`, reason);
    setIsAIBlocked(true);
    setAiBlockedTimeRemaining(300);
    setAiBlockReason(reason);
  };

  const checkLocalInappropriatePrompt = (promptText: string): string | null => {
    const cleanPrompt = promptText.toLowerCase();
    const badWords = [
      "sex", "porn", "naked", "rape", "sexual abuse", "child abuse", "intercourse", 
      "penis", "vagina", "boobs", "breasts", "erotic", "nudity", "blowjob", "fuck", 
      "xxx", "18+", "18plus", "adult content", "clitoris", "orgasm"
    ];

    for (const word of badWords) {
      if (cleanPrompt.includes(word)) {
        return "Based on sexual abuse or 18-plus content questions. Access is blocked.";
      }
    }
    return null;
  };

  // Lesson Feedback and Rating States
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedEmojiRating, setSelectedEmojiRating] = useState<"Bad" | "Average" | "Good" | "Superb" | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [lessonRating, setLessonRating] = useState<any>(null);

  // Load rating for the current video lesson if they already rated it in the past
  useEffect(() => {
    if (viewingVideo) {
      const saved = localStorage.getItem(`rating_${student.uid}_${viewingVideo.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setLessonRating(parsed);
          setSelectedEmojiRating(parsed.rating);
          setFeedbackText(parsed.feedbackText || "");
        } catch (e) {
          setLessonRating(null);
          setSelectedEmojiRating(null);
          setFeedbackText("");
        }
      } else {
        setLessonRating(null);
        setSelectedEmojiRating(null);
        setFeedbackText("");
      }
      setRatingSubmitted(false);
    }
  }, [viewingVideo, student.uid]);

  const handleRatingSubmit = async () => {
    if (!selectedEmojiRating || !viewingVideo) return;
    setIsSubmittingFeedback(true);
    
    const emojiMap = {
      Bad: "😞",
      Average: "😐",
      Good: "🙂",
      Superb: "🤩"
    };

    const ratingData = {
      studentId: student.uid,
      studentName: student.name || "Anonymous",
      studentPhone: student.phone || "",
      subjectId: selectedSubject || viewingVideo.subject || "Unknown",
      lessonId: viewingVideo.id,
      lessonTitle: viewingVideo.title || "Unknown Title",
      rating: selectedEmojiRating,
      emoji: emojiMap[selectedEmojiRating],
      feedbackText: feedbackText.trim()
    };

    try {
      await submitLessonFeedback(ratingData);
      
      // Save locally
      localStorage.setItem(`rating_${student.uid}_${viewingVideo.id}`, JSON.stringify(ratingData));
      
      setLessonRating(ratingData);
      setRatingSubmitted(true);
    } catch (e) {
      console.error("Error submitting lesson feedback:", e);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

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
    if (isAIBlocked) return;
    if (!textToSend.trim() || isVideoChatSending) return;

    // Local pre-block check
    const localInappropriate = checkLocalInappropriatePrompt(textToSend);
    if (localInappropriate) {
      const userMsg = { role: "user" as const, text: textToSend.trim() };
      const blockedMsgs = [
        ...videoChatMessages,
        userMsg,
        { role: "model" as const, text: `⚠️ CHAT SUSPENDED\nReason: ${localInappropriate}\nYour access to ASTR AI doubt solver is blocked for 5 minutes.` }
      ];
      setVideoChatMessages(blockedMsgs);
      setVideoChatInput("");
      triggerAIBlock(localInappropriate);
      return;
    }

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

      const endpoint = (import.meta as any).env?.PROD 
        ? "/.netlify/functions/chat" 
        : "/api/gemini/chat";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Unable to contact doubt solver.");
      }

      const data = await response.json();
      const responseText = data.text || "";

      if (responseText.includes("[VIOLATION: INAPPROPRIATE]")) {
        const violationReason = "Based on sexual abuse or 18-plus content questions. Inappropriate content is strictly prohibited.";
        setVideoChatMessages([...updatedMessages, { role: "model" as const, text: `⚠️ ACCESS BLOCKED: INAPPROPRIATE CONTENT\nReason: ${violationReason}\nYour access to ASTR AI is suspended for 5 minutes.` }]);
        triggerAIBlock(violationReason);
        return;
      }
      if (responseText.includes("[VIOLATION: OUTSIDE_LESSON]")) {
        const violationReason = "Questions from outside the lesson are not allowed. Off-topic questions are restricted.";
        setVideoChatMessages([...updatedMessages, { role: "model" as const, text: `⚠️ ACCESS BLOCKED: OUT-OF-LESSON\nReason: ${violationReason}\nYour access to ASTR AI is suspended for 5 minutes.` }]);
        triggerAIBlock(violationReason);
        return;
      }

      setVideoChatMessages([...updatedMessages, { role: "model", text: responseText }]);
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
    
    // Check for subscription bypass
    const bypass = appConfig?.bypassSubscriptionGates === true;
    const isSubscribed = subState?.status === "active";
    const isPendingOrBlocked = student.status === "pending" || student.status === "blocked";

    if ((isPendingOrBlocked || !isSubscribed) && !bypass) {
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
    const bypass = appConfig?.bypassSubscriptionGates === true;
    const isSubscribed = subState?.status === "active";
    if ((student.status === "pending" || !isSubscribed) && !bypass) {
      setShowSubUpgradeModal(true);
      return;
    }
    setViewingPdf(pdf);
  };

  // Handle PDF download
  const handleDownloadPdf = async (pdf: any) => {
    const bypass = appConfig?.bypassSubscriptionGates === true;
    const isSubscribed = subState?.status === "active";
    if ((student.status === "pending" || !isSubscribed) && !bypass) {
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

  // Dynamic Fallback MCQ Builder
  const generateFallbackQuestions = (title: string, subject: string) => {
    const subLower = (subject || "").toLowerCase();
    
    if (subLower.includes("physics")) {
      return [
        { question: `Which of the following principles is most likely associated with the topics in "${title}"?`, options: ["Newton's Laws of Motion", "Coulomb's Law of Electrostatics", "Faraday's Law of Induction", "All of the above"], correctIndex: 3 },
        { question: "What is the SI unit of Force which is fundamental in Physics?", options: ["Pascal", "Joule", "Newton", "Watt"], correctIndex: 2 },
        { question: "In mechanics, what represents the rate of change of momentum of a body?", options: ["Acceleration", "Velocity", "Applied Force", "Torque"], correctIndex: 2 },
        { question: "What is the value of acceleration due to gravity on the surface of the Earth?", options: ["9.8 m/s²", "8.9 m/s²", "10.5 m/s²", "7.2 m/s²"], correctIndex: 0 },
        { question: "Which form of energy is possessed by a body due to its position or height?", options: ["Kinetic Energy", "Potential Energy", "Thermal Energy", "Chemical Energy"], correctIndex: 1 },
        { question: "According to Newton's Third Law, actions and reactions are always:", options: ["Equal in magnitude and direction", "Equal in magnitude but opposite in direction", "Unequal and parallel", "Zero at all points"], correctIndex: 1 }
      ];
    } else if (subLower.includes("chemistry")) {
      return [
        { question: `In reference to "${title}", modern chemical classifications organize matter into:`, options: ["Solids only", "Gases and Liquids", "Elements, Compounds, and Mixtures", "Pure energies"], correctIndex: 2 },
        { question: "What is the atomic number of Carbon, the building block of organic chemistry?", options: ["4", "6", "8", "12"], correctIndex: 1 },
        { question: "Which type of chemical bond involves the sharing of electron pairs between atoms?", options: ["Ionic bond", "Covalent bond", "Metallic bond", "Hydrogen bond"], correctIndex: 1 },
        { question: "What is the pH value of pure water at room temperature?", options: ["5", "7", "9", "12"], correctIndex: 1 },
        { question: "Which of the following gases is produced during standard acid-metal reactions?", options: ["Carbon Dioxide", "Hydrogen gas", "Oxygen gas", "Nitrogen"], correctIndex: 1 },
        { question: "The substance which speeds up a chemical reaction without being consumed is called a:", options: ["Reactant", "Solvent", "Catalyst", "Inhibitor"], correctIndex: 2 }
      ];
    } else if (subLower.includes("math")) {
      return [
        { question: `Mathematical relations in "${title}" utilize modern equations. What is the value of sin(π/2)?`, options: ["0", "0.5", "1", "-1"], correctIndex: 2 },
        { question: "What is the derivative of x² with respect to x?", options: ["x", "2x", "x³ / 3", "2x + C"], correctIndex: 1 },
        { question: "Which term refers to a matrix having equal number of rows and columns?", options: ["Row matrix", "Column matrix", "Square matrix", "Identity matrix"], correctIndex: 2 },
        { question: "The sum of angles of a triangle under planar Euclidean geometry is:", options: ["90 degrees", "180 degrees", "360 degrees", "270 degrees"], correctIndex: 1 },
        { question: "What is the arithmetic mean of numbers 5, 10, and 15?", options: ["5", "10", "15", "8"], correctIndex: 1 },
        { question: "The value of Euler's number 'e' is approximately equal to:", options: ["1.414", "2.718", "3.141", "1.618"], correctIndex: 1 }
      ];
    } else {
      return [
        { question: `Which core subject concept from "${title}" represents the primary takeaway?`, options: ["Introductory definitions and foundations", "Advanced calculations and formula derivations", "Syllabus exam guides and textbook reviews", "None of the above"], correctIndex: 0 },
        { question: "Which state is represented by the syllabus for the tuitions discussed here?", options: ["Tamil Nadu Syllabus", "Kerala State Syllabus", "Karnataka Syllabus", "National CBSE Syllabus"], correctIndex: 1 },
        { question: "To master any high-school science topic, students should prioritize:", options: ["Rote memorization", "Concept understanding and mock trials", "Leaving complex chapters blank", "Watching reviews only"], correctIndex: 1 },
        { question: "How many questions are generated in this AI active lesson evaluation?", options: ["3 questions", "6 questions", "10 questions", "15 questions"], correctIndex: 1 },
        { question: "Who powers the AI Assistant integrated in this tuition platform?", options: ["Learning with NRK", "OpenAI Chatbots", "General Public models", "Kerala Board Team"], correctIndex: 0 },
        { question: "What is the recommended habit to score top marks in board exams?", options: ["Regular revision and answering doubts via AI", "Cramming the night before", "Skipping parts", "Muting lectures"], correctIndex: 0 }
      ];
    }
  };

  // Generate Questions via DeepSeek api proxy
  const generateQuestions = async () => {
    if (!viewingVideo) return;
    setIsGeneratingExam(true);
    setShowExamModal(true);
    setExamStep(0);
    setSelectedAnswers({});
    setSubmittedSteps({});
    setExamFinished(false);
    setExamScore(0);

    const promptText = `You are ASTR AI, an educational exam generator. Generate exactly 6 multiple choice questions for a high-school student exam based on this video: "${viewingVideo.title}" in Subject "${viewingVideo.subject || selectedSubject || 'General'}", Chapter "${viewingVideo.chapter || ''}". 
The target class syllabus is Kerala State Syllabus (Class: ${student.class || '+2'}, Stream: ${student.stream || 'Science'}).
Your response MUST be a valid JSON array of exactly 6 question objects conforming strictly to the syntax below. Keep options concise and accurate. Do NOT output any other text, explanations, or enclosing codeblock wraps (like \`\`\`json):
[
  {
    "question": "What is the primary concept explained here?",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correctIndex": 0
  }
]`;

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: promptText,
          history: []
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate questions from server");
      }

      const data = await response.json();
      let rawText = (data.text || "").trim();

      // Clean markdown code blocks from model response
      if (rawText.startsWith("```")) {
        const firstNewLineIdx = rawText.indexOf("\n");
        if (firstNewLineIdx !== -1) {
          rawText = rawText.substring(firstNewLineIdx).trim();
        }
        if (rawText.endsWith("```")) {
          rawText = rawText.substring(0, rawText.length - 3).trim();
        }
        if (rawText.startsWith("json")) {
          rawText = rawText.substring(4).trim();
        }
      }

      const parsed = JSON.parse(rawText);
      if (Array.isArray(parsed) && parsed.length === 6) {
        const validated = parsed.map((item: any) => {
          const opt = Array.isArray(item.options) ? item.options : ["Option A", "Option B", "Option C", "Option D"];
          return {
            question: String(item.question || "Topic lesson question"),
            options: opt.slice(0, 4).map(String),
            correctIndex: typeof item.correctIndex === "number" && item.correctIndex >= 0 && item.correctIndex < 4 ? item.correctIndex : (typeof item.answerIndex === "number" ? item.answerIndex : 0)
          };
        });
        setExamQuestions(validated);
      } else {
        throw new Error("Invalid array structure from AI response");
      }
    } catch (err) {
      console.warn("AI generation failed/timed-out, loading fallback quiz questions safely:", err);
      const fallback = generateFallbackQuestions(viewingVideo.title, viewingVideo.subject || selectedSubject || "");
      setExamQuestions(fallback);
    } finally {
      setIsGeneratingExam(false);
    }
  };

  // Video track completion callback
  const handleVideoWatchingFinished = async () => {
    if (!viewingVideo) return;
    
    const performanceLog = student.performance || [];
    const hasAlreadyAttended = performanceLog.some(p => p.videoId === viewingVideo.id && p.examAttended);

    if (hasAlreadyAttended) {
      // The video exam is attended only once. When we watch the video again, the exam option was not come.
      return;
    }

    const hasAlreadyWatched = performanceLog.some(p => p.videoId === viewingVideo.id && p.watchedFully);

    if (hasAlreadyWatched) {
      // Just open exam direct offer modal, no new watch coins awarded to prevent farm duplicates
      setShowExamOfferModal(true);
      return;
    }

    const currentCoins = student.superCoins || 0;
    const existingIdx = performanceLog.findIndex(p => p.videoId === viewingVideo.id);
    let updatedPerformance = [...performanceLog];

    let coinsToAdd = 0;
    if (existingIdx !== -1) {
      if (!updatedPerformance[existingIdx].watchedFully) {
        updatedPerformance[existingIdx].watchedFully = true;
        updatedPerformance[existingIdx].completedAt = new Date().toISOString();
        coinsToAdd = 1;
      }
    } else {
      updatedPerformance.push({
        videoId: viewingVideo.id,
        videoTitle: viewingVideo.title || "Lesson Lecture",
        subject: viewingVideo.subject || selectedSubject || "General Science",
        watchedFully: true,
        marks: 0,
        totalQuestions: 6,
        completedAt: new Date().toISOString()
      });
      coinsToAdd = 1;
    }

    const newCoins = currentCoins + coinsToAdd;
    await saveStudentPerformance(student.uid, newCoins, updatedPerformance);
    
    setShowExamOfferModal(true);
  };

  // Save results after finishing final step in exam
  const handleFinalExamSubmit = async () => {
    if (!viewingVideo) return;
    
    // Calculate score
    let score = 0;
    examQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        score += 1;
      }
    });

    setExamScore(score);

    const currentCoins = student.superCoins || 0;
    const performanceLog = student.performance || [];
    const existingIdx = performanceLog.findIndex(p => p.videoId === viewingVideo.id);
    let updatedPerformance = [...performanceLog];

    // Award 7 marks/points standard total if scored 6 correct answers and watched fully
    // Score adds 1 coin per mark correctly answered!
    const coinsToAward = score; 

    if (existingIdx !== -1) {
      // Only overwrite the score if they got a better mark than before
      if (score > (updatedPerformance[existingIdx].marks || 0)) {
        updatedPerformance[existingIdx].marks = score;
      }
      updatedPerformance[existingIdx].watchedFully = true;
      updatedPerformance[existingIdx].completedAt = new Date().toISOString();
      updatedPerformance[existingIdx].examAttended = true;
    } else {
      updatedPerformance.push({
        videoId: viewingVideo.id,
        videoTitle: viewingVideo.title || "Lesson Lecture",
        subject: viewingVideo.subject || selectedSubject || "General Science",
        watchedFully: true,
        marks: score,
        totalQuestions: 6,
        completedAt: new Date().toISOString(),
        examAttended: true
      });
    }

    const finalCoins = currentCoins + coinsToAward;
    await saveStudentPerformance(student.uid, finalCoins, updatedPerformance);
    setExamFinished(true);
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
              
              <h3 className="font-sans font-bold text-lg text-slate-900 dark:text-white mb-2">
                {student.status === "pending" ? "Subscribe to Unlock" : "Access Blocked"}
              </h3>
              <p className="font-sans text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                {student.status === "pending" 
                  ? "Your account is currently pending. Please subscribe to gain full access to all subjects, study materials, and the AI Assistant."
                  : "Only active subscribers can access premium features like study materials and the AI Assistant. Please subscribe to activate your premium benefits."}
              </p>

              <div className="flex flex-col gap-2.5">
                <button
                  id="subscribe-popup-btn"
                  onClick={() => {
                    const message = `Halo, I want a subscription to Learning with NRK.`;
                    window.open(`https://wa.me/918848198680?text=${encodeURIComponent(message)}`, "_blank");
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-sans font-bold text-sm shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_20px_rgba(16,185,129,0.6)] active:scale-95 transition-all text-center"
                >
                  <Phone className="w-4 h-4" />
                  Subscribe Now
                </button>
                <button
                  onClick={() => setShowSubUpgradeModal(false)}
                  className="w-full py-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-sans font-medium text-xs hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
                >
                  Cancel
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

        {/* FEEDBACK & EMOJI RATING POPUP MODAL */}
        {showRatingModal && (
          <motion.div
            id="lesson-rating-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div
              id="lesson-rating-box"
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden"
            >
              {/* Header border-none decor */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400" />
              
              <div className="flex items-center justify-between mb-4 mt-1">
                <h3 className="font-sans font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4.5 h-4.5 text-amber-500 fill-amber-500/20" />
                  Rate Video Lesson
                </h3>
                <button
                  id="close-feedback-btn"
                  onClick={() => {
                    setShowRatingModal(false);
                    setRatingSubmitted(false);
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-350 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {!ratingSubmitted ? (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                    How was your studying experience with <strong>{viewingVideo.title}</strong>? Choose an emoji below to rate:
                  </p>

                  {/* Dynamic Emoji Selection Layout */}
                  <div className="grid grid-cols-4 gap-2.5 mb-5">
                    {[
                      { rating: "Bad", emoji: "😞", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30" },
                      { rating: "Average", emoji: "😐", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" },
                      { rating: "Good", emoji: "🙂", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
                      { rating: "Superb", emoji: "🤩", color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30" }
                    ].map((opt) => {
                      const isSelected = selectedEmojiRating === opt.rating;
                      return (
                        <button
                          key={opt.rating}
                          type="button"
                          onClick={() => setSelectedEmojiRating(opt.rating as any)}
                          className={`flex flex-col items-center justify-center py-3.5 px-2 rounded-2xl border transition-all duration-300 cursor-pointer ${
                            isSelected 
                              ? `${opt.color} ring-2 ring-indigo-500 dark:ring-cyan-400 scale-105 shadow-md font-bold` 
                              : "border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          <span 
                            className={`text-3.5xl mb-1.5 transition-transform duration-300 inline-block block ${isSelected ? "scale-125 animate-bounce" : "hover:scale-110"}`}
                          >
                            {opt.emoji}
                          </span>
                          <span className="text-[10px] uppercase font-mono tracking-wider">{opt.rating}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Feedback Text Area Option */}
                  <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-2">
                      Type Your Feedback
                    </label>
                    <textarea
                      id="feedback-text-input"
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Share your thoughts about this chapter or topic, problems you faced, what was explained well, etc. (Optional)"
                      rows={3}
                      className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-cyan-500 resize-none transition-shadow"
                    />
                  </div>

                  {/* Action row */}
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRatingModal(false);
                        setRatingSubmitted(false);
                      }}
                      className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      id="submit-feedback-btn"
                      onClick={handleRatingSubmit}
                      disabled={!selectedEmojiRating || isSubmittingFeedback}
                      className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isSubmittingFeedback ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span>Submit Rating</span>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* Saved Celebration Stage */
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6 flex flex-col items-center justify-center"
                >
                  <motion.div
                    animate={{ 
                      scale: [1, 1.4, 0.9, 1.2, 1],
                      rotate: [0, 15, -15, 10, 0],
                      y: [0, -15, 0]
                    }}
                    transition={{ 
                      duration: 1.2,
                      ease: "easeInOut",
                      times: [0, 0.3, 0.5, 0.8, 1],
                    }}
                    className="text-6xl mb-4 select-none filter drop-shadow-lg"
                  >
                    {selectedEmojiRating === "Bad" && "😞"}
                    {selectedEmojiRating === "Average" && "😐"}
                    {selectedEmojiRating === "Good" && "🙂"}
                    {selectedEmojiRating === "Superb" && "🤩"}
                  </motion.div>

                  <h4 className="font-sans font-extrabold text-sm uppercase tracking-wider text-slate-900 dark:text-white mb-2">
                    Feedback saved successfully!
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-6 leading-relaxed">
                    Your response has been sent to our administrator. It will improve future classes!
                  </p>

                  <button
                    id="finish-feedback-btn"
                    onClick={() => {
                      setShowRatingModal(false);
                      setRatingSubmitted(false);
                    }}
                    className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold rounded-xl hover:bg-slate-850 dark:hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Close Window
                  </button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* DIAGNOSTIC EXAM OFFER POPUP MODAL */}
        {showExamOfferModal && (
          <motion.div
            id="exam-offer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              id="exam-offer-box"
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="bg-white dark:bg-slate-900 border border-amber-500/30 rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500" />
              
              <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 mt-2">
                <span className="text-3xl animate-pulse">🎉</span>
              </div>
              
              <h3 className="font-sans font-extrabold text-lg text-slate-900 dark:text-white mb-2 text-center text-shadow-sm">
                Video Lesson Completed!
              </h3>
              
              <p className="font-sans text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6 text-center">
                You have watched <strong>"{viewingVideo?.title}"</strong> fully and successfully earned <span className="text-amber-500 font-extrabold">+1 Super Coin</span>! 
                <br /><br />
                Let's attempt a customized Kerala State Syllabus Class assessment test (<strong>6 Questions</strong>) designed by <strong>ASTR AI</strong> based on this lesson and Class Syllabus to gain up to <span className="text-amber-500 font-extrabold">+6 extra Super Coins</span>!
              </p>

              <div className="flex flex-col gap-2.5">
                <button
                  id="start-exam-action-btn"
                  onClick={() => {
                    setShowExamOfferModal(false);
                    generateQuestions();
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-white font-sans font-bold text-xs shadow-lg active:scale-95 transition-all text-center cursor-pointer outline-none border-none animate-pulse"
                >
                  <Award className="w-4 h-4" />
                  Attend Exam
                </button>
                <button
                  id="dismiss-exam-offer-btn"
                  onClick={() => setShowExamOfferModal(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 font-sans font-semibold text-xs hover:bg-slate-200 dark:hover:bg-slate-755 active:scale-95 transition-all outline-none"
                >
                  Attempt Later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ACTIVE MCQ EXAM MODAL */}
        {showExamModal && (
          <motion.div
            id="active-exam-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto"
          >
            <motion.div
              id="active-exam-box"
              initial={{ scale: 0.92, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 30 }}
              className="bg-slate-900 border border-yellow-500/20 rounded-3xl p-6 w-full max-w-xl shadow-2xl relative overflow-hidden text-white"
            >
              {/* Header decor */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 via-amber-500 to-yellow-500" />
              
              <div className="flex items-center justify-between mb-5 mt-1 border-b border-white/5 pb-3">
                <span className="text-xs font-bold font-mono tracking-wider text-cyan-400 flex items-center gap-1.5 uppercase">
                  <Brain className="w-4 h-4 text-cyan-405 animate-pulse" />
                  ASTR AI Active Quiz
                </span>
                <button
                  id="force-quit-exam-btn"
                  onClick={() => {
                    setShowExamModal(false);
                    setExamFinished(false);
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {isGeneratingExam ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full flex items-center justify-center mb-6"
                  >
                    <Sparkles className="w-6 h-6 text-yellow-400" />
                  </motion.div>
                  <h4 className="text-sm font-extrabold text-white tracking-wider uppercase mb-2">Analyzing Class Lecture...</h4>
                  <p className="text-xs text-slate-400 max-w-xs text-center leading-relaxed">
                    ASTR AI is generating 6 premium challenging questions based on Kerala State Syllabus levels for your Class & Stream. Just a moment!
                  </p>
                </div>
              ) : examQuestions.length === 0 ? (
                <div className="py-10 text-center">
                  <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                  <p className="text-xs text-slate-300 mb-4">Could not generate questions. Please check connection and try again.</p>
                  <button onClick={generateQuestions} className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white border border-white/10">
                    Retry Generating
                  </button>
                </div>
              ) : !examFinished ? (
                <div>
                  {/* Dynamic Progress indicator */}
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <span className="text-[11px] font-mono font-black uppercase text-slate-400 font-semibold">
                      Question {examStep + 1} of 6
                    </span>
                    <div className="flex-1 flex gap-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                      {Array.from({ length: 6 }).map((_, stepIdx) => (
                        <div
                          key={stepIdx}
                          className={`flex-1 transition-all duration-300 ${
                            stepIdx <= examStep ? "bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]" : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Active Question Title */}
                  <div className="mb-5 text-left bg-slate-950/20 p-4 rounded-2xl border border-white/5">
                    <h3 className="font-sans font-semibold text-sm md:text-base leading-snug text-slate-100">
                      {examQuestions[examStep].question}
                    </h3>
                  </div>

                  {/* Options Stack */}
                  <div className="space-y-2.5 mb-6 text-left">
                    {examQuestions[examStep].options.map((optionText, optIdx) => {
                      const isSelected = selectedAnswers[examStep] === optIdx;
                      const isSubmitted = submittedSteps[examStep] === true;
                      const isCorrectAnswer = optIdx === examQuestions[examStep].correctIndex;
                      
                      let optionStyle = "border-white/5 bg-slate-950/30 hover:bg-slate-950/50 hover:border-slate-700 hover:text-white";
                      let indicatorDot = "border-slate-700 bg-slate-950";

                      if (isSelected) {
                        optionStyle = "border-indigo-505 bg-indigo-500/10 text-white font-semibold";
                        indicatorDot = "border-indigo-400 bg-indigo-500";
                      }

                      if (isSubmitted) {
                        // Color Rules:
                        // "If your answer is correct, it was in the blue, green color"
                        // "It was wrong, it was in the red color"
                        if (isSelected) {
                          if (isCorrectAnswer) {
                            optionStyle = "border-emerald-500 bg-emerald-500/20 text-emerald-400 font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)]";
                            indicatorDot = "border-emerald-400 bg-emerald-500";
                          } else {
                            optionStyle = "border-rose-500 bg-rose-500/20 text-rose-400 font-bold shadow-[0_0_15px_rgba(239,68,68,0.2)]";
                            indicatorDot = "border-rose-400 bg-rose-500";
                          }
                        } else if (isCorrectAnswer) {
                          // Concurrently highlight the true answer in blue-green to guide student
                          optionStyle = "border-cyan-500/60 bg-emerald-500/10 text-emerald-400";
                          indicatorDot = "border-emerald-400 bg-emerald-500";
                        } else {
                          optionStyle = "opacity-40 border-white/5 bg-slate-950/20 text-slate-500 cursor-not-allowed";
                          indicatorDot = "border-white/10 bg-slate-900";
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          disabled={isSubmitted}
                          onClick={() => {
                            setSelectedAnswers(prev => ({ ...prev, [examStep]: optIdx }));
                          }}
                          className={`flex items-center gap-3 w-full p-3.5 rounded-xl border text-xs text-left cursor-pointer transition-all outline-none ${optionStyle}`}
                        >
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 text-[8.5px] font-black ${indicatorDot}`}>
                            {isSubmitted && isCorrectAnswer && "✓"}
                            {isSubmitted && !isCorrectAnswer && isSelected && "✕"}
                          </div>
                          <span>{optionText}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Submission and navigation control button bar */}
                  <div className="flex border-t border-white/5 pt-4">
                    {submittedSteps[examStep] !== true ? (
                      <button
                        id="submit-answer-step-btn"
                        disabled={selectedAnswers[examStep] === undefined}
                        onClick={() => {
                          setSubmittedSteps(prev => ({ ...prev, [examStep]: true }));
                        }}
                        className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed font-sans font-bold text-xs text-white transition-all text-center cursor-pointer outline-none border-none shadow-md"
                      >
                        Submit Answer
                      </button>
                    ) : (
                      <div className="w-full flex gap-3">
                        {examStep < 5 ? (
                          <button
                            id="exam-next-step-btn"
                            onClick={() => setExamStep(prev => prev + 1)}
                            className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 font-sans font-bold text-xs text-slate-100 transition-all text-center cursor-pointer outline-none border-none shadow-md"
                          >
                            Next Question
                          </button>
                        ) : (
                          <button
                            id="submit-all-questions-btn"
                            onClick={handleFinalExamSubmit}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 font-sans font-extrabold text-xs text-white transition-all text-center cursor-pointer outline-none border-none shadow-lg animate-pulse"
                          >
                            Submit All Questions
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Video Exam Results SCREEN */
                <div className="text-center py-6 flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center text-4xl shadow-lg shadow-amber-500/20 mb-4 animate-[bounce_1.5s_infinite]">
                    🏆
                  </div>
                  <h3 className="font-sans font-extrabold text-lg text-white mb-1 uppercase tracking-wider">Video Exam Results</h3>
                  <p className="text-xs text-slate-400 mb-5 max-w-sm">
                    Based on your syllabus & custom chapter mock, your diagnostics performance stands at:
                  </p>

                  <div className="w-full max-w-sm p-4 bg-slate-950/40 border border-white/5 rounded-2xl mb-6 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs text-left">
                      <span className="text-slate-400">Total Questions answered:</span>
                      <span className="font-mono font-bold">6 Questions</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-left">
                      <span className="text-slate-400">Correct Answers scored:</span>
                      <span className="font-mono font-extrabold text-emerald-400">{examScore} / 6 Marks</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-left">
                      <span className="text-slate-400">Super Coins earned (+1 mark = 1 coin):</span>
                      <span className="font-mono font-extrabold text-yellow-500 flex items-center gap-1">
                        ⚡ +{examScore} Coins
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5 w-full max-w-sm">
                    {/* RELOAD / RETAKE EXAM OPTION */}
                    <button
                      id="reload-exam-btn"
                      onClick={generateQuestions}
                      className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-sans font-bold text-xs outline-none border-none cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Retake Exam (Reload)
                    </button>
                    <button
                      id="close-exam-finish-btn"
                      onClick={() => {
                        setShowExamModal(false);
                        setExamFinished(false);
                        // Exit currently playing video to return directly to chapter parts list
                        setIsClosingVideo(true);
                        setTimeout(() => {
                          setIsClosingVideo(false);
                          setViewingVideo(null);
                          setVideoError(null);
                        }, 100);
                      }}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-sans font-semibold text-xs outline-none border-none cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* SUPER COIN REWARDS PAGE */}
        {showSuperCoinPage && (
          <motion.div
            id="super-coin-ledger-overlay"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="fixed inset-0 z-50 bg-slate-950 text-white overflow-y-auto flex flex-col"
          >
            {/* Top Toolbar */}
            <header className="sticky top-0 bg-slate-950 border-b border-white/5 px-6 py-4 flex items-center gap-4 z-10 shrink-0">
              <button
                id="close-ledger-btn"
                onClick={() => {
                  setShowSuperCoinPage(false);
                  if (onCloseSuperCoinPage) {
                    onCloseSuperCoinPage();
                  }
                }}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h1 className="font-sans font-extrabold text-sm md:text-base uppercase tracking-wider text-slate-250">
                Super Coin Rewards Ledger
              </h1>
            </header>

            {/* LEDGER CONTENT BODY */}
            <div className="flex-1 max-w-2xl mx-auto w-full px-5 py-8 space-y-8 select-none">
              
              {/* HERO AREA: COIN ANIMATION */}
              <div className="flex flex-col items-center text-center space-y-4">
                {/* 3D Circular Rotative Spinning Gold Coin with thunder logo */}
                <div className="relative">
                  {/* Outer Orbit Light ring */}
                  <div className="absolute inset-0 rounded-full border border-dashed border-yellow-500/35 animate-spin" style={{ animationDuration: "12s" }} />
                  
                  {/* Animating circular coin */}
                  <motion.div
                    animate={{ rotateY: 360 }}
                    transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                    className="w-32 h-32 md:w-36 md:h-36 rounded-full bg-gradient-to-tr from-yellow-300 via-amber-400 to-amber-600 flex items-center justify-center text-5xl font-black text-amber-950 shadow-[0_0_60px_rgba(245,158,11,0.6)] border-4 border-yellow-250 relative overflow-hidden"
                  >
                    {/* Diagonal light sheen */}
                    <div className="absolute inset-0 bg-white/10 -skew-y-12 transform origin-top-left" />
                    ⚡
                  </motion.div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold font-mono tracking-widest text-slate-500 uppercase">CURRENT BALANCE</span>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-yellow-400 tracking-tight flex items-center justify-center gap-1">
                    {student.superCoins || 0} <span className="text-lg text-slate-300">COINS</span>
                  </h2>
                </div>
              </div>

              {/* CLAIM / CLIMB COIN SECTION */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-white/5 relative overflow-hidden text-center shadow-xl">
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <h3 className="font-sans font-extrabold text-xs text-white uppercase tracking-wider mb-2">Claim Cash Rewards</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto mb-5">
                  Reach <strong>3000 Super Coins</strong> to unlock the Climb Option and exchange your performance rewards!
                </p>

                {/* SHOW CLIMB OPTION ONLY IF THEY HAVE >= 3000 COINS */}
                {(student.superCoins || 0) >= 3000 ? (
                  <button
                    id="climb-action-whats-btn"
                    onClick={() => {
                      const msg = "Successfully scored 3000 coins code:unonrk132";
                      window.open(`https://wa.me/918848198680?text=${encodeURIComponent(msg)}`, "_blank");
                    }}
                    className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-450 font-sans font-black text-xs text-white uppercase tracking-wider shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] active:scale-95 transition-all outline-none border-none cursor-pointer animate-bounce"
                  >
                    <Zap className="w-4 h-4 fill-white text-emerald-105" />
                    Climb Option (Claim)
                  </button>
                ) : (
                  <div className="inline-flex flex-col items-center">
                    <div className="px-5 py-2.5 rounded-full bg-slate-950/60 border border-white/5 text-[10.5px] font-mono text-slate-400">
                      Locked: You need <strong className="text-yellow-400 font-extrabold">{3000 - (student.superCoins || 0)} more</strong> Coins to Climb!
                    </div>
                  </div>
                )}
              </div>

              {/* PERFORMANCE GRID / LOG RECORD */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2 text-left animate-pulse">
                  <h3 className="font-sans font-extrabold text-xs text-slate-400 uppercase tracking-widest">
                    Your Performance Log
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                    {(student.performance || []).length} Video Lessons
                  </span>
                </div>

                {(student.performance || []).length === 0 ? (
                  <div className="py-12 bg-slate-900/40 border border-white/5 rounded-3xl text-center space-y-2">
                    <Award className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400 font-semibold">No performance records logged yet.</p>
                    <p className="text-[10.5px] text-slate-500">Watch any full lecture and pass the diagnostic AI test to log your scores here!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {student.performance.map((item, logIdx) => (
                      <div
                        key={logIdx}
                        className="p-4 rounded-2xl bg-slate-900 border border-white/5 flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-left relative overflow-hidden shadow-inner font-sans"
                      >
                        <div className="shrink text-left">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-[9.5px] font-extrabold uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              {item.subject}
                            </span>
                            <span className="text-[9.5px] font-mono text-slate-500 font-semibold">
                              {new Date(item.completedAt || "").toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="text-xs font-black text-slate-100 leading-snug line-clamp-2">
                            {item.videoTitle}
                          </h4>
                        </div>

                        {/* Marks & Watched results */}
                        <div className="shrink-0 flex sm:flex-col items-start sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5 text-right">
                          <div className="text-[10.5px] font-mono font-bold text-slate-350 flex items-center gap-1">
                            Watched fully: <span className="text-emerald-400 font-extrabold">Yes (+1)</span>
                          </div>
                          <div className="text-xs font-bold font-mono text-yellow-400 flex items-center gap-1 mt-0.5">
                            Exam mark: <span className="font-extrabold text-white bg-amber-950/40 px-1.5 py-0.5 rounded border border-yellow-500/20">+{item.marks} / {item.totalQuestions}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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

          {/* Explicit Pending Status Banner */}
          {student.status === "pending" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
            >
              <div>
                <h4 className="font-sans font-bold text-amber-500 text-sm mb-0.5">Account Subscription Pending</h4>
                <p className="font-sans text-xs text-amber-500/80 leading-relaxed">Your account currently has limited access. Please subscribe to gain full access.</p>
              </div>
              <button
                onClick={() => setShowSubUpgradeModal(true)}
                className="shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-sans font-bold text-xs px-4 py-2 rounded-xl shadow-lg active:scale-95 transition-all"
              >
                View Subscription
              </button>
            </motion.div>
          )}

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
                      const bypass = appConfig?.bypassSubscriptionGates === true;
                      const isSubscribed = subState?.status === "active";
                      if ((student.status === "pending" || !isSubscribed) && !bypass) {
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
                    onVideoComplete={handleVideoWatchingFinished}
                  />
                </div>
              </div>

              {/* 2. Video Info Card */}
              <div className="bg-white/70 dark:bg-slate-900/80 border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 border-none">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10.5px] font-bold text-indigo-600 dark:text-indigo-400">
                    Part {viewingVideo.part || 1}
                  </span>

                  {/* Star Rating Button */}
                  <button
                    id="trigger-rating-modal-btn"
                    onClick={() => {
                      if (lessonRating) {
                        setSelectedEmojiRating(lessonRating.rating);
                        setFeedbackText(lessonRating.feedbackText || "");
                      }
                      setShowRatingModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[10.5px] font-bold text-amber-700 dark:text-amber-400 transition-all duration-300 cursor-pointer shadow-xs active:scale-95 animate-pulse"
                  >
                    {lessonRating ? (
                      <span className="flex items-center gap-1">
                        <span className="animate-bounce inline-block text-xs">{lessonRating.emoji}</span>
                        <span>Rated {lessonRating.rating}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500/35" />
                        <span>Rate & Leave Feedback</span>
                      </span>
                    )}
                  </button>
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

                {isAIBlocked && (
                  <div className="bg-rose-500/15 border-b border-rose-500/30 text-rose-650 dark:text-rose-300 px-4 py-2.5 text-center text-[10.5px] font-bold flex items-center justify-between gap-1.5 shrink-0 animate-pulse">
                    <div className="flex items-center gap-2 text-rose-600 dark:text-rose-300">
                      <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                      <span>Access Suspended: {aiBlockReason}</span>
                    </div>
                    <span className="bg-rose-955/20 dark:bg-rose-950 text-rose-650 dark:text-rose-300 font-mono text-[11px] px-1.5 py-0.5 rounded border border-rose-500/40 font-bold shrink-0">
                      Blocked: {Math.floor(aiBlockedTimeRemaining / 60)}:{(aiBlockedTimeRemaining % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                )}

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
                      onClick={() => !isAIBlocked && sendVideoChatDoubt("Can you explain this topic in simple terms?")}
                      disabled={isAIBlocked}
                      className={`text-left p-2 rounded-lg bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-[10px] text-slate-655 dark:text-slate-300 hover:text-slate-955 dark:hover:text-white transition-colors border border-slate-200 dark:border-white/5 truncate cursor-pointer shadow-sm ${isAIBlocked ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                      💡 Simple Explanation
                    </button>
                    <button 
                      onClick={() => !isAIBlocked && sendVideoChatDoubt("Malayalam-il clear aayi paranju tharaamo?")}
                      disabled={isAIBlocked}
                      className={`text-left p-2 rounded-lg bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-[10px] text-slate-655 dark:text-slate-300 hover:text-slate-955 dark:hover:text-white transition-colors border border-slate-200 dark:border-white/5 truncate cursor-pointer shadow-sm ${isAIBlocked ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                      🗣️ Explain in Malayalam
                    </button>
                    <button 
                      onClick={() => !isAIBlocked && sendVideoChatDoubt("What are the most important formulas and points to remember?")}
                      disabled={isAIBlocked}
                      className={`text-left p-2 rounded-lg bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-[10px] text-slate-655 dark:text-slate-300 hover:text-slate-955 dark:hover:text-white transition-colors border border-slate-200 dark:border-white/5 truncate cursor-pointer shadow-sm ${isAIBlocked ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                      📝 Key Exam Points
                    </button>
                    <button 
                      onClick={() => !isAIBlocked && sendVideoChatDoubt("Generate 3 multiple choice questions for practice on this lesson with answer keys.")}
                      disabled={isAIBlocked}
                      className={`text-left p-2 rounded-lg bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-[10px] text-slate-655 dark:text-slate-300 hover:text-slate-955 dark:hover:text-white transition-colors border border-slate-200 dark:border-white/5 truncate cursor-pointer shadow-sm ${isAIBlocked ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                      ✍️ Practice Questions
                    </button>
                  </div>
                </div>

                {/* Input Area */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!isAIBlocked) sendVideoChatDoubt(videoChatInput);
                  }}
                  className="p-3 bg-slate-50/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-white/5 flex gap-2 items-center text-slate-900 dark:text-white"
                >
                  <input 
                    type="text"
                    value={videoChatInput}
                    onChange={(e) => setVideoChatInput(e.target.value)}
                    disabled={isAIBlocked}
                    placeholder={isAIBlocked ? "AI Assist access blocked..." : "Ask doubts about this lesson..."}
                    className={`flex-1 h-9 bg-white dark:bg-white/10 border border-slate-250 dark:border-white/10 rounded-xl px-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all focus:border-cyan-500 animate-none ${isAIBlocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                  />
                  <button 
                    type="submit"
                    disabled={isVideoChatSending || isAIBlocked || !videoChatInput.trim()}
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
                                  const bypass = appConfig?.bypassSubscriptionGates === true;
                                  const isSubscribed = subState?.status === "active";
                                  if ((student.status === "pending" || !isSubscribed) && !bypass) {
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
      {onOpenAI && !selectedSubject && (
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
