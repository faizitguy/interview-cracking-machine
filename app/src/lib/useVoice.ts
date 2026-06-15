import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Zero-setup, FREE browser voice: SpeechSynthesis for the interviewer's voice
 * (TTS) and the Web Speech API for the candidate's mic (STT). All local, no
 * API keys, no network cost.
 *
 * Two things make TTS actually work reliably:
 *  1) unlock() must run inside a user gesture (the Start click) — Chrome blocks
 *     speech that isn't tied to a recent gesture, which is why audio that's
 *     triggered later from a network callback silently never plays.
 *  2) long text is split into sentences (Chrome cuts off utterances ~15s).
 */

// Highest-quality voices first. macOS "Enhanced/Premium" + Siri and Google/
// Microsoft neural voices sound the most natural; fall back to any en voice.
const PREFERRED = [
  /siri/i,
  /\((Premium|Enhanced)\)/i,
  /\b(Ava|Zoe|Evan|Nathan|Joelle|Samantha|Allison|Serena|Tom|Daniel)\b/i,
  /Google US English/i,
  /Google UK English/i,
  /Microsoft.*(Aria|Jenny|Guy|Natural)/i,
  /Natural/i,
];

function chooseVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const en = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  const pool = en.length ? en : voices;
  for (const re of PREFERRED) {
    const hit = pool.find((v) => re.test(v.name));
    if (hit) return hit;
  }
  return pool.find((v) => v.lang?.toLowerCase() === "en-us") ?? pool[0] ?? null;
}

export function useVoice() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState<string>("");
  const recRef = useRef<any>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Load voices (getVoices is async — populated on 'voiceschanged').
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const hasTTS = "speechSynthesis" in window;
    setSupported(!!SR && hasTTS);
    if (!hasTTS) return;
    const load = () => {
      const list = window.speechSynthesis.getVoices();
      if (!list.length) return;
      setVoices(list);
      if (!voiceRef.current) {
        const chosen = chooseVoice(list);
        voiceRef.current = chosen;
        setVoiceName(chosen?.name ?? "");
      }
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const setVoice = useCallback(
    (name: string) => {
      const v = voices.find((x) => x.name === name) ?? null;
      voiceRef.current = v;
      setVoiceName(name);
    },
    [voices],
  );

  /** Call inside a user gesture (Start click) to activate the speech engine. */
  const unlock = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.resume();
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      if (voiceRef.current) u.voice = voiceRef.current;
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window) || !text.trim()) return;
    const ss = window.speechSynthesis;
    ss.resume(); // defeat the "stuck paused" state
    const parts = text.match(/[^.!?\n]+[.!?]*\s*/g) ?? [text];
    for (const part of parts) {
      const t = part.trim();
      if (!t) continue;
      const u = new SpeechSynthesisUtterance(t);
      if (voiceRef.current) u.voice = voiceRef.current;
      u.rate = 1.0;
      u.pitch = 1.0;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(window.speechSynthesis.speaking);
      ss.speak(u);
    }
  }, []);

  const cancelSpeak = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
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
    supported,
    listening,
    speaking,
    voices,
    voiceName,
    setVoice,
    unlock,
    speak,
    cancelSpeak,
    listen,
    stopListen,
  };
}
