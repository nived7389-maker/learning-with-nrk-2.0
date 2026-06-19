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
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<any>(null);
  const loadingTimeoutRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<any>(null);
  
  const videoId = extractYouTubeId(videoUrl);
  const validVideoId = videoId || "";
  
  const storageKey = `yt_progress_${lessonId}_${chapterId}_${validVideoId}`;

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

  useEffect(() => {
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
          autoplay: 0,
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
  }, [validVideoId]);

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
      if (validVideoId) markVideoCompleted(validVideoId, lessonId, chapterId);
      if (onVideoComplete) onVideoComplete();
    }
    try {
      localStorage.removeItem(storageKey);
    } catch (err) {}
  };

  useEffect(() => {
    if (isClosing && playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
      playerRef.current.pauseVideo();
    }
  }, [isClosing]);

  // Interaction Handlers
  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  };

  const handleMouseMove = () => {
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
    if (playerRef.current) {
      playerRef.current.seekTo(time, true);
    }
  };

  const skip = (seconds: number) => {
    if (playerRef.current) {
      const newTime = Math.max(0, Math.min(currentTime + seconds, duration));
      playerRef.current.seekTo(newTime, true);
      setCurrentTime(newTime);
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
      playerRef.current.setVolume(volume);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
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
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (playerRef.current) {
      playerRef.current.setPlaybackRate(rate);
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
      onTouchStart={handleMouseMove}
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

        {/* Frame Container - Pointer events none to block all interactions with yt elements */}
        <div 
          ref={playerContainerRef} 
          className="absolute inset-0 w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:pointer-events-none border-none outline-none scale-[1.05]"
        />

        {/* Transparent Overlay to capture clicks (play/pause) and prevent youtube redirects */}
        <div 
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={togglePlay}
        />

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

