export interface WatchRecord {
  videoId: string;
  lessonId: string;
  chapterId: string;
  percentage: number;
  totalWatchedTimeMs: number;
  completed: boolean;
  lastWatchedTimestamp: number;
}

const STORAGE_KEY = "@educational_app_watch_history";

export const getWatchHistory = (): Record<string, WatchRecord> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveWatchHistory = (history: Record<string, WatchRecord>) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (err) {
    console.error("Failed to save watch history", err);
  }
};

export const updateWatchProgress = (
  videoId: string,
  lessonId: string,
  chapterId: string,
  currentSeconds: number,
  totalSeconds: number
) => {
  if (totalSeconds <= 0) return;
  
  const history = getWatchHistory();
  const percentage = Math.min((currentSeconds / totalSeconds) * 100, 100);
  
  const record = history[videoId] || {
    videoId,
    lessonId,
    chapterId,
    percentage: 0,
    totalWatchedTimeMs: 0,
    completed: false,
    lastWatchedTimestamp: Date.now()
  };

  record.percentage = Math.max(record.percentage, percentage);
  record.lastWatchedTimestamp = Date.now();
  record.completed = record.completed || percentage >= 90;

  history[videoId] = record;
  saveWatchHistory(history);
};

export const updateWatchedTime = (
  videoId: string,
  lessonId: string,
  chapterId: string,
  addedTimeMs: number
) => {
  const history = getWatchHistory();
  const record = history[videoId] || {
    videoId,
    lessonId,
    chapterId,
    percentage: 0,
    totalWatchedTimeMs: 0,
    completed: false,
    lastWatchedTimestamp: Date.now()
  };

  record.totalWatchedTimeMs += addedTimeMs;
  record.lastWatchedTimestamp = Date.now();

  history[videoId] = record;
  saveWatchHistory(history);
};

export const markVideoCompleted = (videoId: string, lessonId: string, chapterId: string) => {
  const history = getWatchHistory();
  if (history[videoId]) {
    history[videoId].completed = true;
    history[videoId].lastWatchedTimestamp = Date.now();
  } else {
    history[videoId] = {
      videoId,
      lessonId,
      chapterId,
      percentage: 100,
      totalWatchedTimeMs: 0,
      completed: true,
      lastWatchedTimestamp: Date.now()
    };
  }
  saveWatchHistory(history);
};

export const getContinueWatching = (): WatchRecord | null => {
  const history = Object.values(getWatchHistory());
  if (history.length === 0) return null;
  
  // Exclude completed, sort by most recently watched
  const unfinished = history
    .filter((h) => !h.completed && h.percentage > 0)
    .sort((a, b) => b.lastWatchedTimestamp - a.lastWatchedTimestamp);

  return unfinished.length > 0 ? unfinished[0] : null;
};
