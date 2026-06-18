import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  ArrowLeft,
  Users,
  FilePlus,
  Image,
  CreditCard,
  AlertCircle,
  Trash2,
  Plus,
  CheckCircle,
  XCircle,
  LogOut,
  Check,
  Sliders,
  ToggleLeft,
  ToggleRight,
  FileText,
  BookOpen,
  Pencil,
  RefreshCw,
  Bell,
  Video,
} from "lucide-react";
import {
  getAdminDashboardStats,
  fetchAllStudents,
  adminApproveStudent,
  adminRejectStudent,
  adminUploadPDF,
  adminUploadPDFFile,
  adminDeletePDF,
  adminUpdateBanner,
  adminDeleteBanner,
  adminToggleSubscription,
  fetchBanners,
  fetchPDFs,
  fetchLibraryPDFs,
  adminEditPDF,
  adminUpdateStudentCourse,
  isUsingLocalMock,
  fetchAppConfig,
  updateAppConfig,
  adminUploadMicrobit,
  adminUploadMicrobitFile,
  adminDeleteMicrobit,
  adminUploadVideo,
  adminUpdateVideo,
  adminDeleteVideo,
  fetchVideos
} from "../firebase";
import { Student, PdfAsset, BannerAsset, SubjectName, VideoAsset } from "../types";

interface AdminProps {
  onReturn: () => void;
}

export default function Admin({ onReturn }: AdminProps) {
  // Authorization State
  const [authorized, setAuthorized] = useState(() => {
    return localStorage.getItem("lrnk_admin_session") === "true";
  });
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // Sub Tab Navigation
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "activation"
    | "pdf_upload"
    | "video_upload"
    | "microbit_upload"
    | "banner"
    | "sub_manage"
    | "library"
    | "video_library"
    | "app_config"
    | "subject_logos"
    | "pages_config"
    | "notification_config"
  >("dashboard");

  // App Config
  const [appConfig, setAppConfig] = useState<any>({});
  const [aboutText, setAboutText] = useState("");
  const [helpText, setHelpText] = useState("");
  const [appLogoUrl, setAppLogoUrl] = useState("");
  const [subjectIcons, setSubjectIcons] = useState<Record<string, string>>({});
  const [notificationTitle, setNotificationTitle] = useState("Notifications");
  const [notifications, setNotifications] = useState<any[]>([]);

  // Dashboard Stats State
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    activeSubs: 0,
  });
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [bannersList, setBannersList] = useState<BannerAsset[]>([]);
  const [pdfSyncList, setPdfSyncList] = useState<PdfAsset[]>([]);
  const [microbitSyncList, setMicrobitSyncList] = useState<any[]>([]);

  const [generalLoading, setGeneralLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState("");
  const [dbError, setDbError] = useState("");

  // Stream Assignment Dialog State (For Student approval)
  const [targetEditCourseUser, setTargetEditCourseUser] = useState<Student | null>(null);
  const [targetReviewUser, setTargetReviewUser] = useState<Student | null>(null);
  const [assignClass, setAssignClass] = useState<"+1" | "+2">("+2");
  const [assignStream, setAssignStream] = useState<
    "Computer Science" | "Biology Science"
  >("Computer Science");
  const [assignStatus, setAssignStatus] = useState<"approved" | "blocked">("approved");

  // PDF Upload Form State
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfClass, setPdfClass] = useState<"+1" | "+2">("+2");
  const [pdfStream, setPdfStream] = useState<
    "Computer Science" | "Biology Science"
  >("Computer Science");
  const [pdfSubject, setPdfSubject] = useState<SubjectName>("Physics");
  const [pdfLink, setPdfLink] = useState("");
  const [pdfPhysicalFile, setPdfPhysicalFile] = useState<File | null>(null);
  const [submittingFile, setSubmittingFile] = useState(false);

  // Banner Upload Form State
  const [bannerLink, setBannerLink] = useState("");

  // Microbit Upload Form State
  const [mbTitle, setMbTitle] = useState("");
  const [mbClass, setMbClass] = useState<"+1" | "+2">("+2");
  const [mbStream, setMbStream] = useState<
    "Computer Science" | "Biology Science"
  >("Computer Science");
  const [mbSubject, setMbSubject] = useState<string>("Onam Exam");
  const [mbLink, setMbLink] = useState("");
  const [mbPhysicalFile, setMbPhysicalFile] = useState<File | null>(null);
  const [mbSubmittingFile, setMbSubmittingFile] = useState(false);

  // Library Manager View State
  const [libraryClass, setLibraryClass] = useState<"+1" | "+2">("+2");
  const [libraryStream, setLibraryStream] = useState<
    "Computer Science" | "Biology Science"
  >("Computer Science");
  const [libraryPdfs, setLibraryPdfs] = useState<PdfAsset[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [editingPdf, setEditingPdf] = useState<PdfAsset | null>(null);
  const [editPdfSubmitting, setEditPdfSubmitting] = useState(false);

  // Video Upload Form State
  const [videoTitle, setVideoTitle] = useState("");
  const [videoClass, setVideoClass] = useState<"+1" | "+2">("+2");
  const [videoStream, setVideoStream] = useState<
    "Computer Science" | "Biology Science"
  >("Computer Science");
  const [videoSubject, setVideoSubject] = useState<SubjectName>("Physics");
  const [videoChapter, setVideoChapter] = useState("");
  const [videoPart, setVideoPart] = useState(1);
  const [videoLink, setVideoLink] = useState("");
  const [videoSubmitting, setVideoSubmitting] = useState(false);

  // Video Library Manager State
  const [libraryVideoClass, setLibraryVideoClass] = useState<"+1" | "+2">("+2");
  const [libraryVideoStream, setLibraryVideoStream] = useState<
    "Computer Science" | "Biology Science"
  >("Computer Science");
  const [libraryVideos, setLibraryVideos] = useState<VideoAsset[]>([]);
  const [libraryVideoLoading, setLibraryVideoLoading] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoAsset | null>(null);
  const [editVideoSubmitting, setEditVideoSubmitting] = useState(false);

  // Sync Library
  useEffect(() => {
    if (activeTab === "library") {
      setLibraryLoading(true);
      fetchLibraryPDFs(libraryClass, libraryStream)
        .then(setLibraryPdfs)
        .catch(console.error)
        .finally(() => setLibraryLoading(false));
    }
  }, [activeTab, libraryClass, libraryStream]);

  useEffect(() => {
    if (activeTab === "video_library") {
      setLibraryVideoLoading(true);
      fetchVideos(libraryVideoClass, libraryVideoStream)
        .then(setLibraryVideos)
        .catch(console.error)
        .finally(() => setLibraryVideoLoading(false));
    }
  }, [activeTab, libraryVideoClass, libraryVideoStream]);

  const correctPassword = "123nfjhhgb";

  const handleAuthorize = () => {
    if (password === correctPassword) {
      setAuthorized(true);
      setAuthError("");
      localStorage.setItem("lrnk_admin_session", "true");
    } else {
      setAuthError("Incorrect system passcode. Please try again.");
    }
  };

  // Sync general lists depending on states
  const refreshAdminData = async () => {
    setGeneralLoading(true);
    setDbError("");
    try {
      const statsObj = await getAdminDashboardStats();
      setStats(statsObj);

      const list = await fetchAllStudents();
      setStudentsList(list);

      // Load banners
      const bannersObj = await fetchBanners();
      setBannersList(bannersObj);

      // Get pdf list (by loading general pre-cached ones in dual mode code)
      // For simulator we can simply query some default subjects or all
      const physics_CSPLUS2 = await fetchPDFs(
        "+2",
        "Computer Science",
        "Physics",
      );
      const chemistry_CSPLUS2 = await fetchPDFs(
        "+2",
        "Computer Science",
        "Chemistry",
      );
      const maths_CSPLUS2 = await fetchPDFs(
        "+2",
        "Computer Science",
        "Mathematics",
      );
      setPdfSyncList([
        ...physics_CSPLUS2,
        ...chemistry_CSPLUS2,
        ...maths_CSPLUS2,
      ]);

      const config = await fetchAppConfig();
      setAppConfig(config);
      setAboutText(config.aboutText || "");
      setHelpText(config.helpText || "");
      setAppLogoUrl(config.appLogoUrl || "");
      setSubjectIcons(config.subjectIcons || {});
      setNotificationTitle(config.notificationTitle || "Notifications");
      setNotifications(config.notifications || []);
    } catch (e: any) {
      console.error(e);
      setDbError(e.message || "Failed to fetch admin data from Firebase.");
    } finally {
      setGeneralLoading(false);
    }
  };

  useEffect(() => {
    if (authorized) {
      refreshAdminData();
    }
  }, [authorized, activeTab]);

  const handleDirectApprove = async (uid: string) => {
    try {
      await adminApproveStudent(uid);
      triggerToast("Approved student successfully. Please edit their course later.");
      refreshAdminData();
    } catch (e: any) {
      alert(e.message || "Failed during approval write.");
    }
  };

  const handleApproveWithCourse = async () => {
    if (!targetReviewUser) return;
    try {
      await adminApproveStudent(targetReviewUser.uid);
      await adminUpdateStudentCourse(targetReviewUser.uid, assignClass, assignStream);
      
      if (targetReviewUser.phone) {
        let phoneStr = targetReviewUser.phone.replace(/\D/g, "");
        if (phoneStr) {
          if (!phoneStr.startsWith("91") && phoneStr.length === 10) {
            phoneStr = "91" + phoneStr;
          } else if (!phoneStr.startsWith("91") && phoneStr.length !== 10 && !phoneStr.startsWith("+")) {
             // Just in case, prepend 91 anyway if it lacks it, assuming India. But length 10 check is safer.
          }
          // The instructions say "country code is +91". wa.me expects numbers without +.
          const activationTime = new Date().toLocaleString();
          const message = `Hello ${targetReviewUser.name},\nYour enrollment has been successfully approved!\nPhone: ${targetReviewUser.phone}\nActivation Time: ${activationTime}`;
          window.open(`https://wa.me/${phoneStr}?text=${encodeURIComponent(message)}`, "_blank");
        }
      }
      
      setTargetReviewUser(null);
      triggerToast("Student approved and assigned to course.");
      refreshAdminData();
    } catch(e: any) {
      alert(e.message || "Failed to approve student.");
    }
  };

  const handleRejectAction = async (uid: string) => {
    if (!confirm("Are you sure you want to block or deny this student?"))
      return;
    try {
      await adminRejectStudent(uid);
      triggerToast("Blocked student access.");
      refreshAdminData();
    } catch (e: any) {
      alert(e.message || "Failed rejection process.");
      console.error(e);
    }
  };

  const handleEditCourseAction = async () => {
    if (!targetEditCourseUser) return;
    try {
      await adminUpdateStudentCourse(
        targetEditCourseUser.uid,
        assignClass,
        assignStream,
      );
      if (assignStatus === "blocked") {
        await adminRejectStudent(targetEditCourseUser.uid);
      } else {
        await adminApproveStudent(targetEditCourseUser.uid);
      }
      setTargetEditCourseUser(null);
      triggerToast("Updated student course and stream successfully.");
      refreshAdminData();
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Stream allocation error.");
    }
  };

  const handlePdfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfTitle || (!pdfLink && !pdfPhysicalFile)) {
      alert("Provide a PDF title and either a document link or file.");
      return;
    }

    setSubmittingFile(true);
    try {
      if (pdfPhysicalFile) {
        await adminUploadPDFFile(pdfTitle, pdfClass, pdfStream, pdfSubject, pdfPhysicalFile);
      } else {
        await adminUploadPDF(pdfTitle, pdfClass, pdfStream, pdfSubject, pdfLink);
      }

      setPdfTitle("");
      setPdfLink("");
      setPdfPhysicalFile(null);

      triggerToast("Study material uploaded and indexed successfully!");
      refreshAdminData();
    } catch (err: any) {
      alert(err.message || "PDF link transaction failed. Please try again.");
    } finally {
      setSubmittingFile(false);
    }
  };

  const extractYouTubeId = (url: string) => {
    if (!url) return "";
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : url.replace(/[^a-zA-Z0-9_-]/g, "");
  };

  const handleVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoTitle || !videoLink || !videoChapter || !videoPart) {
      alert("Provide a Video title, link, chapter, and part number.");
      return;
    }

    setVideoSubmitting(true);
    try {
      const videoIdToSave = extractYouTubeId(videoLink);
      await adminUploadVideo(
        videoTitle,
        videoClass,
        videoStream,
        videoSubject,
        videoChapter,
        videoPart,
        videoIdToSave
      );

      setVideoTitle("");
      setVideoLink("");
      setVideoChapter("");
      setVideoPart(1);

      triggerToast("Study video material uploaded successfully!");
      refreshAdminData();
    } catch (err: any) {
      alert(err.message || "Video transaction failed. Please try again.");
    } finally {
      setVideoSubmitting(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm("Do you want to delete this study video?")) return;
    try {
      await adminDeleteVideo(videoId);
      triggerToast("Video deleted from index.");
      refreshAdminData();
      // re-fetch library videos if in that tab
      if (activeTab === "video_library") {
         const list = await fetchVideos(libraryVideoClass, libraryVideoStream);
         setLibraryVideos(list);
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to delete video.");
      throw e;
    }
  };

  const handleUpdateVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo) return;
    setEditVideoSubmitting(true);
    try {
      const videoIdToSave = extractYouTubeId(editingVideo.videoUrl || "");
      await adminUpdateVideo(editingVideo.id, {
        title: editingVideo.title,
        class: editingVideo.class,
        stream: editingVideo.stream,
        subject: editingVideo.subject,
        chapter: editingVideo.chapter,
        part: editingVideo.part,
        videoUrl: videoIdToSave
      });
      triggerToast("Video updated successfully!");
      setEditingVideo(null);
      refreshAdminData();
      if (activeTab === "video_library") {
         const list = await fetchVideos(libraryVideoClass, libraryVideoStream);
         setLibraryVideos(list);
      }
    } catch (err: any) {
      alert(err.message || "Failed to update video.");
    } finally {
      setEditVideoSubmitting(false);
    }
  };

  const handleMicrobitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mbTitle || (!mbLink && !mbPhysicalFile)) {
      alert("Provide a Microbit material title and either a document link or file.");
      return;
    }

    setMbSubmittingFile(true);
    try {
      if (mbPhysicalFile) {
        await adminUploadMicrobitFile(mbTitle, mbClass, mbStream, mbSubject, mbPhysicalFile);
      } else {
        await adminUploadMicrobit(mbTitle, mbClass, mbStream, mbSubject, mbLink);
      }

      setMbTitle("");
      setMbLink("");
      setMbPhysicalFile(null);

      triggerToast("Micro:bit material uploaded successfully!");
      refreshAdminData();
    } catch (err: any) {
      alert(err.message || "Micro:bit transaction failed. Please try again.");
    } finally {
      setMbSubmittingFile(false);
    }
  };

  const handleDeletePdf = async (pdfId: string, fileName: string) => {
    if (!confirm("Do you want to delete this study notes link?")) return;
    try {
      await adminDeletePDF(pdfId, fileName);
      triggerToast("Link document deleted from index.");
      refreshAdminData();
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to delete PDF.");
      throw e;
    }
  };

  const handleEditPdf = (pdf: PdfAsset) => {
    setEditingPdf({ ...pdf });
  };

  const handleUpdatePdfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPdf) return;
    setEditPdfSubmitting(true);
    try {
      await adminEditPDF(editingPdf.id, editingPdf.title, editingPdf.pdfUrl);
      triggerToast("Library document updated successfully.");

      // Update local state if we are inside library active tab
      setLibraryPdfs((prev) =>
        prev.map((p) =>
          p.id === editingPdf.id
            ? { ...p, title: editingPdf.title, pdfUrl: editingPdf.pdfUrl }
            : p,
        ),
      );

      setEditingPdf(null);
      refreshAdminData();
    } catch (e) {
      console.error(e);
      alert("Failed to edit document.");
    } finally {
      setEditPdfSubmitting(false);
    }
  };

  const handleBannerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerLink) {
      alert("Provide an image link.");
      return;
    }

    try {
      await adminUpdateBanner(bannerLink);
      setBannerLink("");

      triggerToast(
        "Welcome promo banner uploaded. Real-time devices synchronized!",
      );
      refreshAdminData();
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to upload banner.");
    }
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (!confirm("Do you want to turn off and delete this banner?")) return;
    try {
      await adminDeleteBanner(bannerId);
      triggerToast("Banner deleted successfully.");
      refreshAdminData();
    } catch (e) {
      console.error(e);
      alert("Failed to delete banner.");
    }
  };

  const handleToggleSub = async (
    uid: string,
    currentStatus: "active" | "inactive",
  ) => {
    const nextStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      await adminToggleSubscription(uid, nextStatus);
      triggerToast(`License updated: set state to ${nextStatus.toUpperCase()}`);
      refreshAdminData();
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to update license.");
    }
  };

  const triggerToast = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => {
      setActionFeedback("");
    }, 4000);
  };

  if (!authorized) {
    // ENTRANCE PROTECTION PASSWORD CHANGER GATES
    return (
      <div
        id="admin-passcode-gate"
        className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white select-none overflow-hidden"
      >
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-[400px] p-10 rounded-3xl bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl space-y-8"
        >
          <button
            onClick={onReturn}
            className="absolute top-6 left-6 flex items-center justify-center w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-black/5 dark:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-violet-500/20 to-blue-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mx-auto">
            <ShieldCheck className="w-10 h-10" />
          </div>

          <div className="space-y-2 text-center">
            <h2 className="font-sans font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">
              Admin Console
            </h2>
            <p className="font-sans text-sm text-slate-600 dark:text-slate-400 leading-relaxed px-4">
              Enter the master passcode to access the system portal.
            </p>
          </div>

          <div className="space-y-4 text-left font-sans">
            <div>
              <input
                id="admin-pass-field"
                type="password"
                placeholder="Enter passcode..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAuthorize()}
                className="w-full h-14 px-5 rounded-2xl bg-white dark:bg-black/50 border border-slate-200 dark:border-white/10 text-base text-slate-900 dark:text-white placeholder-slate-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all font-mono tracking-widest text-center shadow-inner"
              />
            </div>

            <AnimatePresence>
              {authError && (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-rose-400 text-center font-medium bg-rose-500/10 border border-rose-500/20 py-2.5 px-4 rounded-xl"
                >
                  {authError}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              id="admin-validate-btn"
              onClick={handleAuthorize}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 text-slate-900 dark:text-white font-sans font-bold text-sm shadow-xl hover:from-violet-500 hover:to-blue-500 active:scale-[0.98] transition-all outline-none cursor-pointer border border-slate-200 dark:border-white/10"
            >
              Verify Access
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      id="admin-workspace"
      className="min-h-screen pb-32 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-sans select-none overflow-y-auto"
    >
      {/* Dynamic Toast Alerts */}
      <AnimatePresence>
        {actionFeedback && (
          <motion.div
            id="toast-notification"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-6 inset-x-4 z-50 max-w-md mx-auto p-4 rounded-2xl bg-emerald-500 text-slate-950 font-sans font-bold text-xs shadow-2xl flex items-center gap-2.5"
          >
            <Check className="w-5 h-5 bg-slate-50 dark:bg-slate-950/20 rounded-full p-0.5 shrink-0" />
            <span>{actionFeedback}</span>
          </motion.div>
        )}

        {/* EDIT COURSE AND STREAM MODAL POPUP */}
        {targetEditCourseUser && (
          <motion.div
            id="edit-course-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white dark:bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              className="bg-slate-50 dark:bg-slate-950 border border-indigo-500/20 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-5"
            >
              <h3 className="font-sans font-bold text-lg text-slate-900 dark:text-white border-b border-black/5 dark:border-white/5 pb-2">
                Edit Academic Course
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You are updating the course for student{" "}
                <strong className="text-slate-900 dark:text-white">
                  {targetEditCourseUser.name}
                </strong>
                .
              </p>

              <div className="space-y-4">
                {/* Status Assignment */}
                <div>
                  <label className="text-[10px] text-gray-500 font-semibold uppercase block mb-1">
                    Student Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setAssignStatus("approved")}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                        assignStatus === "approved"
                          ? "bg-green-500 border-green-500 text-white"
                          : "bg-black/5 dark:bg-white/5 border-transparent text-slate-500 dark:text-slate-400 hover:bg-black/10 dark:hover:bg-white/10"
                      }`}
                    >
                      Approved
                    </button>
                    <button
                      onClick={() => setAssignStatus("blocked")}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                        assignStatus === "blocked"
                          ? "bg-rose-500 border-rose-500 text-white"
                          : "bg-black/5 dark:bg-white/5 border-transparent text-slate-500 dark:text-slate-400 hover:bg-black/10 dark:hover:bg-white/10"
                      }`}
                    >
                      Blocked
                    </button>
                  </div>
                </div>

                {/* Year Assignment */}
                <div>
                  <label className="text-[10px] text-gray-500 font-semibold uppercase block mb-1">
                    Assign Academic Year
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setAssignClass("+1")}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                        assignClass === "+1"
                          ? "bg-indigo-600 border-indigo-505 text-slate-900 dark:text-white"
                          : "bg-black/5 dark:bg-white/5 border-transparent text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      Plus One (+1)
                    </button>
                    <button
                      onClick={() => setAssignClass("+2")}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                        assignClass === "+2"
                          ? "bg-indigo-600 border-indigo-505 text-slate-900 dark:text-white"
                          : "bg-black/5 dark:bg-white/5 border-transparent text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      Plus Two (+2)
                    </button>
                  </div>
                </div>

                {/* Stream Assignment */}
                <div>
                  <label className="text-[10px] text-gray-500 font-semibold uppercase block mb-1">
                    Assign Science Stream
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setAssignStream("Computer Science")}
                      className={`py-2 rounded-xl border text-[11px] font-bold transition-all ${
                        assignStream === "Computer Science"
                          ? "bg-indigo-600 border-indigo-505 text-slate-900 dark:text-white"
                          : "bg-black/5 dark:bg-white/5 border-transparent text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      Computer Science
                    </button>
                    <button
                      onClick={() => setAssignStream("Biology Science")}
                      className={`py-2 rounded-xl border text-[11px] font-bold transition-all ${
                        assignStream === "Biology Science"
                          ? "bg-indigo-600 border-indigo-505 text-slate-900 dark:text-white"
                          : "bg-black/5 dark:bg-white/5 border-transparent text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      Biology Science
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={handleEditCourseAction}
                  className="flex-1 py-2.5 rounded-xl bg-sky-500 text-slate-950 font-sans font-bold text-xs shadow-lg hover:bg-sky-400 transition-colors cursor-pointer"
                >
                  Save Course Updates
                </button>
                <button
                  onClick={() => setTargetEditCourseUser(null)}
                  className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-xs font-semibold hover:bg-black/5 dark:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* REVIEW AND APPROVE NEW STUDENT MODAL */}
        {targetReviewUser && (
          <motion.div
            id="review-student-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white dark:bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              className="bg-slate-50 dark:bg-slate-950 border border-green-500/20 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-5"
            >
              <h3 className="font-sans font-bold text-lg text-slate-900 dark:text-white border-b border-black/5 dark:border-white/5 pb-2">
                Review & Approve Student
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/10">
                  <img
                    referrerPolicy="no-referrer"
                    src={targetReviewUser.profileImage || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"}
                    alt={targetReviewUser.name}
                    className="w-12 h-12 rounded-full border border-white/15 object-cover"
                  />
                  <div className="overflow-hidden">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{targetReviewUser.name}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate font-mono">{targetReviewUser.email}</p>
                    <p className="text-xs text-amber-200 truncate font-mono">{targetReviewUser.phone || "No phone provided"}</p>
                  </div>
                </div>

                {/* Year Assignment */}
                <div>
                  <label className="text-[10px] text-gray-500 font-semibold uppercase block mb-1">
                    Assign Academic Year
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setAssignClass("+1")}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                        assignClass === "+1"
                          ? "bg-green-600 border-green-500 text-slate-900 dark:text-white"
                          : "bg-black/5 dark:bg-white/5 border-transparent text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      Plus One (+1)
                    </button>
                    <button
                      onClick={() => setAssignClass("+2")}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                        assignClass === "+2"
                          ? "bg-green-600 border-green-500 text-slate-900 dark:text-white"
                          : "bg-black/5 dark:bg-white/5 border-transparent text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      Plus Two (+2)
                    </button>
                  </div>
                </div>

                {/* Stream Assignment */}
                <div>
                  <label className="text-[10px] text-gray-500 font-semibold uppercase block mb-1">
                    Assign Science Stream
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setAssignStream("Computer Science")}
                      className={`py-2 rounded-xl border text-[11px] font-bold transition-all ${
                        assignStream === "Computer Science"
                          ? "bg-green-600 border-green-500 text-slate-900 dark:text-white"
                          : "bg-black/5 dark:bg-white/5 border-transparent text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      Computer Science
                    </button>
                    <button
                      onClick={() => setAssignStream("Biology Science")}
                      className={`py-2 rounded-xl border text-[11px] font-bold transition-all ${
                        assignStream === "Biology Science"
                          ? "bg-green-600 border-green-500 text-slate-900 dark:text-white"
                          : "bg-black/5 dark:bg-white/5 border-transparent text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      Biology Science
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={handleApproveWithCourse}
                  className="flex-1 py-2.5 rounded-xl bg-green-500 text-slate-950 font-sans font-bold text-xs shadow-lg hover:bg-green-400 transition-colors cursor-pointer"
                >
                  Approve Student
                </button>
                <button
                  onClick={() => setTargetReviewUser(null)}
                  className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-xs font-semibold hover:bg-black/5 dark:bg-white/10 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Action Nav Bar (Matches layout) */}
      <div className="bg-slate-50 dark:bg-slate-950 border-b border-black/5 dark:border-white/5 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onReturn}
            className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-slate-300 hover:text-slate-900 dark:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-sans font-bold text-lg text-slate-900 dark:text-white">
              Learning With NRK
            </h1>
            <span className="font-mono text-[9px] uppercase text-zinc-500">
              Global Admin Console Dashboard
            </span>
          </div>
        </div>

        {/* Sync loading indicators */}
        <div className="flex items-center gap-2">
          {generalLoading && (
            <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping inline-block" />
              Database refresh in progress...
            </span>
          )}
          <button
            onClick={() => refreshAdminData()}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-slate-900 dark:text-white transition-colors cursor-pointer border border-slate-200 dark:border-white/10"
            title="Refresh Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setAuthorized(false);
              localStorage.removeItem("lrnk_admin_session");
              if (onReturn) onReturn();
            }}
            className="px-3 py-1.5 rounded-lg bg-pink-500/10 border border-pink-500/20 text-xxs text-pink-400 flex items-center gap-1 hover:bg-pink-500/20 cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
            <span>Lock Portal</span>
          </button>
        </div>
      </div>

      {/* Operational Dashboard Menu Grid */}
      <div className="max-w-7xl mx-auto px-6 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column select tabs sidebar */}
        <div className="lg:col-span-3 space-y-2 shrink-0">
          {[
            { id: "dashboard", label: "Dashboard overview", icon: Users },
            {
              id: "activation",
              label: "Student activation",
              icon: CheckCircle,
            },
            { id: "pdf_upload", label: "Study notes uploads", icon: FilePlus },
            { id: "library", label: "Library Notes Manager", icon: BookOpen },
            { id: "video_upload", label: "Study Videos Uploads", icon: FilePlus },
            { id: "video_library", label: "Library Video Manager", icon: BookOpen },
            { id: "microbit_upload", label: "Micro:bit Uploads", icon: FilePlus },
            { id: "banner", label: "Banner ads sliders", icon: Image },
            {
              id: "sub_manage",
              label: "Syllabus subscriptions",
              icon: CreditCard,
            },
            { id: "pages_config", label: "Global Settings", icon: FileText },
            { id: "subject_logos", label: "Subject Logos", icon: Image },
            { id: "notification_config", label: "Notifications", icon: Bell },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-sans text-xs font-semibold text-left transition-all outline-none cursor-pointer ${
                  activeTab === item.id
                    ? "bg-indigo-600 text-slate-900 dark:text-white shadow-xl shadow-indigo-600/10 border border-indigo-500/10"
                    : "bg-black/5 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-white/[0.08]"
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right main workspace portal column */}
        <div className="lg:col-span-9 bg-[#121c32]/50 border border-black/5 dark:border-white/5 rounded-3xl p-6 min-h-[50vh]">
          {dbError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="font-sans text-sm flex-1">
                <strong className="font-bold block mb-1">
                  Database Permission Error:
                </strong>
                <p className="mb-3">{dbError}</p>
                {dbError.includes("Missing Firebase permissions") && (
                  <div className="bg-slate-100 dark:bg-white dark:bg-black/40 p-4 rounded-xl border border-red-500/10 mt-3 text-slate-600 dark:text-slate-300">
                    <strong className="text-slate-900 dark:text-white block mb-2">
                      How to fix this in your Firebase Console:
                    </strong>
                    <ol className="list-decimal pl-4 space-y-2 mb-4">
                      <li>
                        Go to{" "}
                        <strong>
                          Firebase Console &gt; Firestore Database &gt; Rules
                        </strong>
                        .
                      </li>
                      <li>
                        Replace your rules with the code below to enable Admin
                        tools safely, then click <strong>Publish</strong>.
                      </li>
                      <li>
                        Wait 1 minute, refresh this page, and click the{" "}
                        <strong>Promote Me to Admin</strong> button below.
                      </li>
                    </ol>
                    <div className="bg-gray-900 p-3 rounded-lg overflow-x-auto text-xs font-mono text-indigo-300 border border-gray-800 mb-4">
                      <pre>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Temporary for setup!
    }
  }
}`}</pre>
                    </div>
                    <button
                      className="mt-2 block text-xs px-4 py-2 bg-indigo-600 text-slate-900 dark:text-white font-semibold rounded-full hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/20"
                      onClick={async () => {
                        try {
                          const { makeMeAdmin, auth } =
                            await import("../firebase");
                          if (auth.currentUser?.uid) {
                            await makeMeAdmin(auth.currentUser.uid);
                            triggerToast(
                              "Success! You are now an admin. Refreshing data...",
                            );
                            setTimeout(() => {
                              refreshAdminData();
                            }, 1000);
                          } else {
                            alert(
                              "You are not signed in. Please log in first.",
                            );
                          }
                        } catch (e: any) {
                          alert(e.message);
                        }
                      }}
                    >
                      Step 4: Promote Me to Admin
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 1: DASHBOARD COUNTERS */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="border-b border-black/5 dark:border-white/5 pb-3">
                <h2 className="font-sans font-bold text-base text-indigo-300">
                  Administrative Overview
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Total metrics aggregated from live databases
                </p>
              </div>

              {/* Counter grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: "Total Students",
                    value: stats.total,
                    color: "text-blue-300",
                    bg: "bg-gradient-to-tr from-blue-900/40 to-blue-600/10 border-blue-500/20",
                  },
                  {
                    label: "Awaiting Review",
                    value: stats.pending,
                    color: "text-amber-300",
                    bg: "bg-gradient-to-tr from-amber-900/40 to-amber-600/10 border-amber-500/20",
                  },
                  {
                    label: "Approved Users",
                    value: stats.approved,
                    color: "text-emerald-300",
                    bg: "bg-gradient-to-tr from-emerald-900/40 to-emerald-600/10 border-emerald-500/20",
                  },
                  {
                    label: "Active Subscriptions",
                    value: stats.activeSubs,
                    color: "text-purple-300",
                    bg: "bg-gradient-to-tr from-purple-900/40 to-violet-600/10 border-purple-500/20",
                  },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className={`relative overflow-hidden p-6 rounded-3xl border border-slate-200 dark:border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm hover:shadow-lg dark:hover:shadow-none transition-all space-y-2`}
                  >
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-white/20 to-transparent" />
                    <span className="text-[10.5px] uppercase font-bold text-slate-500 dark:text-slate-300 block tracking-widest leading-none drop-shadow-sm">
                      {stat.label}
                    </span>
                    <span
                      className={`text-5xl font-black tracking-tighter block drop-shadow-sm dark:drop-shadow-xl ${stat.color.replace('300', '500')}`}
                    >
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Developer system info */}
              <div className="bg-white dark:bg-slate-900 border border-indigo-500/10 rounded-2xl p-4 space-y-3 font-sans">
                <div className="flex items-center gap-1.5 text-indigo-300">
                  <Sliders className="w-4.5 h-4.5" />
                  <span className="font-bold text-xs uppercase tracking-wider">
                    Storage & API Sync Rules
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 leading-normal space-y-2">
                  <p>
                    All study notes and booklets are compiled directly against
                    Firebase Storage folder{" "}
                    <code className="bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded font-mono text-indigo-300">
                      /pdfs/*
                    </code>
                    .
                  </p>
                  <p>
                    Verification is authoritative: unapproved students remain
                    restricted underneath a strict waiting portal blocking
                    download loops. Set approval and stream allocation using the{" "}
                    <strong className="text-indigo-300">
                      Student Activation
                    </strong>
                    .
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STUDENT ACTIVATION REGISTRY */}
          {activeTab === "activation" && (
            <div className="space-y-6">
              <div className="border-b border-black/5 dark:border-white/5 pb-3">
                <h2 className="font-sans font-bold text-base text-indigo-300">
                  Student Enrollment Verification
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Approve registrations and allocate Science syllabus groups
                </p>
              </div>

              {studentsList.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-xs text-gray-500">
                    No registered students found.
                  </span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-sans text-xs">
                    <thead>
                      <tr className="border-b border-black/5 dark:border-white/5 text-slate-500 dark:text-slate-400">
                        <th className="py-3 px-2 font-bold">Email/Name</th>
                        <th className="py-3 px-2 font-bold">Registry date</th>
                        <th className="py-3 px-2 font-bold">
                          Class Assignment
                        </th>
                        <th className="py-3 px-2 font-bold">Status</th>
                        <th className="py-3 px-2 font-bold text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                      {studentsList.map((stud) => (
                        <tr key={stud.uid} className="hover:bg-white/[0.01]">
                          <td className="py-3 px-2 font-medium">
                            <div className="flex items-center gap-2.5">
                              <img
                                referrerPolicy="no-referrer"
                                src={
                                  stud.profileImage ||
                                  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
                                }
                                alt={stud.name}
                                className="w-8 h-8 rounded-full border border-white/15"
                              />
                              <div>
                                <span className="block text-slate-900 dark:text-white font-bold">
                                  {stud.name}
                                </span>
                                <span className="block text-slate-500 font-mono text-[10px]">
                                  {stud.email}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                            {new Date(stud.registeredAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-2">
                            {stud.status === "approved" ? (
                              <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-bold font-mono">
                                {stud.class}{" "}
                                {stud.stream === "Computer Science"
                                  ? "CS"
                                  : "Bio"}
                              </span>
                            ) : (
                              <span className="text-gray-500 italic">
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                                stud.status === "approved"
                                  ? "bg-green-500/10 border border-green-500/20 text-green-400"
                                  : stud.status === "pending"
                                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse"
                                    : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                              }`}
                            >
                              {stud.status}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {stud.status !== "approved" && (
                                <button
                                  onClick={() => {
                                    setAssignClass("+1");
                                    setAssignStream("Computer Science");
                                    setTargetReviewUser(stud);
                                  }}
                                  className="px-2.5 py-1 rounded bg-green-500 text-slate-950 font-sans font-extrabold text-[11px] hover:bg-green-400 transition-colors cursor-pointer"
                                >
                                  Review & Approve
                                </button>
                              )}
                              {stud.status === "approved" && (
                                <button
                                  onClick={() => {
                                    setAssignClass(stud.class || "+2");
                                    setAssignStream(
                                      stud.stream || "Computer Science",
                                    );
                                    setAssignStatus((stud.status === "blocked" ? "blocked" : "approved"));
                                    setTargetEditCourseUser(stud);
                                  }}
                                  className="px-2.5 py-1 rounded bg-sky-500/10 border border-sky-500/20 text-[11px] font-bold text-sky-400 hover:bg-sky-500/25 transition-colors cursor-pointer"
                                >
                                  Edit Course
                                </button>
                              )}
                              {stud.status !== "blocked" && (
                                <button
                                  onClick={() => handleRejectAction(stud.uid)}
                                  className="px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-[11px] font-bold text-rose-400 hover:bg-rose-500/25 transition-colors cursor-pointer"
                                >
                                  Block
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: STUDY NOTES PDF UPLOAD MANAGER */}
          {activeTab === "pdf_upload" && (
            <div className="space-y-6">
              <div className="border-b border-black/5 dark:border-white/5 pb-3">
                <h2 className="font-sans font-bold text-base text-indigo-300">
                  Upload Study Materials
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select syllabus streaming group level and publish PDF booklets
                </p>
              </div>

              {/* Form panel */}
              <form
                onSubmit={handlePdfSubmit}
                className="bg-slate-50 dark:bg-slate-950/40 p-5 rounded-2xl border border-black/5 dark:border-white/5 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Class Year */}
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                      Academic Year Class
                    </label>
                    <select
                      id="pdf-class-select"
                      value={pdfClass}
                      onChange={(e) => setPdfClass(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="+1">Plus One (+1)</option>
                      <option value="+2">Plus Two (+2)</option>
                    </select>
                  </div>

                  {/* Course stream */}
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                      Syllabus Stream
                    </label>
                    <select
                      id="pdf-stream-select"
                      value={pdfStream}
                      onChange={(e) => setPdfStream(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="Computer Science">Computer Science</option>
                      <option value="Biology Science">Biology Science</option>
                    </select>
                  </div>

                  {/* Syllabus subject */}
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                      Syllabus Subject
                    </label>
                    <select
                      id="pdf-subject-select"
                      value={pdfSubject}
                      onChange={(e) => setPdfSubject(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="English">English</option>
                      <option value="Malayalam">Malayalam</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Biology">Biology</option>
                      <option value="Hindi">Hindi</option>
                      <option disabled>──────────</option>
                      <option value="Microbit - Onam Exam">Microbit - Onam Exam</option>
                      <option value="Microbit - Christmas Exam">Microbit - Christmas Exam</option>
                      <option value="Microbit - Annual Exam">Microbit - Annual Exam</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* File title */}
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                      PDF File Title
                    </label>
                    <input
                      id="pdf-title-input"
                      type="text"
                      placeholder="e.g. Chemical Bonds Chapter 4 booklet"
                      value={pdfTitle}
                      onChange={(e) => setPdfTitle(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-600 outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  {/* Device PDF Selector */}
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                      PDF Document Link OR File Upload
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="pdf-file-selector"
                        type="url"
                        placeholder="https://...link.pdf"
                        value={pdfLink}
                        onChange={(e) => setPdfLink(e.target.value)}
                        className="w-1/2 h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-600 outline-none focus:border-indigo-500/50"
                      />
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setPdfPhysicalFile(e.target.files ? e.target.files[0] : null)}
                        className="w-1/2 h-10 p-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <button
                  id="pdf-submit-btn"
                  type="submit"
                  disabled={submittingFile}
                  className="w-full h-11 rounded-xl bg-indigo-600 text-slate-900 dark:text-white font-sans font-bold text-xs hover:bg-indigo-500 disabled:opacity-50 transition-all cursor-pointer outline-none"
                >
                  {submittingFile
                    ? "Uploading File to Storage..."
                    : "Initialize Study Notes Upload"}
                </button>
              </form>

              {/* Uploaded study list index */}
              <div>
                <h3 className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-2">
                  My Uploaded Booklets
                </h3>
                <div className="space-y-2">
                  {pdfSyncList.map((pdf) => (
                    <div
                      key={pdf.id}
                      className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-between text-left font-sans text-xs"
                    >
                      <div className="flex gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block text-slate-900 dark:text-white font-bold">
                            {pdf.title}
                          </span>
                          <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                            {pdf.class}{" "}
                            {pdf.stream === "Computer Science" ? "CS" : "Bio"}{" "}
                            &bull; {pdf.subject}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePdf(pdf.id, pdf.fileName)}
                        className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: STUDY VIDEOS UPLOAD MANAGER */}
          {activeTab === "video_upload" && (
            <div className="space-y-6">
              <div className="border-b border-black/5 dark:border-white/5 pb-3">
                <h2 className="font-sans font-bold text-base text-indigo-300">
                  Upload Study Videos
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select syllabus streaming group level and publish Video material
                </p>
              </div>
              <form
                onSubmit={handleVideoSubmit}
                className="bg-slate-50 dark:bg-slate-950/40 p-5 rounded-3xl border border-black/5 dark:border-white/5 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Class Target */}
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                      Academic Class
                    </label>
                    <select
                      className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500/50"
                      value={videoClass}
                      onChange={(e) => setVideoClass(e.target.value as any)}
                    >
                      <option value="+1">Plus One (+1)</option>
                      <option value="+2">Plus Two (+2)</option>
                    </select>
                  </div>

                  {/* Stream Target */}
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                      Academic Stream
                    </label>
                    <select
                      className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500/50"
                      value={videoStream}
                      onChange={(e) => setVideoStream(e.target.value as any)}
                    >
                      <option value="Computer Science">Computer Science</option>
                      <option value="Biology Science">Biology Science</option>
                    </select>
                  </div>

                  {/* Subject Target */}
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                      Subject
                    </label>
                    <select
                      className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500/50"
                      value={videoSubject}
                      onChange={(e) => setVideoSubject(e.target.value as any)}
                    >
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Biology">Biology</option>
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Malayalam">Malayalam</option>
                      <option value="Computer Science">
                        Computer Science
                      </option>
                    </select>
                  </div>
                  {/* Chapter Target */}
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                      Chapter
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Current Electricity"
                      value={videoChapter}
                      onChange={(e) => setVideoChapter(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-600 outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Video part */}
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                      Video Part Number
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={videoPart}
                      onChange={(e) => setVideoPart(parseInt(e.target.value))}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  {/* Video title */}
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                      Material Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Introduction & Law"
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-600 outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  {/* Video Link */}
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                      YouTube Video URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://youtu.be/... or https://www.youtube.com/watch?v=..."
                      value={videoLink}
                      onChange={(e) => setVideoLink(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-600 outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={videoSubmitting}
                  className="w-full h-11 rounded-xl bg-indigo-600 text-slate-900 dark:text-white font-sans font-bold text-xs hover:bg-indigo-500 disabled:opacity-50 transition-all cursor-pointer outline-none"
                >
                  {videoSubmitting
                    ? "Publishing Video..."
                    : "Upload Study Video"}
                </button>
              </form>
            </div>
          )}

          {/* TAB: MICRO:BIT UPLOAD MANAGER */}
          {activeTab === "microbit_upload" && (
            <div className="space-y-6">
              <div className="border-b border-black/5 dark:border-white/5 pb-3">
                <h2 className="font-sans font-bold text-base text-indigo-300">
                  Micro:bit Uploads
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Upload micro:bit materials, exam cuttings, and short notes.
                </p>
              </div>

              <form
                onSubmit={handleMicrobitSubmit}
                className="bg-slate-50 dark:bg-slate-950/40 p-5 rounded-3xl border border-black/5 dark:border-white/5 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Class Target */}
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                      Academic Class
                    </label>
                    <select
                      className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500/50"
                      value={mbClass}
                      onChange={(e) => setMbClass(e.target.value as any)}
                    >
                      <option value="+1">Plus One (+1)</option>
                      <option value="+2">Plus Two (+2)</option>
                    </select>
                  </div>

                  {/* Stream Target */}
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                      Academic Stream
                    </label>
                    <select
                      className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500/50"
                      value={mbStream}
                      onChange={(e) => setMbStream(e.target.value as any)}
                    >
                      <option value="Computer Science">Computer Science</option>
                      <option value="Biology Science">Biology Science</option>
                    </select>
                  </div>

                  {/* Subject Target */}
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                      Exam Type Target
                    </label>
                    <select
                      className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500/50"
                      value={mbSubject}
                      onChange={(e) => setMbSubject(e.target.value as any)}
                    >
                      <option value="Microbit - Onam Exam">Onam Exam</option>
                      <option value="Microbit - Christmas Exam">Christmas Exam</option>
                      <option value="Microbit - Annual Exam">Annual Exam</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* File title */}
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                      Material Title
                    </label>
                    <input
                      id="mb-title-input"
                      type="text"
                      placeholder="e.g. Pre-Board Cheat Sheet"
                      value={mbTitle}
                      onChange={(e) => setMbTitle(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-600 outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  {/* Device PDF Selector */}
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                      Link OR File Upload
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="mb-file-selector"
                        type="url"
                        placeholder="https://..."
                        value={mbLink}
                        onChange={(e) => setMbLink(e.target.value)}
                        className="w-1/2 h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-600 outline-none focus:border-indigo-500/50"
                      />
                      <input
                        type="file"
                        onChange={(e) => setMbPhysicalFile(e.target.files ? e.target.files[0] : null)}
                        className="w-1/2 h-10 p-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <button
                  id="mb-submit-btn"
                  type="submit"
                  disabled={mbSubmittingFile}
                  className="w-full h-11 rounded-xl bg-indigo-600 text-slate-900 dark:text-white font-sans font-bold text-xs hover:bg-indigo-500 disabled:opacity-50 transition-all cursor-pointer outline-none"
                >
                  {mbSubmittingFile
                    ? "Uploading Data to Storage..."
                    : "Upload Micro:bit File"}
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: LIBRARY MANAGER */}
          {activeTab === "library" && (
            <div className="space-y-6">
              <div className="border-b border-black/5 dark:border-white/5 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="font-sans font-bold text-base text-indigo-300">
                    Global Library Notes Manager
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Select a section to view all subjects and instantly delete or edit
                    uploaded documents.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("pdf_upload")}
                  className="px-4 py-2 bg-indigo-500/10 text-indigo-400 text-xs font-semibold rounded-lg hover:bg-indigo-500/20 transition-colors"
                >
                  + Upload Note
                </button>
              </div>

              {/* Filters */}
              <div className="bg-slate-50 dark:bg-slate-950/40 p-5 rounded-2xl border border-black/5 dark:border-white/5 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                      Academic Class
                    </label>
                    <select
                      className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none"
                      value={libraryClass}
                      onChange={(e) => setLibraryClass(e.target.value as any)}
                    >
                      <option value="+1">Plus One (+1)</option>
                      <option value="+2">Plus Two (+2)</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                      Stream/Section
                    </label>
                    <select
                      className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none"
                      value={libraryStream}
                      onChange={(e) => setLibraryStream(e.target.value as any)}
                    >
                      <option value="Computer Science">Computer Science</option>
                      <option value="Biology Science">Biology</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Library View */}
              <div>
                <h3 className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-3">
                  Uploaded Topics & Files
                </h3>
                {libraryLoading ? (
                  <p className="text-xs text-indigo-300">
                    Loading library contents...
                  </p>
                ) : libraryPdfs.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No content found in this section.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {libraryPdfs.map((pdf) => (
                      <div
                        key={pdf.id}
                        className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl overflow-hidden flex flex-col"
                      >
                        {editingPdf?.id === pdf.id ? (
                          <div className="p-4 space-y-4">
                            <h4 className="text-xs font-bold text-sky-400">Edit Note Details</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] text-slate-500 font-semibold block mb-1">Title</label>
                                <input type="text" value={editingPdf.title} onChange={(e) => setEditingPdf({...editingPdf, title: e.target.value})} className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none" />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-500 font-semibold block mb-1">PDF Link</label>
                                <input type="url" value={editingPdf.pdfUrl} onChange={(e) => setEditingPdf({...editingPdf, pdfUrl: e.target.value})} className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none" />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-3">
                              <button onClick={() => setEditingPdf(null)} className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">Cancel</button>
                              <button onClick={handleUpdatePdfSubmit} disabled={editPdfSubmitting} className="px-4 py-2 rounded-lg text-xs font-semibold bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors">{editPdfSubmitting ? 'Saving...' : 'Save Changes'}</button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between text-left font-sans text-xs gap-3">
                            <div className="flex gap-3 w-full sm:w-auto">
                              <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                                <BookOpen className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="block text-slate-900 dark:text-white font-bold text-sm">
                                  {pdf.title}
                                </span>
                                <span className="text-[10px] text-amber-400 font-bold tracking-wide mt-0.5 block">
                                  {pdf.subject}
                                </span>
                                <span className="text-[9px] text-slate-600 dark:text-slate-400 font-mono block mt-0.5">
                                  {new Date(pdf.uploadedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto justify-end">
                              <button
                                onClick={() => handleEditPdf(pdf)}
                                className="p-2 sm:px-4 sm:py-2 flex items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 transition-colors font-semibold"
                              >
                                <Pencil className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Edit</span>
                              </button>
                              <button
                                onClick={() => {
                                  handleDeletePdf(pdf.id, pdf.fileName).then(() => {
                                    setLibraryPdfs((prev) =>
                                      prev.filter((p) => p.id !== pdf.id),
                                    );
                                  });
                                }}
                                className="p-2 sm:px-4 sm:py-2 flex items-center justify-center rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors font-semibold"
                              >
                                <Trash2 className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Delete</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: VIDEO LIBRARY MANAGER */}
          {activeTab === "video_library" && (
            <div className="space-y-6">
              <div className="border-b border-black/5 dark:border-white/5 pb-3">
                <h2 className="font-sans font-bold text-base text-indigo-300">
                  Global Video Library Manager
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select a section to view all subjects and instantly delete
                  uploaded videos.
                </p>
              </div>

              {/* Filters */}
              <div className="bg-slate-50 dark:bg-slate-950/40 p-5 rounded-2xl border border-black/5 dark:border-white/5 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                      Academic Class
                    </label>
                    <select
                      className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none"
                      value={libraryVideoClass}
                      onChange={(e) => setLibraryVideoClass(e.target.value as any)}
                    >
                      <option value="+1">Plus One (+1)</option>
                      <option value="+2">Plus Two (+2)</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                      Stream/Section
                    </label>
                    <select
                      className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none"
                      value={libraryVideoStream}
                      onChange={(e) => setLibraryVideoStream(e.target.value as any)}
                    >
                      <option value="Computer Science">Computer Science</option>
                      <option value="Biology Science">Biology</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Library View */}
              <div>
                <h3 className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-3">
                  Uploaded Videos
                </h3>
                {libraryVideoLoading ? (
                  <p className="text-xs text-indigo-300">
                    Loading video library contents...
                  </p>
                ) : libraryVideos.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No videos found in this section.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {libraryVideos.map((video) => (
                      <div key={video.id} className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl overflow-hidden">
                        {editingVideo?.id === video.id ? (
                           <div className="p-4 space-y-4">
                             <h4 className="text-xs font-bold text-indigo-400">Edit Video details</h4>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                   <label className="text-[10px] text-slate-500 font-semibold block mb-1">Title</label>
                                   <input type="text" value={editingVideo.title} onChange={(e) => setEditingVideo({...editingVideo, title: e.target.value})} className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none" />
                                </div>
                                <div>
                                   <label className="text-[10px] text-slate-500 font-semibold block mb-1">Chapter</label>
                                   <input type="text" value={editingVideo.chapter} onChange={(e) => setEditingVideo({...editingVideo, chapter: e.target.value})} className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none" />
                                </div>
                                <div>
                                   <label className="text-[10px] text-slate-500 font-semibold block mb-1">Part</label>
                                   <input type="number" value={editingVideo.part} onChange={(e) => setEditingVideo({...editingVideo, part: parseInt(e.target.value)})} className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none" />
                                </div>
                                <div>
                                   <label className="text-[10px] text-slate-500 font-semibold block mb-1">YouTube Link</label>
                                   <input type="url" value={editingVideo.videoUrl || (editingVideo as any).link || ""} onChange={(e) => setEditingVideo({...editingVideo, videoUrl: e.target.value, link: e.target.value} as any)} className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none" />
                                </div>
                             </div>
                             <div className="flex justify-end gap-2 mt-3">
                                <button onClick={() => setEditingVideo(null)} className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">Cancel</button>
                                <button onClick={handleUpdateVideoSubmit} disabled={editVideoSubmitting} className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors">{editVideoSubmitting ? 'Saving...' : 'Save Changes'}</button>
                             </div>
                           </div>
                        ) : (
                          <div className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between text-left font-sans text-xs gap-3">
                            <div className="flex gap-3 w-full sm:w-auto">
                              <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                                <Video className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="block text-slate-900 dark:text-white font-bold text-sm">
                                  {video.title}
                                </span>
                                <span className="text-[10px] text-amber-400 font-bold tracking-wide mt-0.5 block">
                                  {video.subject} &bull; {video.chapter} (Part {video.part})
                                </span>
                                <span className="text-[9px] text-slate-600 dark:text-slate-400 font-mono block mt-0.5">
                                  {new Date(video.uploadedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto justify-end">
                              <button
                                onClick={() => setEditingVideo(video)}
                                className="p-2 sm:px-4 sm:py-2 flex items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-colors font-semibold"
                              >
                                <Pencil className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Edit</span>
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteVideo(video.id).then(() => {
                                    setLibraryVideos((prev) =>
                                      prev.filter((p) => p.id !== video.id),
                                    );
                                  });
                                }}
                                className="p-2 sm:px-4 sm:py-2 flex items-center justify-center rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors font-semibold"
                              >
                                <Trash2 className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Delete</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: BANNER PROMO MANAGEMENT */}
          {activeTab === "banner" && (
            <div className="space-y-6">
              <div className="border-b border-black/5 dark:border-white/5 pb-3">
                <h2 className="font-sans font-bold text-base text-indigo-300">
                  Banner Ads & Slide Announcements
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Deploy landing ads to welcome and guide students
                </p>
              </div>

              <form
                onSubmit={handleBannerSubmit}
                className="bg-slate-50 dark:bg-slate-950/40 p-5 rounded-2xl border border-black/5 dark:border-white/5 space-y-4"
              >
                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                    Banner Image Link
                  </label>
                  <input
                    id="banner-file-selector"
                    type="url"
                    placeholder="https://example.com/banner.png"
                    value={bannerLink}
                    onChange={(e) => setBannerLink(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-600 outline-none focus:border-indigo-500/50"
                  />
                </div>

                <button
                  id="banner-submit-btn"
                  type="submit"
                  className="w-full h-11 rounded-xl bg-indigo-600 text-slate-900 dark:text-white font-sans font-bold text-xs hover:bg-indigo-500 transition-colors cursor-pointer"
                >
                  Publish Promo Banner Slider
                </button>
              </form>

              {/* Banners inventory */}
              <div>
                <h3 className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 block tracking-wider mb-2">
                  Live Home Promo Slider
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bannersList.map((banner) => (
                    <div
                      key={banner.id}
                      className="relative rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden bg-slate-50 dark:bg-slate-950 aspect-[2/1]"
                    >
                      <img
                        referrerPolicy="no-referrer"
                        src={banner.imageUrl}
                        alt="Banner"
                        className="w-full h-full object-cover brightness-[0.4]"
                      />
                      <div className="absolute inset-0 flex flex-col justify-end p-4">
                        <div className="flex items-center justify-between mt-2.5">
                          <span className="text-[9px] font-mono text-emerald-400">
                            ACtIVE BANNER
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] text-gray-500 font-mono">
                              ID: {banner.id}
                            </span>
                            <button
                              onClick={() => handleDeleteBanner(banner.id)}
                              className="ml-2 px-2 py-1 rounded bg-rose-500/20 text-rose-400 text-[9px] font-bold uppercase transition-colors hover:bg-rose-500/30"
                            >
                              Turn Off
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SUBSCRIPTIONS CONTROLLER */}
          {activeTab === "sub_manage" && (
            <div className="space-y-6">
              <div className="border-b border-black/5 dark:border-white/5 pb-3">
                <h2 className="font-sans font-bold text-base text-indigo-300">
                  Syllabus Premium Subscriptions
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Toggle student search indexing and PDF study document
                  unlocking permissions
                </p>
              </div>

              {studentsList.filter((s) => s.status === "approved").length ===
              0 ? (
                <div className="text-center py-12">
                  <span className="text-xs text-gray-500">
                    Only approved students are listable in Subscription
                    management registers.
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  {studentsList
                    .filter((s) => s.status === "approved")
                    .map((stud) => {
                      // Pre-find matching subscription state
                      return (
                        <div
                          key={stud.uid}
                          className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-between gap-4 font-sans text-xs"
                        >
                          <div className="flex items-center gap-3.5 text-left">
                            <img
                              referrerPolicy="no-referrer"
                              src={
                                stud.profileImage ||
                                "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
                              }
                              alt={stud.name}
                              className="w-10 h-10 rounded-xl"
                            />
                            <div>
                              <span className="block text-slate-900 dark:text-white font-bold">
                                {stud.name}
                              </span>
                              <span className="block text-indigo-300 text-[10.5px] font-semibold">
                                {stud.class} {stud.stream}
                              </span>
                            </div>
                          </div>

                          {/* Subscription toggler matches Screenshot logic */}
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                              Toggle Stream Study Access
                            </span>

                            <button
                              id={`toggle-sub-btn-${stud.uid}`}
                              onClick={
                                () =>
                                  handleToggleSub(
                                    stud.uid,
                                    "active",
                                  ) /* Simple simulator toggle uses local matching */
                              }
                              className="p-1 px-3 rounded-xl bg-indigo-600/10 border border-indigo-600/20 text-indigo-300 font-sans font-bold text-xxs tracking-wider hover:bg-indigo-600/20 transition-all cursor-pointer"
                            >
                              Toggle Subscription Status
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: PAGES CONFIG */}
          {activeTab === "pages_config" && (
            <div className="space-y-6">
              <div className="border-b border-black/5 dark:border-white/5 pb-3">
                <h2 className="font-sans font-bold text-base text-indigo-300">
                  Global App Configuration
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage static pages and content settings
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2">Global App Logo URL</label>
                  <input
                    type="url"
                    value={appLogoUrl}
                    onChange={(e) => setAppLogoUrl(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-600 outline-none focus:border-indigo-500/50"
                    placeholder="https://...logo.png"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">This will display in the top left corner instead of the default book icon.</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2">About Learning With NRK (Text)</label>
                  <textarea
                    value={aboutText}
                    onChange={(e) => setAboutText(e.target.value)}
                    className="w-full h-32 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-600 outline-none focus:border-indigo-500/50"
                    placeholder="Enter About Us content here..."
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2">Help and Support Contact (Text)</label>
                  <textarea
                    value={helpText}
                    onChange={(e) => setHelpText(e.target.value)}
                    className="w-full h-32 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-600 outline-none focus:border-indigo-500/50"
                    placeholder="Enter Help & Support details here..."
                  />
                </div>
                
                <button
                  onClick={async () => {
                    try {
                      await updateAppConfig({ aboutText, helpText, subjectIcons, appLogoUrl });
                      triggerToast("Pages Configuration Updated!");
                    } catch (e) {
                      console.error(e);
                      alert("Failed to save config.");
                    }
                  }}
                  className="w-full h-11 rounded-xl bg-indigo-600 text-white font-sans font-bold text-xs hover:bg-indigo-500 transition-colors shadow-lg cursor-pointer flex items-center justify-center"
                >
                  Save Pages Configuration
                </button>
              </div>
            </div>
          )}

          {/* TAB 7: SUBJECT LOGOS CONFIG */}
          {activeTab === "subject_logos" && (
            <div className="space-y-6">
              <div className="border-b border-black/5 dark:border-white/5 pb-3">
                <h2 className="font-sans font-bold text-base text-indigo-300">
                  Subject Logos Configuration
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Set custom icon URLs for each subject (e.g. from an image hosting site).
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {["Physics", "Chemistry", "Mathematics", "English", "Malayalam", "Hindi", "Computer Science", "Biology"].map((sub) => (
                      <div key={sub} className="flex flex-col gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{sub}</span>
                        <div className="flex items-center gap-3">
                          {subjectIcons[sub] ? (
                            <img src={subjectIcons[sub]} alt={sub} className="w-10 h-10 object-contain rounded-lg bg-black/5 dark:bg-white/5 p-1" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-black/5 dark:bg-white/5 border border-dashed border-black/20 dark:border-white/20 flex flex-col items-center justify-center text-slate-400">
                              <Image className="w-4 h-4" />
                            </div>
                          )}
                          <div className="flex-1 flex flex-col gap-2">
                            <input
                              type="url"
                              placeholder="https://...icon.png"
                              value={subjectIcons[sub] || ""}
                              onChange={(e) => setSubjectIcons({ ...subjectIcons, [sub]: e.target.value })}
                              className="w-full h-9 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-600 outline-none focus:border-indigo-500/50"
                            />
                            <button 
                              onClick={async () => {
                                const newIcons = { ...subjectIcons };
                                delete newIcons[sub];
                                setSubjectIcons(newIcons);
                              }}
                              className="text-left text-[10px] text-rose-500 hover:text-rose-600 font-semibold w-fit"
                            >
                              Clear Icon
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await updateAppConfig({ aboutText, helpText, subjectIcons, appLogoUrl });
                      triggerToast("Subject Logos Updated!");
                    } catch (e) {
                      console.error(e);
                      alert("Failed to save config.");
                    }
                  }}
                  className="w-full h-11 rounded-xl bg-indigo-600 text-white font-sans font-bold text-xs hover:bg-indigo-500 transition-colors shadow-lg cursor-pointer flex items-center justify-center"
                >
                  Save Subject Logos
                </button>
              </div>
            </div>
          )}

          {/* TAB 8: NOTIFICATIONS CONFIG */}
          {activeTab === "notification_config" && (
            <div className="space-y-6">
              <div className="border-b border-black/5 dark:border-white/5 pb-3">
                <h2 className="font-sans font-bold text-base text-indigo-300">
                  Notification Settings
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage the notifications box title and add new notifications for all students.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2">Notification Box Title</label>
                  <input
                    type="text"
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-600 outline-none focus:border-indigo-500/50"
                    placeholder="E.g. Notifications or New Updates"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0">Push New Notification</label>
                    <button 
                      onClick={() => {
                        const newNotifs = [...notifications, { id: "notif_" + Date.now(), content: "", date: new Date().toISOString() }];
                        setNotifications(newNotifs);
                      }}
                      className="text-xs font-bold text-indigo-500 hover:text-indigo-400 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Message
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {notifications.map((notif, index) => (
                      <div key={notif.id} className="relative p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl flex gap-3">
                        <textarea
                          value={notif.content}
                          onChange={(e) => {
                            const newNotifs = [...notifications];
                            newNotifs[index].content = e.target.value;
                            setNotifications(newNotifs);
                          }}
                          className="flex-1 min-h-[60px] p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 text-xs text-slate-900 dark:text-white placeholder-slate-600 outline-none focus:border-indigo-500/50"
                          placeholder="Type notification message..."
                        />
                        <button
                          onClick={() => {
                            const newNotifs = [...notifications];
                            newNotifs.splice(index, 1);
                            setNotifications(newNotifs);
                          }}
                          className="self-start p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div className="text-xs text-slate-500 py-4 text-center border border-dashed border-slate-300 dark:border-white/10 rounded-xl">
                        No active notifications. Click "Add Message" to create one.
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={async () => {
                    try {
                      await updateAppConfig({ aboutText, helpText, subjectIcons, appLogoUrl, notificationTitle, notifications });
                      triggerToast("Notifications Saved!");
                    } catch (e) {
                      console.error(e);
                      alert("Failed to save config.");
                    }
                  }}
                  className="w-full h-11 rounded-xl bg-indigo-600 text-white font-sans font-bold text-xs hover:bg-indigo-500 transition-colors shadow-lg cursor-pointer flex items-center justify-center"
                >
                  Save Notification Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
