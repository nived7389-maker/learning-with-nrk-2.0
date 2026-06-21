import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Home as HomeIcon, Settings as SettingsIcon, BookOpen, RefreshCw, Sun, Moon, Video, UserCircle, Bell, X } from "lucide-react";
import { Student } from "./types";
import { auth, logoutUser, fetchStudentProfile, listenStudentProfile, getOrCreateDeviceId, listenAppConfig } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useTheme } from "./ThemeContext";

import Login from "./components/Login";
import WaitingRoom from "./components/WaitingRoom";
import Home from "./components/Home";
import Settings from "./components/Settings";
import Admin from "./components/Admin";
import AIAssistant from "./components/AIAssistant";
import NotesView from "./components/NotesView";
import MicroBit from "./components/MicroBit";
import { PaperCutsIcon } from "./components/PaperCutsIcon";
import Onboarding from "./components/Onboarding";

export default function App() {
  const [sessionState, setSessionState] = useState<"splash" | "login" | "waiting" | "portal" | "admin">("splash");
  const [currentUser, setCurrentUser] = useState<Student | null>(null);
  const [currentTab, setCurrentTab] = useState<"home" | "settings" | "video" | "microbit">("home");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSuperCoins, setShowSuperCoins] = useState(false);
  const [appConfig, setAppConfig] = useState<any>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string>("default");

  // Sync / check permission on load and request default
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === "default") {
        Notification.requestPermission()
          .then((permission) => setNotificationPermission(permission))
          .catch((err) => console.error("Error requesting notifications permission:", err));
      }
    }
  }, []);

  // Request browser permission manually if needed
  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const p = await Notification.requestPermission();
        setNotificationPermission(p);
      } catch (err) {
        console.error("Failed to request permission", err);
      }
    }
  };

  // Monitor incoming notifications and trigger a real device notification popup
  useEffect(() => {
    if (!appConfig?.notifications || !Array.isArray(appConfig.notifications)) return;

    let notifiedIds: string[] = [];
    const isFirstRun = !localStorage.getItem("lrnk_notified_ids");

    if (!isFirstRun) {
      try {
        const stored = localStorage.getItem("lrnk_notified_ids");
        if (stored) {
          notifiedIds = JSON.parse(stored);
        }
      } catch (e) {
        // ignore
      }
    }

    const currentNotifiedSet = new Set(notifiedIds);
    let changed = false;

    // Loop through notifications and trigger native OS push if we have permission
    appConfig.notifications.forEach((notif: any) => {
      if (!notif || !notif.id || !notif.content) return;

      if (!currentNotifiedSet.has(notif.id)) {
        currentNotifiedSet.add(notif.id);
        notifiedIds.push(notif.id);
        changed = true;

        if (!isFirstRun) {
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            try {
              new Notification(appConfig.notificationTitle || "Learning With NRK", {
                body: notif.content,
                icon: appConfig.appLogoUrl || "/logo.png",
              });
            } catch (err) {
              console.error("Failed to trigger visual notification:", err);
            }
          }
        }
      }
    });

    if (changed || isFirstRun) {
      try {
        // keep only last 100 notified IDs to prevent localStorage bloat
        if (notifiedIds.length > 100) {
          notifiedIds = notifiedIds.slice(notifiedIds.length - 100);
        }
        localStorage.setItem("lrnk_notified_ids", JSON.stringify(notifiedIds));
      } catch (e) {
        // ignore
      }
    }
  }, [appConfig?.notifications, appConfig?.notificationTitle, appConfig?.appLogoUrl]);

  useEffect(() => {
    const unsubConfig = listenAppConfig((config) => {
      setAppConfig(config);
    });
    return () => unsubConfig();
  }, []);

  useEffect(() => {
    // Attempt fast local resume to avoid flicker
    const isAdminActive = localStorage.getItem("lrnk_admin_session") === "true";
    if (isAdminActive) {
      setSessionState("admin");
      return;
    }

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
      // If we are already in admin view because of local storage, ignore automatic student sign in flows
      if (localStorage.getItem("lrnk_admin_session") === "true") {
        return;
      }
      if (user) {
        try {
          const profile = await fetchStudentProfile(user.uid);
          if (profile) {
            handleLoginSuccess(profile, false); // Auto-resume, not explicit login
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

  const handleLoginSuccess = (student: Student, isExplicitLogin: boolean = false, justSignedUp: boolean = false) => {
    localStorage.setItem("lrnk_student_profile", JSON.stringify(student));
    setCurrentUser(student);
    // User wants to always go to home page
    setCurrentTab("home");
    
    if (student.status === "approved" || student.status === "pending") {
      setSessionState("portal");
      if (justSignedUp || isExplicitLogin) {
        setShowOnboarding(true);
      }
    } else {
      setSessionState("waiting");
    }
  };

  const handleStudentApprovedByPing = (approvedStudent: Student) => {
    localStorage.setItem("lrnk_student_profile", JSON.stringify(approvedStudent));
    setCurrentUser(approvedStudent);
    setSessionState("portal");
    setShowOnboarding(true);
  };

  const handleProfilUpdated = (updatedStudent: Student) => {
    localStorage.setItem("lrnk_student_profile", JSON.stringify(updatedStudent));
    setCurrentUser(updatedStudent);
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white selection:bg-indigo-500/30 selection:text-slate-900 dark:text-white">
      <AnimatePresence mode="wait">
        
        {/* Onboarding Flow */}
        {showOnboarding && sessionState === "portal" && (
          <Onboarding 
            onComplete={() => setShowOnboarding(false)} 
            onCancel={() => setShowOnboarding(false)} 
          />
        )}

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
            onSuccess={(student, justSignedUp) => handleLoginSuccess(student, true, justSignedUp)}
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
            onReturn={() => {
              localStorage.removeItem("lrnk_admin_session");
              setSessionState("login");
            }} 
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
                    {appConfig?.appLogoUrl ? (
                      <img src={appConfig.appLogoUrl} alt="App Logo" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <BookOpen className="w-6 h-6 text-indigo-500" />
                    )}
                    <h1 className="font-sans font-black text-[15px] tracking-tight text-slate-900 dark:text-white uppercase">Learning With NRK</h1>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {currentUser?.class && currentUser?.stream && (
                      <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] text-indigo-600 dark:text-indigo-400/80 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-2 py-1 rounded-full uppercase tracking-wider font-bold">
                        <span>{currentUser.class} {currentUser.stream === "Computer Science" ? "CS" : "BIO"}</span>
                      </div>
                    )}
                    
                    {/* Top Super Coin Header option near the refresh option */}
                    <button
                      id="top-super-coin-header-btn"
                      onClick={() => {
                        setCurrentTab("home");
                        setSelectedSubject(null);
                        setShowSuperCoins(true);
                      }}
                      className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 dark:from-amber-600 dark:to-yellow-500 hover:from-amber-300 hover:to-amber-500 text-white font-sans font-black text-[10.5px] px-2.5 py-1 rounded-full shadow-[0_3px_12px_rgba(245,158,11,0.2)] dark:shadow-[0_3px_12px_rgba(245,158,11,0.4)] border border-yellow-300 dark:border-yellow-500/40 cursor-pointer transition-all outline-none group shrink-0 active:scale-95"
                      title="Super Coin Balance & Rewards"
                    >
                      <motion.div
                        animate={{ rotateY: 360 }}
                        transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                        className="w-4 h-4 rounded-full bg-yellow-100 flex items-center justify-center border border-yellow-450 text-[8px] font-black text-amber-600 shadow-inner shrink-0"
                      >
                        ⚡
                      </motion.div>
                      <span className="font-sans font-extrabold select-none tracking-wider text-[10px] pr-0.5 uppercase hidden xs:inline">Coins</span>
                      <span className="font-mono bg-amber-950/30 px-1.5 py-0.5 rounded-full font-black text-white text-[10px]">
                        {currentUser?.superCoins || 0}
                      </span>
                    </button>

                    <button
                      onClick={async () => {
                        if (currentUser && !isRefreshing) {
                          setIsRefreshing(true);
                          try {
                            const updatedProfile = await import("./firebase").then(m => m.fetchStudentProfile(currentUser.uid));
                            if (updatedProfile) {
                              handleProfilUpdated(updatedProfile);
                            }
                          } finally {
                            // Give it a minimum spin time so it feels responsive
                            setTimeout(() => setIsRefreshing(false), 600);
                          }
                        }
                      }}
                      className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-200 dark:border-white/10 hover:text-indigo-600 transition-colors"
                      title="Refresh User Data"
                      disabled={isRefreshing}
                    >
                      <motion.div
                        animate={{ rotate: isRefreshing ? 360 : 0 }}
                        transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0, ease: "linear" }}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </motion.div>
                    </button>
                    <button
                      onClick={() => setShowNotifications(true)}
                      className="relative w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-white/10 hover:text-indigo-600 transition-colors"
                      title="Notifications"
                    >
                      <Bell className="w-4 h-4" />
                      {appConfig?.notifications?.length > 0 && (
                        <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-slate-50 dark:border-slate-950 rounded-full"></span>
                      )}
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
                      onBackToHome={() => {
                        if (selectedSubject?.startsWith("Microbit -")) {
                          setCurrentTab("microbit");
                        }
                        setSelectedSubject(null);
                      }}
                      onOpenAI={() => setShowAIAssistant(true)}
                      showSuperCoinPage={showSuperCoins}
                      onCloseSuperCoinPage={() => setShowSuperCoins(false)}
                    />
                  )}
                  {currentTab === "video" && (
                    <NotesView student={currentUser} />
                  )}
                  {currentTab === "microbit" && (
                    <MicroBit 
                      onSubjectSelect={(sub) => {
                        setSelectedSubject(sub);
                        setCurrentTab("home");
                      }}
                    />
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
                      (currentTab === "home" && !selectedSubject?.startsWith("Microbit"))
                        ? "bg-gradient-to-tr from-pink-500 via-rose-500 to-red-500 shadow-lg shadow-rose-500/20 text-white scale-110"
                        : "text-slate-500 dark:text-slate-400 hover:text-gray-600 dark:hover:text-gray-300"
                    }`}>
                      <HomeIcon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-sans font-bold ${
                      (currentTab === "home" && !selectedSubject?.startsWith("Microbit")) ? "text-rose-600 dark:text-rose-400 scale-102" : "text-slate-500 dark:text-slate-400"
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
                      (currentTab === "microbit" || (currentTab === "home" && selectedSubject?.startsWith("Microbit")))
                        ? "bg-gradient-to-tr from-pink-500 via-rose-500 to-red-500 shadow-lg shadow-rose-500/20 text-white scale-110"
                        : "text-slate-500 dark:text-slate-400 hover:text-gray-600 dark:hover:text-gray-300"
                    }`}>
                      <PaperCutsIcon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-sans font-bold ${
                      (currentTab === "microbit" || (currentTab === "home" && selectedSubject?.startsWith("Microbit"))) ? "text-rose-600 dark:text-rose-400 scale-102" : "text-slate-500 dark:text-slate-400"
                    }`}>
                      Micro-bit
                    </span>
                  </button>

                  {/* Notes Tab controller */}
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
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-sans font-bold ${
                      currentTab === "video" ? "text-rose-600 dark:text-rose-400 scale-102" : "text-slate-500 dark:text-slate-400"
                    }`}>
                      Notes
                    </span>
                  </button>

                  {/* Profile Tab controller */}
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
                      <UserCircle className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-sans font-bold ${
                      currentTab === "settings" ? "text-rose-600 dark:text-rose-400 scale-102" : "text-slate-500 dark:text-slate-400"
                    }`}>
                      Profile
                    </span>
                  </button>

                </nav>

                {/* Notifications Modal */}
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                      onClick={() => setShowNotifications(false)}
                    >
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative max-h-[80vh] flex flex-col"
                      >
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="absolute top-4 right-4 z-10 p-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                        
                        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-4 mb-2">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Bell className="w-5 h-5" />
                          </div>
                          <h2 className="font-sans font-bold text-lg text-slate-900 dark:text-white">
                            {appConfig?.notificationTitle || "Notifications"}
                          </h2>
                        </div>

                        {/* Browser Push Notification Permission Status */}
                        <div className="mb-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 text-[11px] font-sans">
                          {notificationPermission === "granted" ? (
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                              <span>✓ Push notifications active on this device</span>
                            </div>
                          ) : notificationPermission === "denied" ? (
                            <div className="text-amber-600 dark:text-amber-400 font-medium leading-relaxed">
                              ⚠️ Notifications are blocked. Please enable notification permission in your browser or phone settings to receive instant alerts.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-slate-600 dark:text-slate-400 leading-normal">
                                Get instant updates on your mobile notification bar when teachers post announcements.
                              </p>
                              <button
                                onClick={requestNotificationPermission}
                                className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[10px] transition-colors shadow-sm cursor-pointer"
                              >
                                Enable Mobile Notifications
                              </button>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-3 -mr-2 pr-2">
                          {appConfig?.notifications && appConfig.notifications.length > 0 ? (
                            appConfig.notifications.map((notif: any, i: number) => (
                              <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 flex gap-3">
                                <div className="mt-1 w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0"></div>
                                <div>
                                  <div className="text-sm text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap">{notif.content}</div>
                                  <div className="text-[10px] text-slate-400 mt-1">{new Date(notif.date).toLocaleDateString()}</div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                              No new notifications
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
