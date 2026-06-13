import { useEffect } from "react";
import { motion } from "motion/react";
import { BookOpen } from "lucide-react";

interface SplashProps {
  onFinish: () => void;
}

export default function Splash({ onFinish }: SplashProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2800);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      id="splash-screen"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#0852c4] via-[#3c14a4] to-[#7404a4] text-slate-900 dark:text-white overflow-hidden"
    >
      {/* Sparkles / Ambient light effects */}
      <div className="absolute top-[20%] left-[10%] w-72 h-72 rounded-full bg-blue-400 opacity-20 blur-3xl animate-pulse" />
      <div className="absolute bottom-[20%] right-[10%] w-72 h-72 rounded-full bg-purple-500 opacity-20 blur-3xl animate-pulse" />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Animated Icon Circle */}
        <motion.div
          id="splash-logo-container"
          initial={{ scale: 0.3, opacity: 0, rotate: -20 }}
          animate={{ scale: [1, 1.1, 1], opacity: 1, rotate: 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="flex items-center justify-center w-24 h-24 rounded-3xl bg-black/5 dark:bg-white/10 backdrop-blur-md shadow-2xl border border-slate-300 dark:border-white/20 mb-6"
        >
          <BookOpen className="w-12 h-12 text-slate-900 dark:text-white" />
        </motion.div>

        {/* Animated App Name Title */}
        <motion.h1
          id="splash-title"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="font-sans font-bold text-3xl md:text-4xl tracking-tight leading-none mb-2"
        >
          Learning With NRK
        </motion.h1>

        {/* Course stream indicator */}
        <motion.p
          id="splash-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="font-mono text-xs tracking-wider uppercase text-blue-200"
        >
          Kerala Syllabus Higher Secondary Science
        </motion.p>
      </div>

      {/* Loading bottom bar */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-48 h-1 bg-white/20 rounded-full overflow-hidden">
        <motion.div
          id="splash-loading-bar"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 2.2, repeat: 0, ease: "easeInOut" }}
          className="w-full h-full bg-gradient-to-r from-blue-400 to-purple-400"
        />
      </div>
    </div>
  );
}
