import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Sparkles, X, ChevronRight, Lock } from "lucide-react";
import { BotLogo } from "./BotLogo";

interface OnboardingProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function Onboarding({ onComplete, onCancel }: OnboardingProps) {
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 0) {
        setCurrentPage(1);
      } else if (currentPage === 1) {
        // Auto-complete after 5 seconds on the second page
        const completeTimer = setTimeout(() => {
          onComplete();
        }, 5000);
        return () => clearTimeout(completeTimer);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentPage, onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-sm bg-white dark:bg-slate-900 overflow-hidden rounded-3xl shadow-2xl border border-white/20"
      >
        {/* Cancel button absolute positioned above bottom-left side? User says "We have an above-bottom-left-side. They have a cancel option of the instruction page." 
            Let's put the cancel button on the overlay or at the bottom left of the modal. */}
        <AnimatePresence mode="wait">
          {currentPage === 0 ? (
            <motion.div
              key="page1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="px-8 pt-12 pb-16 flex flex-col items-center text-center space-y-6"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full" />
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="w-24 h-24 bg-slate-900 border border-white/10 rounded-3xl flex items-center justify-center shadow-lg transform rotate-3"
                >
                  <BotLogo className="w-16 h-16" />
                </motion.div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute -top-2 -right-2 bg-yellow-400 p-1.5 rounded-full shadow-sm"
                >
                  <Sparkles className="w-4 h-4 text-orange-600" />
                </motion.div>
              </div>

              <div className="space-y-3">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
                  Introducing <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">ASTR AI</span>
                </h2>
                <p className="text-[15px] font-medium text-slate-500 dark:text-slate-400">
                  Your ultimate smart study companion. Get ready to learn faster and better!
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="page2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="px-8 pt-10 pb-16 flex flex-col space-y-6"
            >
              <h2 className="text-xl font-black text-slate-800 dark:text-white text-center mb-2">
                Personalize Your App
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-500/20 flex-shrink-0 flex items-center justify-center text-rose-600 dark:text-rose-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Customize Profile</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Update your profile names anytime from settings.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-500/20 flex-shrink-0 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Premium Access</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Only subscribed students can access the classes and AI assistant.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom controls */}
        <div className="absolute bottom-0 inset-x-0 p-6 flex items-center justify-between">
          <button
            onClick={onCancel}
            className="flex items-center justify-center w-auto px-4 py-2 text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors bg-slate-100 dark:bg-slate-800 rounded-xl"
          >
            Cancel
          </button>
          
          <div className="flex gap-1.5">
            <div className={`w-2 h-2 rounded-full transition-all ${currentPage === 0 ? "bg-indigo-600 w-6" : "bg-slate-300 dark:bg-slate-700"}`} />
            <div className={`w-2 h-2 rounded-full transition-all ${currentPage === 1 ? "bg-indigo-600 w-6" : "bg-slate-300 dark:bg-slate-700"}`} />
          </div>

          {currentPage === 0 ? (
            <button
              onClick={() => setCurrentPage(1)}
              className="flex items-center justify-center gap-1 w-auto px-4 py-2 text-sm font-bold text-white transition-colors bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/30"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onComplete}
              className="flex items-center justify-center gap-1 w-auto px-4 py-2 text-sm font-bold text-white transition-colors bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/30"
            >
              Done <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
