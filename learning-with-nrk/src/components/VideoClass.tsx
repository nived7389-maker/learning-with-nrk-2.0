import { Video } from "lucide-react";

export default function VideoClass() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
        <Video className="w-10 h-10 text-indigo-500 opacity-80" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
        Video Classes
      </h2>
      <p className="text-slate-500 dark:text-slate-400 max-w-[260px]">
        This module is currently in development. High-quality video classes are coming soon!
      </p>
    </div>
  );
}
