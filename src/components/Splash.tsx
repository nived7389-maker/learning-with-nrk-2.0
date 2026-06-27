import { useEffect } from "react";
import { motion } from "motion/react";

interface SplashProps {
  onFinish: () => void;
}

export default function Splash({ onFinish }: SplashProps) {
  const imageUrl = "https://yt3.ggpht.com/xJpGJuIziUdKyklfIXJxWhpAkAPbDaCwRCkTtIW4rXPD1wXK_dIjvWdex5saW5WXhCy7EMTfGJvd=s1870-nd-v1";

  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <motion.div
      id="splash-screen"
      initial={{ opacity: 1 }}
      exit={{ 
        opacity: 0, 
        scale: 1.02,
        filter: "blur(8px)",
        transition: { duration: 0.6, ease: [0.25, 1, 0.5, 1] }
      }}
      className="fixed inset-0 z-[9999] bg-[#070b13] text-white overflow-hidden select-none"
    >
      {/* Full-screen Splash Image (resized and formatted to cover entire viewport) */}
      <motion.div
        initial={{ scale: 1.05, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 w-full h-full"
      >
        <img 
          src={imageUrl} 
          alt="Learning with NRK" 
          className="w-full h-full object-cover select-none"
          referrerPolicy="no-referrer"
        />
      </motion.div>

      {/* Gradient overlay at the bottom for loader accessibility */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#070b13]/80 via-[#070b13]/30 to-transparent pointer-events-none" />

      {/* Loading control layer */}
      <div className="absolute bottom-16 left-0 right-0 z-10 flex flex-col items-center">
        {/* Sleek, minimalist linear loading bar */}
        <div className="w-64 h-1.5 bg-white/20 backdrop-blur-md rounded-full overflow-hidden relative shadow-[0_2px_12px_rgba(0,0,0,0.5)] border border-white/10">
          <motion.div
            id="splash-progress-loader"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 3.0, ease: "linear" }}
            className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.6)]"
          />
        </div>
      </div>
    </motion.div>
  );
}
