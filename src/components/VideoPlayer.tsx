"use client";

import Image from "next/image";
import { useState, useRef, useEffect, useCallback } from "react";
import { PaywallModal } from "@/components/PaywallModal";
import { useCoins } from "@/context/CoinContext";

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
const EPISODE_COST = 60;

interface VideoPlayerProps {
  dramaTitle: string;
  episode: number;
  locked: boolean;
  cover: string;
  slug: string;
  totalEpisodes: number;
  videoUrl?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function VideoPlayer({
  dramaTitle,
  episode,
  locked: initialLocked,
  cover,
  slug,
  totalEpisodes,
  videoUrl,
}: VideoPlayerProps) {
  const { isVip } = useCoins();
  const [unlocked, setUnlocked] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const locked = initialLocked && !isVip && !unlocked;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [prevVideoUrl, setPrevVideoUrl] = useState(videoUrl);
  const [retryKey, setRetryKey] = useState(0);
  const [blobSrc, setBlobSrc] = useState<string | null>(null);
  const [useBlobFallback, setUseBlobFallback] = useState(false);
  const retryCountRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset playback state when video source changes (e.g. episode navigation)
  if (videoUrl !== prevVideoUrl) {
    setPrevVideoUrl(videoUrl);
    setVideoError(null);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    retryCountRef.current = 0;
    setBlobSrc(null);
    setUseBlobFallback(false);
  }

  const hasRealVideo = !!videoUrl && !locked;

  // Blob fallback: fetch entire video when direct streaming fails
  useEffect(() => {
    if (!useBlobFallback || !videoUrl || locked) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    fetch(videoUrl)
      .then((res) => res.blob())
      .then((blob) => {
        if (!cancelled) {
          objectUrl = URL.createObjectURL(blob);
          setBlobSrc(objectUrl);
        }
      })
      .catch(() => {
        if (!cancelled) setVideoError('Failed to load video');
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [useBlobFallback, videoUrl, locked]);

  // Autoplay when video is available (unmuted preferred)
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !hasRealVideo) return;
    // Wait for blob src if in fallback mode
    if (useBlobFallback && !blobSrc) return;
    vid.muted = false;
    setIsMuted(false);
    vid.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {
      // Unmuted autoplay blocked by browser — try muted as fallback
      vid.muted = true;
      setIsMuted(true);
      vid.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Autoplay completely blocked — user will need to click play
      });
    });
  }, [hasRealVideo, videoUrl, retryKey, blobSrc, useBlobFallback]);

  const handleTimeUpdate = useCallback(() => {
    const vid = videoRef.current;
    if (!vid || !vid.duration) return;
    setCurrentTime(vid.currentTime);
    setProgress((vid.currentTime / vid.duration) * 100);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    setDuration(vid.duration);
    vid.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.playbackRate = speed;
  }, [speed]);

  const togglePlay = useCallback(() => {
    const vid = videoRef.current;
    if (hasRealVideo && vid) {
      if (vid.paused) {
        vid.play().catch(() => {});
        setIsPlaying(true);
      } else {
        vid.pause();
        setIsPlaying(false);
      }
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, [hasRealVideo]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const handleShare = async () => {
    const url = `${window.location.origin}/episode/${slug}?ep=${episode}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${dramaTitle} - Episode ${episode}`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 2000);
      }
    } catch {
      await navigator.clipboard.writeText(url);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    const clamped = Math.max(0, Math.min(100, pct));
    setProgress(clamped);

    const vid = videoRef.current;
    if (hasRealVideo && vid && vid.duration) {
      vid.currentTime = (clamped / 100) * vid.duration;
    }
  };

  const hasPrev = episode > 1;
  const hasNext = episode < totalEpisodes;

  return (
    <div
      ref={containerRef}
      className="relative aspect-[9/16] max-h-[70vh] mx-auto bg-black rounded-lg overflow-hidden group"
    >
      {hasRealVideo && !videoError && !(useBlobFallback && !blobSrc) ? (
        <video
          ref={videoRef}
          src={useBlobFallback ? blobSrc! : videoUrl}
          className="w-full h-full object-contain"
          playsInline
          autoPlay
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={(e) => {
            const vid = e.currentTarget;
            const err = vid.error;
            if (!useBlobFallback && retryCountRef.current < 2) {
              retryCountRef.current += 1;
              vid.load();
              vid.play().catch(() => {});
            } else if (!useBlobFallback) {
              // Direct streaming failed — fall back to blob fetch
              retryCountRef.current = 0;
              setUseBlobFallback(true);
            } else {
              setVideoError(err ? `Error ${err.code}: ${err.message}` : 'Failed to load video');
            }
          }}
        />
      ) : (
        <>
          <Image
            src={cover}
            alt={`${dramaTitle} Episode ${episode}`}
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover"
            priority
          />

        </>
      )}

      {/* Blob loading spinner */}
      {useBlobFallback && !blobSrc && !videoError && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Video error overlay */}
      {videoError && !locked && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <p className="text-gray-300 text-sm text-center px-4">
            Video failed to load
          </p>
          <button
            onClick={() => {
              setVideoError(null);
              setIsPlaying(false);
              setProgress(0);
              setCurrentTime(0);
              setSpeed(1);
              retryCountRef.current = 0;
              setBlobSrc(null);
              setUseBlobFallback(false);
              setRetryKey((k) => k + 1);
            }}
            className="bg-[#F6610F] text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-[#d9550d] transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Lock overlay */}
      {locked && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4">
          <svg
            className="w-12 h-12 text-yellow-500"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
          </svg>
          <p className="text-white font-medium text-center px-4">
            Unlock this episode with coins
          </p>
          <button
            onClick={() => setShowPaywall(true)}
            className="bg-[#F6610F] text-white px-6 py-2 rounded-full font-bold hover:bg-[#d9550d] transition-colors"
          >
            Unlock ({EPISODE_COST} coins)
          </button>
        </div>
      )}

      {/* Paywall modal */}
      {showPaywall && (
        <PaywallModal
          episodeCost={EPISODE_COST}
          onClose={() => setShowPaywall(false)}
          onUnlocked={() => setUnlocked(true)}
        />
      )}

      {/* Play overlay */}
      {!locked && !isPlaying && !videoError && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center"
          aria-label="Play video"
        >
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
            <svg
              className="w-8 h-8 text-white ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </button>
      )}

      {/* Playback controls (visible on hover when playing) */}
      {!locked && isPlaying && !videoError && (
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          onClick={togglePlay}
        >
          <div className="w-14 h-14 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center">
            <svg
              className="w-7 h-7 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          </div>
        </div>
      )}

      {/* Prev / Next episode navigation */}
      {!locked && (
        <>
          {hasPrev && (
            <a
              href={`/episode/${slug}?ep=${episode - 1}`}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
              aria-label="Previous episode"
            >
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </a>
          )}
          {hasNext && (
            <a
              href={`/episode/${slug}?ep=${episode + 1}`}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
              aria-label="Next episode"
            >
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </a>
          )}
        </>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent pt-8 pb-3 px-4">
        {/* Progress bar */}
        {!locked && (
          <div
            className="w-full h-1.5 bg-white/20 rounded-full mb-3 cursor-pointer group/bar"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-[#F6610F] rounded-full relative transition-all"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/bar:opacity-100 transition-opacity" />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-lg font-semibold">
              Episode {episode}
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-300 mt-0.5">
              <span>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <span>480P</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mute/Unmute button */}
            {!locked && hasRealVideo && (
              <button
                onClick={() => {
                  const vid = videoRef.current;
                  if (vid) {
                    vid.muted = !vid.muted;
                    setIsMuted(vid.muted);
                  }
                }}
                className="p-1.5 text-white/70 hover:text-white transition-colors"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
            )}

            {/* Speed selector */}
            {!locked && (
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="px-2.5 py-1 text-xs font-medium text-white bg-white/15 rounded-md hover:bg-white/25 transition-colors"
                >
                  {speed}x
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-[#2a2a2a] border border-white/10 rounded-lg overflow-hidden shadow-xl">
                    {SPEED_OPTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setSpeed(s);
                          setShowSpeedMenu(false);
                        }}
                        className={`block w-full px-4 py-2 text-sm text-left transition-colors ${
                          speed === s
                            ? "text-[#F6610F] bg-white/10"
                            : "text-white hover:bg-white/10"
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Share button */}
            <button
              onClick={handleShare}
              className="p-1.5 text-white/70 hover:text-white transition-colors"
              aria-label="Share episode"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
            </button>

            {/* Fullscreen toggle */}
            {!locked && (
              <button
                onClick={toggleFullscreen}
                className="p-1.5 text-white/70 hover:text-white transition-colors"
                aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                    />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Share toast */}
      {showShareToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white text-black px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-pulse">
          Link copied!
        </div>
      )}
    </div>
  );
}
