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
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null); // "said nothing at all" timer
  const stoppedRef = useRef(false); // true = we stopped on purpose (don't auto-restart)
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

  /**
   * Listen for one candidate turn.
   *
   * The hard part with the Web Speech API is end-of-turn detection. With
   * `continuous = false` the recognizer ends the session at the first short
   * pause, so a 1–2s "let me think" gap gets mistaken for "I'm done" and a
   * half-finished answer is submitted — the AI then talks over you.
   *
   * Instead we run `continuous = true` (the session stays open across pauses)
   * and decide the turn is over ourselves: a silence timer that resets on every
   * speech event and only fires after a real ~2.5s gap. We also auto-restart if
   * Chrome ends the session on its own (it times out long-running sessions), so
   * the mic never silently dies mid-interview.
   */
  const listen = useCallback(
    (
      onFinal: (text: string) => void,
      onInterim?: (text: string) => void,
      onSilence?: () => void, // candidate said nothing at all for `idleMs`
      idleMs = 12000,
    ) => {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) return;
      cancelSpeak(); // barge-in: stop any interviewer audio the moment we listen

      // Tear down any previous recognizer cleanly.
      if (silenceRef.current) clearTimeout(silenceRef.current);
      if (idleRef.current) clearTimeout(idleRef.current);
      if (recRef.current) {
        try {
          recRef.current.onend = null;
          recRef.current.onresult = null;
          recRef.current.abort();
        } catch {
          /* ignore */
        }
      }

      const ENDPOINT_SILENCE_MS = 3500; // how long a pause counts as "I'm done"
      const r = new SR();
      r.lang = "en-US";
      r.interimResults = true;
      r.continuous = true;
      let finalText = "";
      let done = false;
      let heard = false; // has the candidate produced ANY speech this turn?

      const finish = () => {
        if (done) return;
        done = true;
        if (silenceRef.current) clearTimeout(silenceRef.current);
        if (idleRef.current) clearTimeout(idleRef.current);
        stoppedRef.current = true; // we're stopping on purpose now
        try {
          r.onresult = null;
          r.onend = null;
          r.stop();
        } catch {
          /* ignore */
        }
        setListening(false);
        const text = finalText.trim();
        if (text) onFinal(text);
      };

      // Reset the "are they done?" countdown on any speech activity.
      const armSilence = () => {
        if (silenceRef.current) clearTimeout(silenceRef.current);
        silenceRef.current = setTimeout(finish, ENDPOINT_SILENCE_MS);
      };

      // Separate from the end-of-turn timer above: this fires when the candidate
      // says NOTHING at all for a while. We hand the turn back (without a
      // submitted answer) so the interviewer can check in instead of the mic
      // listening forever to silence. Keeps counting across Chrome's auto
      // session restarts; cancelled the instant any speech is heard.
      const armIdle = () => {
        if (!onSilence) return;
        if (idleRef.current) clearTimeout(idleRef.current);
        idleRef.current = setTimeout(() => {
          if (done || heard) return;
          done = true;
          stoppedRef.current = true; // don't auto-restart on the resulting onend
          if (silenceRef.current) clearTimeout(silenceRef.current);
          try {
            r.onresult = null;
            r.onend = null;
            r.stop();
          } catch {
            /* ignore */
          }
          setListening(false);
          onSilence();
        }, idleMs);
      };

      r.onresult = (e: any) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalText += t + " ";
          else interim += t;
        }
        if (onInterim) onInterim((finalText + interim).trim());
        // The candidate is actually talking now: cancel the "are you there?"
        // idle timer and switch to end-of-turn detection. We only start the
        // end-of-turn countdown once we've heard something, so a candidate who
        // takes a few seconds to begin isn't cut off mid-thought.
        if (finalText.trim() || interim.trim()) {
          heard = true;
          if (idleRef.current) clearTimeout(idleRef.current);
          armSilence();
        }
      };

      r.onerror = (ev: any) => {
        const err = ev?.error;
        if (err === "not-allowed" || err === "service-not-allowed") {
          // No mic permission — give up gracefully (typing still works).
          stoppedRef.current = true;
          setListening(false);
        }
        // 'no-speech' / 'aborted' / 'network' are transient: let onend restart.
      };

      r.onend = () => {
        if (done || stoppedRef.current) {
          setListening(false);
          return;
        }
        // Chrome ended the session on its own but the candidate isn't finished —
        // restart so listening continues seamlessly across the gap.
        try {
          r.start();
        } catch {
          /* a start() race; the next onend will retry */
        }
      };

      recRef.current = r;
      stoppedRef.current = false;
      setListening(true);
      armIdle(); // start the silent-candidate countdown now
      try {
        r.start();
      } catch {
        /* already started */
      }
    },
    [cancelSpeak],
  );

  const stopListen = useCallback(() => {
    stoppedRef.current = true; // prevent the onend auto-restart
    if (silenceRef.current) clearTimeout(silenceRef.current);
    if (idleRef.current) clearTimeout(idleRef.current);
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  useEffect(
    () => () => {
      cancelSpeak();
      stoppedRef.current = true;
      if (silenceRef.current) clearTimeout(silenceRef.current);
      if (idleRef.current) clearTimeout(idleRef.current);
      try {
        recRef.current?.abort();
      } catch {
        /* ignore */
      }
    },
    [cancelSpeak],
  );

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
