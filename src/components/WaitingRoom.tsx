import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Clock,
  PhoneCall,
  RefreshCw,
  LogOut,
  CheckCircle,
  KeyRound,
} from "lucide-react";
import { fetchStudentProfile, listenStudentProfile } from "../firebase";
import { Student } from "../types";

interface WaitingRoomProps {
  student: Student;
  onApproved: (updatedStudent: Student) => void;
  onLogout: () => void;
  onAdminOpen: () => void;
}

export default function WaitingRoom({
  student,
  onApproved,
  onLogout,
  onAdminOpen,
}: WaitingRoomProps) {
  const [checking, setChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const unsubscribe = listenStudentProfile(student.uid, (freshProfile) => {
      if (freshProfile) {
        if (freshProfile.status === "approved") {
          onApproved(freshProfile);
        } else if (freshProfile.status === "blocked") {
          setErrorMsg("Your account has been blocked by the administrator.");
        } else {
          setErrorMsg(
            "Your enrollment request is still being reviewed by NRK Admin.",
          );
        }
      }
    });
    return () => unsubscribe();
  }, [student.uid, onApproved]);

  const handleCheckStatus = async () => {
    setChecking(true);
    setErrorMsg("");
    try {
      const freshProfile = await fetchStudentProfile(student.uid);
      if (freshProfile) {
        if (freshProfile.status === "approved") {
          onApproved(freshProfile);
        } else if (freshProfile.status === "blocked") {
          setErrorMsg("Your account has been blocked by the administrator.");
        } else {
          setErrorMsg(
            "Your enrollment request is still being reviewed by NRK Admin.",
          );
        }
      } else {
        setErrorMsg("Unable to retrieve status. Try again.");
      }
    } catch (e) {
      setErrorMsg("Check failed. Please request status again in a moment.");
    } finally {
      setTimeout(() => setChecking(false), 800);
    }
  };

  const isBlocked = student.status === "blocked" || errorMsg.includes("blocked");

  return (
    <div
      id="waiting-room-screen"
      className="flex flex-col justify-between min-h-screen p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white select-none"
    >
      {/* Top section */}
      <div className="flex justify-between items-center w-full max-w-md mx-auto">
        <span className="font-sans font-semibold text-sm tracking-tight text-slate-900 dark:text-white/50">
          HSE SCIENCE PORTAL
        </span>

        <div className="flex items-center gap-3">
          <button
            onClick={onAdminOpen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-sans font-semibold text-xs transition-colors hover:bg-indigo-500/20 cursor-pointer outline-none"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Admin Control</span>
          </button>

          <button
            id="logout-from-waiting-btn"
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs text-rose-400 font-sans hover:text-rose-300 transition-colors cursor-pointer outline-none"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Center content */}
      <div className="flex flex-col items-center justify-center my-auto w-full max-w-md mx-auto text-center">
        {/* Waiting animated ring */}
        <div className={`relative flex items-center justify-center w-28 h-28 rounded-full shadow-2xl mb-8 ${isBlocked ? 'bg-rose-500/10 border border-rose-500/20 shadow-rose-500/10' : 'bg-amber-500/10 border border-amber-500/20 shadow-amber-500/10'}`}>
          <div className={`absolute inset-2 rounded-full border border-dashed opacity-50 ${isBlocked ? 'border-rose-400' : 'border-amber-400 animate-spin'}`} />
          {isBlocked ? (
             <LogOut className="w-10 h-10 text-rose-400" />
          ) : (
             <Clock className="w-10 h-10 text-amber-400 animate-pulse" />
          )}
        </div>

        <h2
          id="waiting-title"
          className={`font-sans font-bold text-2xl tracking-tight mb-3 ${isBlocked ? 'text-rose-400' : 'text-amber-400'}`}
        >
          {isBlocked ? "Access Denied" : "Waiting for Approval"}
        </h2>

        <p className="font-sans text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-1 capitalize">
          Welcome, {student.name || "Student"}!
        </p>
        <p className="font-sans text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mb-8">
          {isBlocked 
            ? "Your account access has been restricted by the administrator. You cannot proceed further." 
            : "Your account status is currently set to pending approval. Kerala State Syllabus Stream allocation (+1 or +2) is verified and designated by the NRK admin team before unlocking study materials."}
        </p>

        {errorMsg && (
          <motion.div
            id="status-feedback"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`w-full p-4 rounded-2xl mb-8 font-sans text-xs text-center border ${
              errorMsg.includes("blocked")
                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                : "bg-blue-500/10 border-blue-500/30 text-blue-300"
            }`}
          >
            {errorMsg}
          </motion.div>
        )}

        {/* Check Status Heavy Button */}
        <motion.button
          id="refresh-status-btn"
          onClick={handleCheckStatus}
          disabled={checking}
          whileTap={{ scale: 0.96 }}
          className="flex items-center justify-center gap-2.5 w-full h-13 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-slate-900 dark:text-white font-sans font-semibold text-sm shadow-xl shadow-blue-600/20 hover:from-blue-500 hover:to-indigo-500 cursor-pointer transition-all outline-none"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
          <span>{checking ? "Checking..." : "Refresh Status"}</span>
        </motion.button>

        {/* Enroll Subscription Button */}
        <motion.button
          onClick={() => {
            const message = `Want a new subscription.\nName: ${student.name}\nPhone: ${student.phone || "Not provided"}`;
            window.open(`https://wa.me/918848198680?text=${encodeURIComponent(message)}`, "_blank");
          }}
          whileTap={{ scale: 0.96 }}
          className="flex items-center justify-center gap-2.5 w-full h-13 mt-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-sans font-semibold text-sm shadow-xl shadow-green-600/20 hover:from-emerald-400 hover:to-green-500 cursor-pointer transition-all outline-none"
        >
          <PhoneCall className="w-4 h-4" />
          <span>Enroll Subscription</span>
        </motion.button>
      </div>

      {/* Helpline Contact Card Bottom */}
      <div className="w-full max-w-md mx-auto p-4 rounded-2xl bg-white/[0.03] border border-black/5 dark:border-white/5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <PhoneCall className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-left font-sans">
            <span className="text-[10px] uppercase font-mono tracking-widest text-gray-500 block">
              Contact Admission
            </span>
            <span className="text-xs font-semibold text-green-400 font-mono">
              8848198680
            </span>
          </div>
        </div>
        <a
          href="tel:8848198680"
          className="px-3.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-[11px] font-sans font-medium text-green-400 hover:bg-green-500/20 active:scale-95 transition-all"
        >
          Call Helpline
        </a>
      </div>
    </div>
  );
}
