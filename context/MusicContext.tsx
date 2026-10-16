"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { MusicSettings } from "@/types/wedding";

interface MusicContextType {
  isPlaying: boolean;
  isMuted: boolean;
  hasStarted: boolean;
  trackInfo: {
    title: string;
    artist: string;
  };
  startMusic: () => Promise<void>;
  togglePlay: () => void;
  toggleMute: () => void;
}

const MusicContext = createContext<MusicContextType | null>(null);

export const MusicProvider: React.FC<{
  settings: MusicSettings;
  children: React.ReactNode;
}> = ({ settings, children }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [hasStarted, setHasStarted] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const webAudioCtxRef = useRef<AudioContext | null>(null);
  const synthIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize persistent audio element
  useEffect(() => {
    if (typeof window === "undefined") return;

    const audio = new Audio();
    audio.src = settings.audioUrl;
    audio.loop = settings.loop;
    audio.preload = "auto";
    audio.volume = 0.6;

    // Track play/pause state from audio element
    audio.addEventListener("play", () => setIsPlaying(true));
    audio.addEventListener("pause", () => setIsPlaying(false));
    audio.addEventListener("ended", () => {
      if (!settings.loop) setIsPlaying(false);
    });

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
      if (synthIntervalRef.current) {
        clearInterval(synthIntervalRef.current);
      }
      if (webAudioCtxRef.current && webAudioCtxRef.current.state !== "closed") {
        webAudioCtxRef.current.close().catch(() => {});
      }
    };
  }, [settings.audioUrl, settings.loop]);

  // Graceful Web Audio ambient chord synthesizer fallback in case the external audio fails to load
  const startSynthAmbient = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      webAudioCtxRef.current = ctx;

      // Gentle romantic pentatonic notes: C4, E4, G4, B4, D5
      const notes = [261.63, 329.63, 392.0, 493.88, 587.33];
      let noteIndex = 0;

      const playChime = () => {
        if (ctx.state === "suspended") {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.value = notes[noteIndex % notes.length];
        noteIndex++;

        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.04, now + 0.8);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 3.6);
      };

      playChime();
      synthIntervalRef.current = setInterval(playChime, 3800);
      setIsPlaying(true);
    } catch {
      // Audio fallback suppression
    }
  }, []);

  // Called explicitly when user taps "Open Invitation"
  const startMusic = useCallback(async () => {
    setHasStarted(true);

    if (audioRef.current) {
      try {
        audioRef.current.muted = false;
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        // If external audio is blocked by network or CORS, activate soft Web Audio ambient fallback
        console.warn("External audio playback could not begin, using gentle ambient fallback.", err);
        startSynthAmbient();
      }
    }
  }, [startSynthAmbient]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      if (webAudioCtxRef.current && webAudioCtxRef.current.state === "running") {
        webAudioCtxRef.current.suspend().catch(() => {});
      }
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          if (webAudioCtxRef.current && webAudioCtxRef.current.state === "suspended") {
            webAudioCtxRef.current.resume().catch(() => {});
            setIsPlaying(true);
          }
        });
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      const nextMuted = !isMuted;
      audioRef.current.muted = nextMuted;
      setIsMuted(nextMuted);

      if (webAudioCtxRef.current) {
        if (nextMuted) {
          webAudioCtxRef.current.suspend().catch(() => {});
        } else {
          webAudioCtxRef.current.resume().catch(() => {});
        }
      }
    }
  }, [isMuted]);

  return (
    <MusicContext.Provider
      value={{
        isPlaying,
        isMuted,
        hasStarted,
        trackInfo: {
          title: settings.trackTitle,
          artist: settings.artist,
        },
        startMusic,
        togglePlay,
        toggleMute,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error("useMusic must be used within a MusicProvider");
  }
  return context;
};
