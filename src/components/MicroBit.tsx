import { useState } from "react";
import { Award } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PaperCutsIcon } from "./PaperCutsIcon";

export default function MicroBit() {
  const [activeTabModal, setActiveTabModal] = useState<string | null>(null);

  const exams = [
    { id: "onam", name: "Onam Exam" },
    { id: "christmas", name: "Christmas Exam" },
    { id: "annual", name: "Annual Exam" },
  ];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
          <PaperCutsIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Micro-bit</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">View upcoming and past exams</p>
        </div>
      </div>

      <div className="grid gap-4">
        {exams.map((exam) => (
          <button
            key={exam.id}
            onClick={() => setActiveTabModal(exam.name)}
            className="flex items-center p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm hover:shadow-md transition-all text-left"
          >
            <div className="w-12 h-12 rounded-full bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center mr-4">
              <Award className="w-6 h-6 text-violet-500" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">{exam.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Exam results & reports</p>
            </div>
          </button>
        ))}
      </div>

      {/* Modal for Coming Soon */}
      <AnimatePresence>
        {activeTabModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setActiveTabModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 relative overflow-hidden text-center"
            >
              <div className="mx-auto w-14 h-14 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-4">
                <Award className="w-8 h-8 animate-bounce" />
              </div>
              <h3 className="font-sans font-extrabold text-xl tracking-tight text-slate-900 dark:text-white mb-2">Coming Soon!</h3>
              <p className="font-sans text-sm text-slate-600 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                The results for {activeTabModal} will be available here soon. We are working hard to bring this feature to you.
              </p>
              <button
                onClick={() => setActiveTabModal(null)}
                className="mt-6 px-6 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-500 transition-colors cursor-pointer"
              >
                Alright
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
