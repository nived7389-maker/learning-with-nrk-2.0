import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { updateWatchProgress, markVideoCompleted } from '../lib/videoTracking';

interface YouTubeLessonPlayerProps {
  videoUrl: string;
  lessonId?: string;
  chapterId?: string;
  isClosing?: boolean;
  onVideoComplete?: () => void;
  onProgressUpdate?: (progress: number) => void;
}

const extractYouTubeId = (url: string) => {
  if (!url) return false;
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : false;
};

export default function YouTubeLessonPlayer({
  videoUrl,
  lessonId = 'default-lesson',
  chapterId = 'default-chapter',
  isClosing = false,
  onVideoComplete,
  onProgressUpdate
}: YouTubeLessonPlayerProps) {
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const playerRef = useRef<any>(null);
  
  const videoIdObj = extractYouTubeId(videoUrl);
  const videoId = videoIdObj || videoUrl.replace(/[^a-zA-Z0-9_-]/g, ""); 
  const cleanUrl = (videoId && videoId.length === 11) ? `https://www.youtube.com/watch?v=${videoId}` : videoUrl;

  const storageKey = `yt_progress_${lessonId}_${chapterId}_${videoId || 'unknown'}`;

  const [shouldPlay, setShouldPlay] = useState(false);
  const [completedTriggered, setCompletedTriggered] = useState(false);
  const lastSavedTime = useRef<number>(0);

  const handleReady = () => {
    setIsReady(true);
    setHasError(false);
    
    try {
      const savedProgressStr = localStorage.getItem(storageKey);
      if (savedProgressStr && playerRef.current) {
        const savedSeconds = parseFloat(savedProgressStr);
        if (savedSeconds > 0) {
          playerRef.current.seekTo(savedSeconds, 'seconds');
        }
      }
    } catch (err) {}
  };

  const handlePlay = () => setShouldPlay(true);
  const handlePause = () => setShouldPlay(false);

  const handleError = (e: any) => {
    console.error("YouTube Player Error:", e);
    setHasError(true);
    let msg = "Failed to load the video. Please check your network connection.";
    if (e === 100) msg = "The video was not found or has been deleted.";
    if (e === 101 || e === 150) msg = "The owner of the requested video does not allow it to be played in embedded players.";
    setErrorMessage(msg);
  };

  const handleProgress = (state: { played: number, playedSeconds: number, loaded: number, loadedSeconds: number }) => {
    if (onProgressUpdate) {
      onProgressUpdate(state.playedSeconds);
    }
    
    // Pass progress to global tracker
    if (videoId && state.loadedSeconds > 0) {
       updateWatchProgress(videoId, lessonId, chapterId, state.playedSeconds, playerRef.current?.getDuration() || 0);
    }

    if (state.played >= 0.9 && !completedTriggered) {
      setCompletedTriggered(true);
      if (videoId) markVideoCompleted(videoId, lessonId, chapterId);
      if (onVideoComplete) {
        onVideoComplete();
      }
    }

    if (Math.abs(state.playedSeconds - lastSavedTime.current) >= 5) {
      try {
        localStorage.setItem(storageKey, state.playedSeconds.toString());
        lastSavedTime.current = state.playedSeconds;
      } catch (err) {}
    }
  };

  const handleEnded = () => {
    if (!completedTriggered) {
      setCompletedTriggered(true);
      if (videoId) markVideoCompleted(videoId, lessonId, chapterId);
      if (onVideoComplete) {
        onVideoComplete();
      }
    }
    try {
      localStorage.removeItem(storageKey);
    } catch (err) {}
  };

  useEffect(() => {
    const handleOnline = () => {
      if (hasError) {
        setHasError(false);
        setIsReady(false);
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [hasError]);

  return (
    <div className="relative w-full aspect-video bg-slate-900 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 group">
      {!isReady && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10 transition-opacity duration-300">
          <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mb-4" />
          <p className="text-slate-400 font-medium">Loading video player...</p>
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-20 p-6 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Video Unavailable</h3>
          <p className="text-slate-400 mb-6 max-w-md">
            {errorMessage}
          </p>
          <button 
            onClick={() => {
              setHasError(false);
              setIsReady(false);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors ring-1 ring-white/10"
          >
            <RefreshCw className="w-5 h-5" />
            Retry Connection
          </button>
        </div>
      )}

      <ReactPlayer
        ref={playerRef}
        url={cleanUrl}
        width="100%"
        height="100%"
        className="absolute top-0 left-0"
        controls={true}
        playing={!isClosing && shouldPlay}
        onReady={handleReady}
        onPlay={handlePlay}
        onPause={handlePause}
        onError={handleError}
        onProgress={(state: any) => handleProgress(state)}
        onEnded={handleEnded}
        config={{
          youtube: {
            // @ts-ignore
            playerVars: {
              modestbranding: 1,
              rel: 0,
              playsinline: 1,
              enablejsapi: 1,
              fs: 1,
              iv_load_policy: 3,
              cc_load_policy: 0,
              autoplay: 0,
              origin: typeof window !== 'undefined' ? window.location.origin : ''
            }
          }
        }}
      />
    </div>
  );
}
