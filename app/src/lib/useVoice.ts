import { useEffect, useRef, useState } from "react";

/**
 * Zero-setup browser voice: SpeechSynthesis for the interviewer's voice (TTS)
 * and the Web Speech API for the candidate's mic (STT). This is the spec's
 * no-install fallback; local whisper.cpp / Kokoro can be swapped in later
 * behind the same interface.
 */
export function useVoice() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR && "speechSynthesis" in window);
  }, []);

  /** Speak a chunk of interviewer text (queued in order as chunks stream in). */
  const speak = (text: string) => {
    if (!("speechSynthesis" in window) || !text.trim()) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  const cancelSpeak = () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  /**
   * Listen for one candidate turn. Resolves the final transcript via onFinal
   * when the user stops talking (Web Speech detects end-of-turn on silence).
   * Starting to listen also cancels any in-progress TTS (barge-in).
   */
  const listen = (onFinal: (text: string) => void, onInterim?: (text: string) => void) => {
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
  };

  const stopListen = () => {
    recRef.current?.stop();
    setListening(false);
  };

  useEffect(() => () => cancelSpeak(), []);

  return { supported, listening, speaking, speak, cancelSpeak, listen, stopListen };
}
