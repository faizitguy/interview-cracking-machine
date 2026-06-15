import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Voice for the interview:
 *  - TTS: Kokoro (neural, free, local) generated server-side and played here as
 *    WAV. Realistic and consistent across browsers.
 *  - STT: the browser Web Speech API (free) for hearing the candidate's answers.
 *
 * unlock() must run inside the Start click so the browser lets audio autoplay.
 */

// 1-frame silent WAV to grant audio activation on the Start gesture.
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";

export interface VoiceOption {
  id: string;
  label: string;
}

export function useVoice() {
  const [sttSupported, setSttSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [voiceName, setVoiceName] = useState("af_heart");

  const recRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Pipeline: each queued sentence's audio is fetched immediately (ahead of
  // playback) so the next sentence is ready by the time the current finishes —
  // no gap after every full stop.
  const pendingRef = useRef<Promise<string | null>[]>([]);
  const consumingRef = useRef(false);
  const voiceRef = useRef("af_heart");
  const genRef = useRef(0); // bumped on cancel so stale audio never plays
  const doneResolvers = useRef<(() => void)[]>([]);
  // Web Audio analyser so the avatar can vibrate in sync with the real voice.
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const ensureGraph = () => {
    if (analyserRef.current) return;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const a = audioRef.current ?? new Audio();
      audioRef.current = a;
      const ctx = new Ctx();
      const src = ctx.createMediaElementSource(a);
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      src.connect(an);
      an.connect(ctx.destination);
      ctxRef.current = ctx;
      analyserRef.current = an;
    } catch {
      /* analyser is a nice-to-have */
    }
  };
  const getAnalyser = useCallback(() => analyserRef.current, []);

  const flushDone = () => {
    const rs = doneResolvers.current;
    doneResolvers.current = [];
    rs.forEach((r) => r());
  };

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSttSupported(!!SR);
    fetch("/api/tts/voices")
      .then((r) => r.json())
      .then((j) => {
        if (Array.isArray(j.voices)) setVoices(j.voices);
        if (j.default) {
          voiceRef.current = j.default;
          setVoiceName(j.default);
        }
      })
      .catch(() => {});
  }, []);

  const setVoice = useCallback((id: string) => {
    voiceRef.current = id;
    setVoiceName(id);
  }, []);

  const ensureAudio = () => {
    if (!audioRef.current) audioRef.current = new Audio();
    return audioRef.current;
  };

  /** Run inside the Start gesture to permit autoplay later. */
  const unlock = useCallback(() => {
    const a = ensureAudio();
    ensureGraph();
    ctxRef.current?.resume().catch(() => {});
    a.src = SILENT_WAV;
    a.muted = true;
    a.play().catch(() => {});
  }, []);

  const fetchAudio = async (text: string, gen: number): Promise<string | null> => {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: voiceRef.current }),
      });
      if (!res.ok || genRef.current !== gen) return null;
      const buf = await res.arrayBuffer();
      return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
    } catch {
      return null;
    }
  };

  // Play already-(pre)fetched audio blobs in order, back-to-back.
  const consume = useCallback(async () => {
    if (consumingRef.current) return;
    consumingRef.current = true;
    setSpeaking(true);
    ctxRef.current?.resume().catch(() => {});
    const a = ensureAudio();
    while (pendingRef.current.length) {
      const url = await pendingRef.current.shift()!;
      if (!url) continue;
      a.muted = false;
      a.src = url;
      await a.play().catch(() => {});
      await new Promise<void>((resolve) => {
        a.onended = () => resolve();
        a.onerror = () => resolve();
      });
      URL.revokeObjectURL(url);
    }
    consumingRef.current = false;
    setSpeaking(false);
    flushDone(); // interviewer finished speaking this turn
  }, []);

  /**
   * Queue interviewer text. Split into sentences and start fetching each one's
   * audio IMMEDIATELY (ahead of playback), so by the time one sentence ends the
   * next is already generated — flows without a gap after each full stop.
   */
  const speak = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t) return;
      const sentences = t.match(/[^.!?;—\n]+[.!?;—]*(\s+|$)/g) ?? [t];
      const gen = genRef.current;
      for (const s of sentences) {
        const x = s.trim();
        if (x) pendingRef.current.push(fetchAudio(x, gen));
      }
      consume();
    },
    [consume],
  );

  const cancelSpeak = useCallback(() => {
    genRef.current += 1; // invalidate any in-flight/queued audio
    pendingRef.current = [];
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    consumingRef.current = false;
    setSpeaking(false);
    flushDone();
  }, []);

  /** Resolves once the interviewer has finished speaking the current turn. */
  const whenDoneSpeaking = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (!consumingRef.current && pendingRef.current.length === 0) resolve();
      else doneResolvers.current.push(resolve);
    });
  }, []);

  /** Listen for one candidate turn; resolves the final transcript via onFinal. */
  const listen = useCallback(
    (onFinal: (text: string) => void, onInterim?: (text: string) => void) => {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) return;
      cancelSpeak(); // barge-in
      const r = new SR();
      r.lang = "en-US";
      r.interimResults = true;
      r.continuous = false;
      let finalText = "";
      r.onresult = (e: any) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalText += t;
          else interim += t;
        }
        if (interim && onInterim) onInterim(interim);
      };
      r.onerror = () => setListening(false);
      r.onend = () => {
        setListening(false);
        if (finalText.trim()) onFinal(finalText.trim());
      };
      recRef.current = r;
      setListening(true);
      r.start();
    },
    [cancelSpeak],
  );

  const stopListen = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  useEffect(() => () => cancelSpeak(), [cancelSpeak]);

  return {
    sttSupported,
    listening,
    speaking,
    voices,
    voiceName,
    setVoice,
    unlock,
    speak,
    cancelSpeak,
    whenDoneSpeaking,
    getAnalyser,
    listen,
    stopListen,
  };
}
