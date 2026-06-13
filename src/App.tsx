import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Home as HomeIcon, Settings as SettingsIcon, BookOpen, RefreshCw, Sun, Moon, Video } from "lucide-react";
import { Student } from "./types";
import { auth, logoutUser, fetchStudentProfile, listenStudentProfile, getOrCreateDeviceId } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useTheme } from "./ThemeContext";

import Login from "./components/Login";
import WaitingRoom from "./components/WaitingRoom";
import Home from "./components/Home";
import Settings from "./components/Settings";
import Admin from "./components/Admin";
import AIAssistant from "./components/AIAssistant";
import VideoClass from "./components/VideoClass";
import MicroBit from "./components/MicroBit";
import { PaperCutsIcon } from "./components/PaperCutsIcon";

export default function App() {
  const [sessionState, setSessionState] = useState<"splash" | "login" | "waiting" | "portal" | "admin">("splash");
  const [currentUser, setCurrentUser] = useState<Student | null>(null);
  const [currentTab, setCurrentTab] = useState<"home" | "settings" | "video" | "microbit">("home");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    // Attempt fast local resume to avoid flicker
    const cachedProfileData = localStorage.getItem("lrnk_student_profile");
    if (cachedProfileData) {
      try {
        const student = JSON.parse(cachedProfileData);
        setCurrentUser(student);
        setCurrentTab("home");
        if (student.status === "approved" || student.status === "pending") {
          setSessionState("portal");
        } else {
          setSessionState("waiting");
        }
      } catch (e) {
        // ignore parse error
      }
    }

    if (!auth) {
      if (!cachedProfileData) setSessionState("login");
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profile = await fetchStudentProfile(user.uid);
          if (profile) {
            handleLoginSuccess(profile);
          } else {
            if (!cachedProfileData) setSessionState("login");
          }
        } catch (error) {
          console.error("Error fetching profile on init:", error);
          if (!cachedProfileData) setSessionState("login");
        }
      } else {
        // Only redirect to login if there is no cached student profile in the browser.
        // This ensures the student remains logged in even if the iframe blocks Firebase Auth's local persistence.
        if (!cachedProfileData) {
          setSessionState("login");
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) return;
    
    // Real-time listener for current user profile changes
    const unsubscribe = listenStudentProfile(currentUser.uid, (freshProfile) => {
      if (freshProfile) {
        handleProfilUpdated(freshProfile);

        const localDeviceId = getOrCreateDeviceId();
        if (freshProfile.activeDeviceId && freshProfile.activeDeviceId !== localDeviceId) {
          // Another device has logged in
          handleLogout();
          alert("Your account was logged in from another device. For security, you have been logged out on this device.");
          return;
        }

        if (freshProfile.status === "blocked") {
          setSessionState((prev) => (prev === "admin" ? "admin" : "waiting"));
        } else if (freshProfile.status === "approved" || freshProfile.status === "pending") {
          setSessionState((prev) => (prev === "admin" ? "admin" : "portal"));
        }
      }
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Sign out user session
  const handleLogout = async () => {
    localStorage.removeItem("lrnk_student_profile");
    await logoutUser();
    setCurrentUser(null);
    setSessionState("login");
    setSelectedSubject(null);
  };

  const handleLoginSuccess = (student: Student) => {
    localStorage.setItem("lrnk_student_profile", JSON.stringify(student));
    setCurrentUser(student);
    // User wants to always go to home page
    setCurrentTab("home");
    
    if (student.status === "approved" || student.status === "pending") {
      setSessionState("portal");
    } else {
      setSessionState("waiting");
    }
  };

  const handleStudentApprovedByPing = (approvedStudent: Student) => {
    localStorage.setItem("lrnk_student_profile", JSON.stringify(approvedStudent));
    setCurrentUser(approvedStudent);
    setSessionState("portal");
  };

  const handleProfilUpdated = (updatedStudent: Student) => {
    localStorage.setItem("lrnk_student_profile", JSON.stringify(updatedStudent));
    setCurrentUser(updatedStudent);
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white selection:bg-indigo-500/30 selection:text-slate-900 dark:text-white">
      <AnimatePresence mode="wait">
        
        {/* Splash loading screen */}
        {sessionState === "splash" && (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950"
          >
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </motion.div>
        )}

        {/* Login authentication screen */}
        {sessionState === "login" && (
          <Login
            onSuccess={handleLoginSuccess}
            onAdminOpen={() => setSessionState("admin")}
          />
        )}

        {/* Multi-screen student waiting approval interface */}
        {sessionState === "waiting" && currentUser && (
          <WaitingRoom
            student={currentUser}
            onApproved={handleStudentApprovedByPing}
            onLogout={handleLogout}
            onAdminOpen={() => setSessionState("admin")}
          />
        )}

        {/* Global Admin Suite Workspace */}
        {sessionState === "admin" && (
          <Admin 
            onReturn={() => setSessionState("login")} 
          />
        )}

        {/* Student Educational Portal (Home & Settings navigation) */}
        {sessionState === "portal" && currentUser && (
          <motion.div
            key="portal-frame"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col justify-between"
          >
            {showAIAssistant ? (
              <AIAssistant student={currentUser} onBackToHome={() => setShowAIAssistant(false)} />
            ) : (
              <>
                {/* Top branding bar */}
                <header className="px-6 py-4 border-b border-black/5 dark:border-white/5 bg-slate-50 dark:bg-slate-950 sticky top-0 z-30 flex items-center justify-between shadow-sm dark:shadow-none">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-indigo-500" />
                    <h1 className="font-sans font-black text-[15px] tracking-tight text-slate-900 dark:text-white uppercase">Learning With NRK</h1>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {currentUser?.class && currentUser?.stream && (
                      <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] text-indigo-600 dark:text-indigo-400/80 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-2 py-1 rounded-full uppercase tracking-wider font-bold">
                        <span>{currentUser.class} {currentUser.stream === "Computer Science" ? "CS" : "BIO"}</span>
                      </div>
                    )}
                    <button
                      onClick={toggleTheme}
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-200 dark:border-white/10 hover:text-indigo-600 transition-colors"
                      title="Toggle Theme"
                    >
                      {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={async () => {
                        if (currentUser) {
                          const updatedProfile = await import("./firebase").then(m => m.fetchStudentProfile(currentUser.uid));
                          if (updatedProfile) {
                            handleProfilUpdated(updatedProfile);
                          }
                        }
                      }}
                      className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-200 dark:border-white/10 hover:text-indigo-600 transition-colors"
                      title="Refresh User Data"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </header>

                {/* Core scrollable body */}
                <main className="flex-1 overflow-y-auto">
                  {currentTab === "home" && (
                    <Home
                      student={currentUser}
                      selectedSubject={selectedSubject}
                      onSubjectSelect={(sub) => setSelectedSubject(sub)}
                      onBackToHome={() => setSelectedSubject(null)}
                      onOpenAI={() => setShowAIAssistant(true)}
                    />
                  )}
                  {currentTab === "video" && (
                    <VideoClass />
                  )}
                  {currentTab === "microbit" && (
                    <MicroBit />
                  )}
                  {currentTab === "settings" && (
                    <Settings
                      student={currentUser}
                      onProfileUpdate={handleProfilUpdated}
                      onLogout={handleLogout}
                    />
                  )}
                </main>

                {/* Professional curved bottom navigation tab custom component (exactly matching screenshots 2 & 3) */}
                <nav id="bottom-navigation-bar" className="fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 flex items-center justify-around h-20 px-6 pb-2.5 z-40 rounded-t-[32px] shadow-[0_-4px_25px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_25px_rgba(0,0,0,0.5)]">
                  
                  {/* Home Tab controller */}
                  <button
                    id="bottom-tab-home-btn"
                    onClick={() => {
                      setCurrentTab("home");
                      setSelectedSubject(null);
                    }}
                    className={`flex flex-col items-center justify-center gap-1 min-w-[70px] outline-none cursor-pointer`}
                  >
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                      currentTab === "home"
                        ? "bg-gradient-to-tr from-pink-500 via-rose-500 to-red-500 shadow-lg shadow-rose-500/20 text-white scale-110"
                        : "text-slate-500 dark:text-slate-400 hover:text-gray-600 dark:hover:text-gray-300"
                    }`}>
                      <HomeIcon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-sans font-bold ${
                      currentTab === "home" ? "text-rose-600 dark:text-rose-400 scale-102" : "text-slate-500 dark:text-slate-400"
                    }`}>
                      Home
                    </span>
                  </button>

                  {/* Micro-bit Tab controller */}
                  <button
                    onClick={() => {
                      setCurrentTab("microbit");
                      setSelectedSubject(null);
                    }}
                    className={`flex flex-col items-center justify-center gap-1 min-w-[70px] outline-none cursor-pointer`}
                  >
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                      currentTab === "microbit"
                        ? "bg-gradient-to-tr from-pink-500 via-rose-500 to-red-500 shadow-lg shadow-rose-500/20 text-white scale-110"
                        : "text-slate-500 dark:text-slate-400 hover:text-gray-600 dark:hover:text-gray-300"
                    }`}>
                      <PaperCutsIcon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-sans font-bold ${
                      currentTab === "microbit" ? "text-rose-600 dark:text-rose-400 scale-102" : "text-slate-500 dark:text-slate-400"
                    }`}>
                      Micro-bit
                    </span>
                  </button>

                  {/* Video Class Tab controller */}
                  <button
                    id="bottom-tab-video-btn"
                    onClick={() => {
                      setCurrentTab("video");
                      setSelectedSubject(null);
                    }}
                    className={`flex flex-col items-center justify-center gap-1 min-w-[70px] outline-none cursor-pointer`}
                  >
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                      currentTab === "video"
                        ? "bg-gradient-to-tr from-pink-500 via-rose-500 to-red-500 shadow-lg shadow-rose-500/20 text-white scale-110"
                        : "text-slate-500 dark:text-slate-400 hover:text-gray-600 dark:hover:text-gray-300"
                    }`}>
                      <Video className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-sans font-bold ${
                      currentTab === "video" ? "text-rose-600 dark:text-rose-400 scale-102" : "text-slate-500 dark:text-slate-400"
                    }`}>
                      Video Class
                    </span>
                  </button>

                  {/* Settings Tab controller */}
                  <button
                    id="bottom-tab-settings-btn"
                    onClick={() => {
                      setCurrentTab("settings");
                      setSelectedSubject(null);
                    }}
                    className="flex flex-col items-center justify-center gap-1 min-w-[70px] outline-none cursor-pointer"
                  >
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                      currentTab === "settings"
                        ? "bg-gradient-to-tr from-pink-500 via-rose-500 to-red-500 shadow-lg shadow-rose-500/20 text-white scale-110"
                        : "text-slate-500 dark:text-slate-400 hover:text-gray-600 dark:hover:text-gray-300"
                    }`}>
                      <SettingsIcon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-sans font-bold ${
                      currentTab === "settings" ? "text-rose-600 dark:text-rose-400 scale-102" : "text-slate-500 dark:text-slate-400"
                    }`}>
                      Settings
                    </span>
                  </button>

                </nav>
              </>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
