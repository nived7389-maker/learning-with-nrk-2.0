import React, { useState, useRef, useEffect } from 'react';
import { Loader2, AlertCircle, RefreshCw, Play, Pause, Volume2, VolumeX, Maximize, Rewind, FastForward, Settings, RotateCw } from 'lucide-react';
import { updateWatchProgress, markVideoCompleted } from '../lib/videoTracking';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubeLessonPlayerProps {
  videoUrl: string;
  lessonId?: string;
  chapterId?: string;
  isClosing?: boolean;
  onVideoComplete?: () => void;
  onProgressUpdate?: (progress: number) => void;
}

const extractYouTubeId = (url: string) => {
  if (!url) return null;
  const cleanUrl = url.trim();

  // 1. Direct 11-character ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
    return cleanUrl;
  }

  // 2. Standard watch URL or any URL containing v=VIDEO_ID
  const videoIdParamMatch = cleanUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (videoIdParamMatch) {
    return videoIdParamMatch[1];
  }

  // 3. Path-based IDs: /embed/ID, /v/ID, /shorts/ID, /live/ID, youtu.be/ID
  const pathMatch = cleanUrl.match(/(?:shorts\/|live\/|embed\/|v\/|youtu\.be\/|y2u\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (pathMatch) {
    return pathMatch[1];
  }

  // 4. Fallback: match any 11-character sequence of letters, digits, underscores, hyphens
  // that is separated by slashes or query parameters
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?)|(shorts\/)|(live\/))\??v?=?([^#&?]*).*/;
  const match = cleanUrl.match(regExp);
  if (match) {
    // Find the last captured group of length >= 11
    for (let i = match.length - 1; i >= 0; i--) {
      const val = match[i];
      if (val && val.length >= 11) {
        const id = val.substring(0, 11);
        if (/^[a-zA-Z0-9_-]{11}$/.test(id)) {
          return id;
        }
      }
    }
  }

  // 5. Fallback for corrupted database values or naked starts
  if (cleanUrl.length > 11 && /^[a-zA-Z0-9_-]+$/.test(cleanUrl)) {
    if (!cleanUrl.toLowerCase().startsWith('http') && !cleanUrl.toLowerCase().startsWith('www')) {
      return cleanUrl.substring(0, 11);
    }
  }
  return null;
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
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
  const [isTimeout, setIsTimeout] = useState(false);
  
  // Custom Control State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [qualityOptions, setQualityOptions] = useState<string[]>([]);
  const [currentQuality, setCurrentQuality] = useState('auto');
  
  const playerRef = useRef<any>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<any>(null);
  const loadingTimeoutRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<any>(null);

  // Gesture Controls States & Refs
  const [isHolding2x, setIsHolding2x] = useState(false);
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<"forward" | "backward" | null>(null);

  const preHoldRateRef = useRef<number>(1);
  const holdTimeoutRef = useRef<any>(null);
  const is2xHoldingRef = useRef<boolean>(false);
  const lastTapTimeRef = useRef<number>(0);
  const lastTouchTimeRef = useRef<number>(0);
  const singleTapTimeoutRef = useRef<any>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const triggerDoubleTapFeedback = (direction: "forward" | "backward") => {
    setDoubleTapFeedback(direction);
    setTimeout(() => {
      setDoubleTapFeedback(null);
    }, 800);
  };

  const handlePointerStart = (clientX: number) => {
    if (!overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const isLeftHalf = (clientX - rect.left) < rect.width / 2;

    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;

    // Check if double tap
    if (timeSinceLastTap < 300 && lastTapTimeRef.current !== 0) {
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
        holdTimeoutRef.current = null;
      }
      
      if (isLeftHalf) {
        skip(-10);
        triggerDoubleTapFeedback("backward");
      } else {
        skip(10);
        triggerDoubleTapFeedback("forward");
      }
      lastTapTimeRef.current = 0;
      return;
    }

    lastTapTimeRef.current = now;

    if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    holdTimeoutRef.current = setTimeout(() => {
      if (!is2xHoldingRef.current && isPlaying) {
        preHoldRateRef.current = playbackRate;
        is2xHoldingRef.current = true;
        setIsHolding2x(true);
        if (isDirectVideo) {
          if (videoElementRef.current) {
            videoElementRef.current.playbackRate = 2;
          }
        } else {
          if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
            playerRef.current.setPlaybackRate(2);
          }
        }
      }
    }, 350);
  };

  const handlePointerEnd = (clientX: number) => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    if (is2xHoldingRef.current) {
      is2xHoldingRef.current = false;
      setIsHolding2x(false);
      const originalRate = preHoldRateRef.current || 1;
      if (isDirectVideo) {
        if (videoElementRef.current) {
          videoElementRef.current.playbackRate = originalRate;
        }
      } else {
        if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
          playerRef.current.setPlaybackRate(originalRate);
        }
      }
      return;
    }

    if (lastTapTimeRef.current === 0) {
      // It was a double-tap/skip event, so do not toggle controls
      return;
    }

    const pressDuration = lastTapTimeRef.current ? Date.now() - lastTapTimeRef.current : 0;
    if (pressDuration < 350) {
      if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
      singleTapTimeoutRef.current = setTimeout(() => {
        setShowControls((prev) => {
          const nextState = !prev;
          if (nextState && isPlaying) {
            hideControlsWithDelay();
          }
          return nextState;
        });
      }, 250);
    }
  };

  const onMouseDownOverlay = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (Date.now() - lastTouchTimeRef.current < 800) {
      return;
    }
    handlePointerStart(e.clientX);
  };

  const onMouseUpOverlay = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (Date.now() - lastTouchTimeRef.current < 800) {
      return;
    }
    handlePointerEnd(e.clientX);
  };

  const onMouseLeaveOverlay = () => {
    if (Date.now() - lastTouchTimeRef.current < 800) {
      return;
    }
    if (is2xHoldingRef.current) {
      is2xHoldingRef.current = false;
      setIsHolding2x(false);
      const originalRate = preHoldRateRef.current || 1;
      if (isDirectVideo) {
        if (videoElementRef.current) {
          videoElementRef.current.playbackRate = originalRate;
        }
      } else {
        if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
          playerRef.current.setPlaybackRate(originalRate);
        }
      }
    }
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
  };

  const onTouchStartOverlay = (e: React.TouchEvent<HTMLDivElement>) => {
    lastTouchTimeRef.current = Date.now();
    if (e.touches && e.touches.length > 0) {
      handlePointerStart(e.touches[0].clientX);
    }
  };

  const onTouchEndOverlay = (e: React.TouchEvent<HTMLDivElement>) => {
    lastTouchTimeRef.current = Date.now();
    if (e.changedTouches && e.changedTouches.length > 0) {
      handlePointerEnd(e.changedTouches[0].clientX);
    }
  };
  
  const videoId = extractYouTubeId(videoUrl);
  const isDirectVideo = !!videoUrl && (videoUrl.startsWith("http://") || videoUrl.startsWith("https://")) && !videoId;
  const validVideoId = videoId || "";
  
  const storageKey = `yt_progress_${lessonId}_${chapterId}_${validVideoId || encodeURIComponent(videoUrl)}`;

  const [completedTriggered, setCompletedTriggered] = useState(false);
  const lastSavedTime = useRef<number>(0);

  // Screen rotation fallback state for portrait phones
  const [isRotated, setIsRotated] = useState(false);
  const [isMobileOrPortrait, setIsMobileOrPortrait] = useState(false);

  useEffect(() => {
    const checkViewport = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobileOrPortrait(isPortrait || isMobileDevice);

      // If user physically turns screen to landscape (width >= height), turn off custom CSS rotation
      if (window.innerWidth >= window.innerHeight) {
        setIsRotated(false);
      }
    };

    checkViewport();
    window.addEventListener('resize', checkViewport);

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsRotated(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('resize', checkViewport);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const onVideoTimeUpdate = () => {
    if (!videoElementRef.current) return;
    const playedSeconds = videoElementRef.current.currentTime;
    const dur = videoElementRef.current.duration || 0;
    
    setCurrentTime(playedSeconds);
    
    if (dur > 0) {
      const playedFrac = playedSeconds / dur;
      if (onProgressUpdate) onProgressUpdate(playedSeconds);
      if (videoUrl) updateWatchProgress(videoUrl, lessonId, chapterId, playedSeconds, dur);
  
      if (playedFrac >= 0.9 && !completedTriggered) {
        setCompletedTriggered(true);
        if (videoUrl) markVideoCompleted(videoUrl, lessonId, chapterId);
        if (onVideoComplete) onVideoComplete();
      }
    }

    if (Math.abs(playedSeconds - lastSavedTime.current) >= 5) {
      try {
        localStorage.setItem(storageKey, playedSeconds.toString());
        lastSavedTime.current = playedSeconds;
      } catch (err) {}
    }
  };

  const onVideoDurationChange = () => {
    if (videoElementRef.current) {
      setDuration(videoElementRef.current.duration || 0);
    }
  };

  useEffect(() => {
    setIsReady(false);
    setHasError(false);
    setIsTimeout(false);
    setCompletedTriggered(false);

    if (isDirectVideo) {
      setIsReady(true);
      setHasError(false);
      setIsTimeout(false);
      
      const savedProgressStr = localStorage.getItem(storageKey);
      if (savedProgressStr && videoElementRef.current) {
        const savedSeconds = parseFloat(savedProgressStr);
        if (savedSeconds > 0) {
          videoElementRef.current.currentTime = savedSeconds;
        }
      }
      setTimeout(() => {
        if (videoElementRef.current) {
          videoElementRef.current.play().catch(err => console.log("Direct video autoplay restriction:", err));
        }
      }, 50);
      return;
    }

    if (!validVideoId) {
      setHasError(true);
      setErrorMessage("Invalid YouTube Link. Cannot extract Video ID.");
      console.error("Player Error: Invalid YouTube URL provided:", videoUrl);
      return;
    }

    const loadPlayer = () => {
      if (!playerContainerRef.current) return;
      
      playerContainerRef.current.innerHTML = '<div id="yt-player-instance" className="w-full h-full pointer-events-none"></div>';

      playerRef.current = new window.YT.Player('yt-player-instance', {
        videoId: validVideoId,
        width: '100%',
        height: '100%',
        playerVars: {
          enablejsapi: 1,
          playsinline: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          showinfo: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          cc_load_policy: 0,
          autoplay: 1,
          origin: window.location.origin
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onError: onPlayerError,
          onPlaybackQualityChange: (event: any) => setCurrentQuality(event.data)
        }
      });
    };

    if (!window.YT || !window.YT.Player) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        loadPlayer();
      };
    } else {
      loadPlayer();
    }

    loadingTimeoutRef.current = setTimeout(() => {
      if (!isReady) {
        setIsTimeout(true);
      }
    }, 10000);

    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
      }
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [validVideoId, isDirectVideo, videoUrl]);

  const onPlayerReady = (event: any) => {
    setIsReady(true);
    setHasError(false);
    setIsTimeout(false);
    setDuration(event.target.getDuration());
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    
    try {
      const savedProgressStr = localStorage.getItem(storageKey);
      if (savedProgressStr) {
        const savedSeconds = parseFloat(savedProgressStr);
        if (savedSeconds > 0) {
          event.target.seekTo(savedSeconds, true);
        }
      }
      
      const levels = event.target.getAvailableQualityLevels();
      if (levels && levels.length > 0) {
        setQualityOptions(levels);
      }
    } catch (err) {}

    // Auto-start playback on mount ready condition
    try {
      event.target.playVideo();
    } catch (e) {}
  };

  const onPlayerError = (event: any) => {
    setHasError(true);
    let msg = "Failed to load the video. Please check your network connection.";
    if (event.data === 2) msg = "The request contains an invalid parameter value. Check Video ID.";
    if (event.data === 100) msg = "The video was not found or has been deleted.";
    if (event.data === 101 || event.data === 150) msg = "The owner of the requested video does not allow it to be played in embedded players.";
    setErrorMessage(msg);
  };

  const onPlayerStateChange = (event: any) => {
    setDuration(event.target.getDuration());
    setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
    
    if (event.data === window.YT.PlayerState.PLAYING) {
      if (!progressIntervalRef.current) {
        progressIntervalRef.current = setInterval(trackProgress, 500);
      }
      hideControlsWithDelay();
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setShowControls(true);
      
      if (event.data === window.YT.PlayerState.ENDED) {
        handleEnded();
      }
    }
  };

  const trackProgress = () => {
    if (!playerRef.current || typeof playerRef.current.getCurrentTime !== 'function') return;
    
    const playedSeconds = playerRef.current.getCurrentTime();
    const dur = playerRef.current.getDuration();
    
    setCurrentTime(playedSeconds);
    
    if (dur > 0) {
      const playedFrac = playedSeconds / dur;
      if (onProgressUpdate) onProgressUpdate(playedSeconds);
      if (validVideoId) updateWatchProgress(validVideoId, lessonId, chapterId, playedSeconds, dur);
  
      if (playedFrac >= 0.9 && !completedTriggered) {
        setCompletedTriggered(true);
        if (validVideoId) markVideoCompleted(validVideoId, lessonId, chapterId);
        if (onVideoComplete) onVideoComplete();
      }
    }

    if (Math.abs(playedSeconds - lastSavedTime.current) >= 5) {
      try {
        localStorage.setItem(storageKey, playedSeconds.toString());
        lastSavedTime.current = playedSeconds;
      } catch (err) {}
    }
  };

  const handleEnded = () => {
    if (!completedTriggered) {
      setCompletedTriggered(true);
      if (validVideoId || videoUrl) markVideoCompleted(validVideoId || videoUrl, lessonId, chapterId);
      if (onVideoComplete) onVideoComplete();
    }
    try {
      localStorage.removeItem(storageKey);
    } catch (err) {}
  };

  useEffect(() => {
    if (isClosing) {
      if (isDirectVideo && videoElementRef.current) {
        videoElementRef.current.pause();
      } else if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
        playerRef.current.pauseVideo();
      }
    }
  }, [isClosing, isDirectVideo]);

  // Interaction Handlers
  const togglePlay = () => {
    if (isDirectVideo) {
      if (!videoElementRef.current) return;
      if (isPlaying) {
        videoElementRef.current.pause();
        setIsPlaying(false);
      } else {
        videoElementRef.current.play().catch(err => console.error(err));
        setIsPlaying(true);
      }
    } else {
      if (!playerRef.current) return;
      if (isPlaying) playerRef.current.pauseVideo();
      else playerRef.current.playVideo();
    }
  };

  const handleMouseMove = () => {
    if (Date.now() - lastTouchTimeRef.current < 1000) {
      return;
    }
    setShowControls(true);
    if (isPlaying) hideControlsWithDelay();
  };

  const hideControlsWithDelay = () => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
      setShowSettings(false);
    }, 3000);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (isDirectVideo) {
      if (videoElementRef.current) {
        videoElementRef.current.currentTime = time;
      }
    } else {
      if (playerRef.current) {
        playerRef.current.seekTo(time, true);
      }
    }
  };

  const skip = (seconds: number) => {
    const newTime = Math.max(0, Math.min(currentTime + seconds, duration));
    setCurrentTime(newTime);
    if (isDirectVideo) {
      if (videoElementRef.current) {
        videoElementRef.current.currentTime = newTime;
      }
    } else {
      if (playerRef.current) {
        playerRef.current.seekTo(newTime, true);
      }
    }
  };

  const toggleMute = () => {
    if (isDirectVideo) {
      if (videoElementRef.current) {
        const nextMute = !isMuted;
        videoElementRef.current.muted = nextMute;
        setIsMuted(nextMute);
        if (!nextMute) {
          videoElementRef.current.volume = volume / 100;
        }
      }
    } else {
      if (!playerRef.current) return;
      if (isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
        playerRef.current.setVolume(volume);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (isDirectVideo) {
      if (videoElementRef.current) {
        videoElementRef.current.volume = vol / 100;
        if (vol > 0 && isMuted) {
          videoElementRef.current.muted = false;
          setIsMuted(false);
        }
        if (vol === 0) {
          videoElementRef.current.muted = true;
          setIsMuted(true);
        }
      }
    } else {
      if (playerRef.current) {
        playerRef.current.setVolume(vol);
        if (vol > 0 && isMuted) {
          playerRef.current.unMute();
          setIsMuted(false);
        }
        if (vol === 0) {
          playerRef.current.mute();
          setIsMuted(true);
        }
      }
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    preHoldRateRef.current = rate;
    if (isDirectVideo) {
      if (videoElementRef.current) {
        videoElementRef.current.playbackRate = rate;
      }
    } else {
      if (playerRef.current) {
        playerRef.current.setPlaybackRate(rate);
      }
    }
    setShowSettings(false);
  };

  const changeQuality = (q: string) => {
    setCurrentQuality(q);
    if (playerRef.current) {
      playerRef.current.setPlaybackQuality(q);
    }
    setShowSettings(false);
  };

  const toggleRotation = () => {
    // If not in fullscreen yet, request fullscreen and rotate automatically
    if (!document.fullscreenElement && wrapperRef.current) {
      wrapperRef.current.requestFullscreen()
        .then(() => {
          setIsRotated(true);
          const orientation = screen.orientation as any;
          if (orientation && typeof orientation.lock === 'function') {
            orientation.lock('landscape').catch(() => {});
          }
        })
        .catch(err => console.error(err));
    } else {
      setIsRotated(!isRotated);
    }
  };

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen()
        .then(() => {
          // If screen height is greater than width, auto-trigger rotated container
          if (window.innerHeight > window.innerWidth) {
            setIsRotated(true);
          }
          const orientation = screen.orientation as any;
          if (orientation && typeof orientation.lock === 'function') {
            orientation.lock('landscape').catch(() => {});
          }
        })
        .catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  // Prevent right click on whole container
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const safeCurrentTime = isNaN(currentTime) || !isFinite(currentTime) ? 0 : currentTime;
  const safeDuration = isNaN(duration) || !isFinite(duration) ? 0 : duration;
  const safeVolume = isNaN(volume) || !isFinite(volume) ? 100 : volume;

  return (
    <div 
      ref={wrapperRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onContextMenu={handleContextMenu}
      className={`relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 group select-none ${
        document.fullscreenElement ? 'rounded-none w-screen h-screen' : ''
      }`}
    >
      <div
        className={`w-full h-full relative transition-all duration-300 ${
          isRotated && document.fullscreenElement
            ? 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 origin-center z-40'
            : ''
        }`}
        style={
          isRotated && document.fullscreenElement
            ? {
                width: '100vh',
                height: '100vw',
              }
            : {
                width: '100%',
                height: '100%',
              }
        }
      >
        {!isReady && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-30 transition-opacity duration-300">
            <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mb-4" />
            <p className="text-slate-400 font-medium">Getting player ready...</p>
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-30 p-6 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Video Unavailable</h3>
            <p className="text-slate-400 mb-6 max-w-md">{errorMessage}</p>
          </div>
        )}

        {/* Frame Container or Native Video Player */}
        {isDirectVideo ? (
          <video
            ref={videoElementRef}
            src={videoUrl}
            className="absolute inset-0 w-full h-full object-contain bg-black outline-none border-none"
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={onVideoTimeUpdate}
            onDurationChange={onVideoDurationChange}
            onEnded={handleEnded}
            onCanPlay={() => setIsReady(true)}
            onError={() => {
              setHasError(true);
              setErrorMessage("Failed to play the direct video link. Please verify the URL structure and accessibility.");
            }}
          />
        ) : (
          <div 
            ref={playerContainerRef} 
            className="absolute inset-0 w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:pointer-events-none border-none outline-none scale-[1.05]"
          />
        )}

        {/* Transparent Overlay to capture gestures, custom hold actions and double-taps */}
        <div 
          ref={overlayRef}
          className="absolute inset-0 z-10 cursor-pointer"
          onMouseDown={onMouseDownOverlay}
          onMouseUp={onMouseUpOverlay}
          onMouseLeave={onMouseLeaveOverlay}
          onTouchStart={onTouchStartOverlay}
          onTouchEnd={onTouchEndOverlay}
        />

        {/* 2X Speed hold overlay indicator */}
        {isHolding2x && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[28] px-4 py-1.5 bg-black/80 backdrop-blur-md rounded-full border border-cyan-500/30 flex items-center gap-1.5 text-xs font-semibold text-cyan-400 select-none pointer-events-none shadow-lg animate-pulse">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
            <span>2X Speed Playback Active ⚡</span>
          </div>
        )}

        {/* Double click/tap rewind visual feedback overlay */}
        {doubleTapFeedback === "backward" && (
          <div className="absolute left-0 top-0 bottom-0 w-1/2 bg-cyan-500/10 backdrop-blur-[1px] z-[15] flex flex-col items-center justify-center text-white pointer-events-none transition-all duration-300 rounded-l-3xl animate-pulse">
            <div className="p-4 bg-black/60 rounded-full mb-2 border border-cyan-500/20 shadow-xl shadow-cyan-500/10 scale-110">
              <Rewind className="w-8 h-8 text-cyan-400 fill-current animate-bounce" />
            </div>
            <span className="text-xs font-semibold text-cyan-400 tracking-wider uppercase">Rewind 10s</span>
          </div>
        )}

        {/* Double click/tap fast-forward visual feedback overlay */}
        {doubleTapFeedback === "forward" && (
          <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-cyan-500/10 backdrop-blur-[1px] z-[15] flex flex-col items-center justify-center text-white pointer-events-none transition-all duration-300 rounded-r-3xl animate-pulse">
            <div className="p-4 bg-black/60 rounded-full mb-2 border border-cyan-500/20 shadow-xl shadow-cyan-500/10 scale-110">
              <FastForward className="w-8 h-8 text-cyan-400 fill-current animate-bounce" />
            </div>
            <span className="text-xs font-semibold text-cyan-400 tracking-wider uppercase">Forward 10s</span>
          </div>
        )}

        {/* Custom Controls Bar */}
        <div 
          className={`absolute bottom-0 left-0 right-0 z-20 px-4 pt-16 pb-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={(e) => e.stopPropagation()} // don't trigger wrapper play/pause
        >
          {/* Progress Bar */}
          <div className="flex items-center gap-2 w-full mb-3 group/progress">
            <span className="text-xs text-white/80 font-medium font-mono min-w-[40px] text-right">{formatTime(safeCurrentTime)}</span>
            <div className="relative flex-1 h-2 flex items-center">
              <input 
                type="range"
                min={0}
                max={safeDuration || 100}
                value={safeCurrentTime}
                onChange={handleSeek}
                className="absolute z-10 w-full opacity-0 cursor-pointer w-full h-full"
              />
              <div className="absolute inset-0 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 bottom-0 bg-cyan-500 transition-all duration-100 rounded-full"
                  style={{ width: `${safeDuration > 0 ? (safeCurrentTime / safeDuration) * 100 : 0}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-white/80 font-medium font-mono min-w-[40px]">{formatTime(safeDuration)}</span>
          </div>

          {/* Buttons Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={togglePlay} className="text-white hover:text-cyan-400 transition-colors focus:outline-none animate-none">
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
              </button>
              <button onClick={() => skip(-10)} className="text-white hover:text-cyan-400 transition-colors focus:outline-none" title="Rewind 10s">
                <Rewind className="w-5 h-5 fill-current" />
              </button>
              <button onClick={() => skip(10)} className="text-white hover:text-cyan-400 transition-colors focus:outline-none" title="Forward 10s">
                <FastForward className="w-5 h-5 fill-current" />
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2 group/volume mx-2">
                <button onClick={toggleMute} className="text-white hover:text-cyan-400 transition-colors focus:outline-none w-6 flex justify-center">
                  {isMuted || safeVolume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input 
                  type="range"
                  min={0}
                  max={100}
                  value={isMuted ? 0 : safeVolume}
                  onChange={handleVolumeChange}
                  className="w-0 opacity-0 group-hover/volume:w-20 group-hover/volume:opacity-100 transition-all duration-300 h-1 bg-white/30 rounded-full appearance-none outline-none overflow-hidden cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-0"
                  style={{ boxShadow: `inset ${(isMuted ? 0 : safeVolume)}px 0 0 white` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 relative animate-none">
              <button 
                onClick={() => setShowSettings(!showSettings)} 
                className={`text-white hover:text-cyan-400 transition-colors focus:outline-none ${showSettings ? 'rotate-90 text-cyan-400' : ''} duration-300`}
              >
                <Settings className="w-5 h-5" />
              </button>

              {/* Portrait/Landscape Rotation Trigger */}
              {(isMobileOrPortrait || document.fullscreenElement) && (
                <button 
                  onClick={toggleRotation} 
                  className="text-white hover:text-cyan-400 hover:bg-white/10 p-1.5 rounded-lg transition-all duration-200 focus:outline-none"
                  title={isRotated ? "Switch to Vertical View" : "Rotate to Landscape View"}
                >
                  <RotateCw className={`w-5 h-5 transition-transform duration-300 ${isRotated ? 'rotate-90 text-cyan-400' : ''}`} />
                </button>
              )}
              
              <button onClick={toggleFullscreen} className="text-white hover:text-cyan-400 transition-colors focus:outline-none">
                <Maximize className="w-5 h-5" />
              </button>

              {/* Settings Dialog */}
              {showSettings && (
                <div className="absolute bottom-12 right-0 bg-slate-900/95 backdrop-blur-sm border border-white/10 rounded-xl p-3 shadow-2xl min-w-[160px] flex gap-4">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold mb-2 px-2">Speed</div>
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                      <button 
                        key={rate}
                        onClick={() => changePlaybackRate(rate)}
                        className={`block w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${playbackRate === rate ? 'bg-cyan-500/20 text-cyan-400 font-semibold' : 'text-slate-300 hover:bg-white/5'}`}
                      >
                        {rate === 1 ? 'Normal' : `${rate}x`}
                      </button>
                    ))}
                  </div>
                  {qualityOptions.length > 0 && (
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold mb-2 px-2">Quality</div>
                      <button 
                        onClick={() => changeQuality('auto')}
                        className={`block w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${currentQuality === 'auto' ? 'bg-cyan-500/20 text-cyan-400 font-semibold' : 'text-slate-300 hover:bg-white/5'}`}
                      >
                        Auto
                      </button>
                      {qualityOptions.map((q) => {
                        if (q === 'auto') return null;
                        return (
                          <button 
                            key={q}
                            onClick={() => changeQuality(q)}
                            className={`block w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${currentQuality === q ? 'bg-cyan-500/20 text-cyan-400 font-semibold' : 'text-slate-300 hover:bg-white/5'}`}
                          >
                            {q.replace('hd', '').replace('small', '240 ').replace('medium', '360 ').replace('large', '480 ').toUpperCase()}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

