'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string;
  audioTitle?: string;
  hasInteracted: boolean;
}

/**
 * Background Music Controller
 * -Strictly uses the client-provided/uploaded audio asset (`audioUrl`).
 * -Never generates synthetic music or Web Audio oscillator fallback.
 * -If `audioUrl` is empty, renders nothing.
 * -Respects browser autoplay policies and begins only after guest interaction.
 */
export function AudioPlayer({
  audioUrl,
  audioTitle,
  hasInteracted,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const hasAutoStartedRef = useRef(false);

  const cleanUrl = (audioUrl || '').trim();

  useEffect(() => {
    if (!cleanUrl || !hasInteracted || hasAutoStartedRef.current) return;
    const el = audioRef.current;
    if (!el) return;

    hasAutoStartedRef.current = true;
    el.play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch(() => {
        // Browser blocked autoplay; guest can click Play manually
        setIsPlaying(false);
      });
  }, [cleanUrl, hasInteracted]);

  if (!cleanUrl) {
    return null;
  }

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const toggleMute = () => {
    const el = audioRef.current;
    if (!el) return;
    const nextMuted = !isMuted;
    el.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  return (
    <div
      className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-4 z-40 flex items-center gap-1.5 border border-softGold/60 bg-warmWhite/95 px-3 py-2 shadow-editorial backdrop-blur-sm sm:bottom-6 sm:right-6"
      role="region"
      aria-label={audioTitle || 'Background wedding music controls'}
    >
      <audio
        ref={audioRef}
        src={cleanUrl}
        loop
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <button
        type="button"
        onClick={togglePlay}
        className="flex h-8 w-8 items-center justify-center text-charcoal transition-colors hover:text-softGold"
        aria-label={isPlaying ? 'Pause background music' : 'Play background music'}
        title={isPlaying ? 'Pause music' : 'Play music'}
      >
        {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>

      <button
        type="button"
        onClick={toggleMute}
        className="flex h-8 w-8 items-center justify-center text-charcoal transition-colors hover:text-softGold"
        aria-label={isMuted ? 'Unmute background music' : 'Mute background music'}
        title={isMuted ? 'Unmute music' : 'Mute music'}
      >
        {isMuted ? (
          <VolumeX className="h-3.5 w-3.5 text-mutedGray" />
        ) : (
          <Volume2 className="h-3.5 w-3.5 text-softGold" />
        )}
      </button>

      {audioTitle && (
        <span className="hidden sm:inline-block max-w-[140px] truncate pl-1 font-montserrat text-[10px] uppercase tracking-wider text-mutedGray">
          {audioTitle}
        </span>
      )}
    </div>
  );
}

