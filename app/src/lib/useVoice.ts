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
  const queueRef = useRef<string[]>([]);
  const playingRef = useRef(false);
  const voiceRef = useRef("af_heart");
  const genRef = useRef(0); // bumped on cancel so stale audio never plays
  const doneResolvers = useRef<(() => void)[]>([]);

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
    a.src = SILENT_WAV;
    a.muted = true;
    a.play().catch(() => {});
  }, []);

  const playNext = useCallback(async () => {
    if (playingRef.current) return;
    const text = queueRef.current.shift();
    if (text == null) {
      setSpeaking(false);
      flushDone(); // interviewer finished speaking this turn
      return;
    }
    const myGen = genRef.current;
    playingRef.current = true;
    setSpeaking(true);
    let url: string | null = null;
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: voiceRef.current }),
      });
      if (res.ok && genRef.current === myGen) {
        const buf = await res.arrayBuffer();
        url = URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
        const a = ensureAudio();
        a.muted = false;
        a.src = url;
        await a.play().catch(() => {});
        await new Promise<void>((resolve) => {
          a.onended = () => resolve();
          a.onerror = () => resolve();
        });
      }
    } catch {
      /* ignore one chunk */
    } finally {
      if (url) URL.revokeObjectURL(url);
      playingRef.current = false;
      if (genRef.current === myGen) playNext();
      else flushDone();
    }
  }, []);

  /**
   * Queue interviewer text to be spoken. Split into sentences so the first one
   * synthesizes and starts playing fast (~1s) while the rest generate — instead
   * of waiting for the whole turn.
   */
  const speak = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t) return;
      // Break on sentence ends + em-dash/semicolon so the first chunk is short
      // (fast time-to-first-audio); the rest generate while it plays.
      const sentences = t.match(/[^.!?;—\n]+[.!?;—]*(\s+|$)/g) ?? [t];
      for (const s of sentences) {
        const x = s.trim();
        if (x) queueRef.current.push(x);
      }
      playNext();
    },
    [playNext],
  );

  const cancelSpeak = useCallback(() => {
    genRef.current += 1; // invalidate any in-flight/queued audio
    queueRef.current = [];
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    playingRef.current = false;
    setSpeaking(false);
    flushDone();
  }, []);

  /** Resolves once the interviewer has finished speaking the current turn. */
  const whenDoneSpeaking = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (!playingRef.current && queueRef.current.length === 0) resolve();
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
    listen,
    stopListen,
  };
}
