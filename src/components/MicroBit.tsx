import { Award } from "lucide-react";
import { PaperCutsIcon } from "./PaperCutsIcon";

export default function MicroBit({ onSubjectSelect }: { onSubjectSelect: (subject: string) => void }) {
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
            onClick={() => onSubjectSelect(`Microbit - ${exam.name}`)}
            className="flex items-center p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm hover:shadow-md transition-all text-left"
          >
            <div className="w-12 h-12 rounded-full bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center mr-4">
              <Award className="w-6 h-6 text-violet-500" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">{exam.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Study materials & resources</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
