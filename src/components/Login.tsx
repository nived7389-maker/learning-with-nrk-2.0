import React, { useState, FormEvent, useEffect } from "react";
import { motion } from "motion/react";
import { KeyRound, AlertCircle, Lock, Phone, User, Sun, Moon, Eye, EyeOff } from "lucide-react";
import { NrkLogo } from "./NrkLogo";
import { loginWithEmail, signUpWithEmail, listenAppConfig } from "../firebase";
import { Student } from "../types";
import { useTheme } from "../ThemeContext";

interface LoginProps {
  onSuccess: (student: Student, justSignedUp?: boolean) => void;
  onAdminOpen: () => void;
}

export default function Login({ onSuccess, onAdminOpen }: LoginProps) {
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phone, setPhone] = useState("+91");
  const [name, setName] = useState("");
  const [logoClicks, setLogoClicks] = useState(0);
  const [isSignUp, setIsSignUp] = useState(true);
  const [appConfig, setAppConfig] = useState<any>({});

  useEffect(() => {
    const unsub = listenAppConfig((config) => setAppConfig(config));
    return () => unsub();
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (!val.startsWith("+91")) {
      // User tried to backspace +91 or paste something else
      val = "+91" + val.replace(/^\+?(91)?/, "");
    }
    setPhone(val);
  };

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    if (!phone || !password || (isSignUp && (!name || !confirmPassword))) {
      setErrorText("Please fill in all fields.");
      return;
    }
    if (isSignUp && password !== confirmPassword) {
      setErrorText("Passwords do not match. Please re-enter the password accurately.");
      return;
    }
    if (password.length < 8) {
      setErrorText("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    setErrorText("");
    try {
      const simulatedEmail = `${phone}@nrkhse.edu`;
      let student;
      if (isSignUp) {
        student = await signUpWithEmail(simulatedEmail, password, phone, name);
      } else {
        student = await loginWithEmail(simulatedEmail, password);
      }
      if (student) {
        onSuccess(student, isSignUp);
      }
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') {
        setErrorText("This phone number is already registered. Please Log In instead.");
      } else if (e.code === 'auth/invalid-credential') {
        setErrorText("Invalid phone number or password.");
      } else {
        setErrorText(e.message || "Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      id="login-screen"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col justify-between min-h-screen px-6 py-12 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white select-none overflow-y-auto"
    >
      {/* Top action bar */}
      <div className="flex justify-between items-center w-full max-w-md mx-auto">
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => {
            const next = logoClicks + 1;
            if (next >= 6) {
              setLogoClicks(0);
              onAdminOpen();
            } else {
              setLogoClicks(next);
            }
          }}
        >
          {appConfig?.appLogoUrl ? (
            <img src={appConfig.appLogoUrl} alt="App Logo" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
          ) : (
            <NrkLogo className="w-8 h-8" />
          )}
          <span className="font-sans font-extrabold tracking-tight text-slate-900 dark:text-white">Learning with nrk</span>
        </div>
        
        <div className="flex justify-end gap-2">
           {/* Admin button removed */}
        </div>
      </div>
      <div className="flex flex-col items-center justify-center my-auto w-full max-w-md mx-auto">
        
        {/* Core glowing ring circle logo from screenshot */}
        <motion.div
          id="login-main-badge"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative flex items-center justify-center w-32 h-32 rounded-full bg-indigo-500/10 border border-slate-200 dark:border-white/10 shadow-2xl shadow-indigo-500/20 mb-8"
        >
          <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-indigo-500/20 to-pink-500/20 blur" />
          <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-black/5 dark:bg-white/10 backdrop-blur border border-slate-300 dark:border-white/20">
            <KeyRound className="w-10 h-10 text-slate-900 dark:text-white/90 drop-shadow" />
            
            {/* Small red key badge from screenshot */}
            <div className="absolute bottom-2 right-2 flex items-center justify-center w-7 h-7 rounded-full bg-red-500 border border-white shadow-md animate-bounce">
              <KeyRound className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
            </div>
          </div>
        </motion.div>

        {/* Display subtitle & titles */}
        <h2 id="login-welcome-title" className="font-sans font-semibold text-3xl text-center tracking-tight mb-2">
          {isSignUp ? "Create an account" : "Login to your account"}
        </h2>
        <p className="text-slate-600 dark:text-white/60 text-sm font-sans tracking-wide text-center max-w-xs mb-10">
          Kerala State Syllabus Science Student Portal (+1 and +2)
        </p>

        {errorText && (
          <div className="w-full bg-amber-500/20 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-2.5 mb-6 text-amber-200">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="font-sans text-xs">{errorText}</p>
          </div>
        )}

        {/* Phone, Password logic */}
        <form onSubmit={handleEmailAuth} className="w-full space-y-4 mb-6">
          {isSignUp && (
            <div className="flex bg-white dark:bg-white/10 rounded-xl items-center px-4 py-3 border border-slate-200 dark:border-slate-200 dark:border-white/10 shadow-sm transition-all origin-top scale-y-100">
              <User className="w-5 h-5 text-slate-400 dark:text-white/50 mr-3" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="bg-transparent border-none outline-none w-full text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/50 text-sm"
                required={isSignUp}
              />
            </div>
          )}
          <div className="flex bg-white dark:bg-white/10 rounded-xl items-center px-4 py-3 border border-slate-200 dark:border-slate-200 dark:border-white/10 shadow-sm transition-all origin-top scale-y-100">
            <Phone className="w-5 h-5 text-slate-400 dark:text-white/50 mr-3" />
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="Enter your phone number"
              className="bg-transparent border-none outline-none w-full text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/50 text-sm"
              required
            />
          </div>
          <div className="flex bg-white dark:bg-white/10 rounded-xl items-center px-4 py-3 border border-slate-200 dark:border-slate-200 dark:border-white/10 shadow-sm">
            <Lock className="w-5 h-5 text-slate-400 dark:text-white/50 mr-3 shrink-0" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8-digit Password"
              className="bg-transparent border-none outline-none w-full text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/50 text-sm"
              minLength={8}
              required
            />
            {password.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 dark:text-white/50 hover:text-slate-600 dark:hover:text-white/80 focus:outline-none ml-2 shrink-0 cursor-pointer"
              >
                {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            )}
          </div>
          {isSignUp && (
            <div className="flex bg-white dark:bg-white/10 rounded-xl items-center px-4 py-3 border border-slate-200 dark:border-slate-200 dark:border-white/10 shadow-sm transition-all origin-top scale-y-100">
              <Lock className="w-5 h-5 text-slate-400 dark:text-white/50 mr-3 shrink-0" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm 8-digit Password"
                className="bg-transparent border-none outline-none w-full text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/50 text-sm"
                minLength={8}
                required={isSignUp}
              />
              {confirmPassword.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-slate-400 dark:text-white/50 hover:text-slate-600 dark:hover:text-white/80 focus:outline-none ml-2 shrink-0 cursor-pointer"
                >
                  {showConfirmPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              )}
            </div>
          )}
          <motion.button
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            type="submit"
            className="w-full py-3.5 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 rounded-2xl font-bold transition-colors disabled:opacity-50"
          >
            {loading ? "Please wait..." : (isSignUp ? "Sign Up" : "Log In")}
          </motion.button>
        </form>

        <p className="text-sm text-slate-700 dark:text-white/70 tracking-wide font-medium mb-6">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}
          <button 
            type="button" 
            onClick={() => { 
              setIsSignUp(!isSignUp); 
              setErrorText(""); 
              setPassword("");
              setConfirmPassword("");
              setShowPassword(false);
              setShowConfirmPassword(false);
            }}
            className="ml-1 text-slate-900 dark:text-white underline font-bold outline-none"
          >
            {isSignUp ? "Log in" : "Sign up"}
          </button>
        </p>

      </div>

      {/* Kerala Syllabus Attribution Footer */}
      <div className="text-center w-full max-w-md mx-auto mt-8">
        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-900 dark:text-white/30 block">
          Govt of Kerala Higher Secondary Education
        </span>
      </div>
    </motion.div>
  );
}
