// Kokoro — free, local, neural TTS (runs offline after a one-time model
// download). We generate WAV server-side and the browser just plays it.
import { KokoroTTS } from "kokoro-js";

const MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";

let ttsPromise: Promise<any> | null = null;
let ready = false;

/** Lazy-load the model once; subsequent calls reuse it. */
export function loadTTS(): Promise<any> {
  if (!ttsPromise) {
    ttsPromise = KokoroTTS.from_pretrained(MODEL, { dtype: "q8", device: "cpu" }).then((t: any) => {
      ready = true;
      return t;
    });
  }
  return ttsPromise;
}

export function ttsReady(): boolean {
  return ready;
}

// Curated Kokoro v1 voices (a=American, b=British; f=female, m=male).
const VOICE_IDS = [
  "af_heart", "af_bella", "af_nicole", "af_sarah", "af_nova", "af_aoede", "af_kore", "af_sky",
  "am_adam", "am_michael", "am_fenrir", "am_echo", "am_eric", "am_liam", "am_onyx", "am_puck",
  "bf_emma", "bf_isabella", "bf_alice", "bf_lily",
  "bm_george", "bm_daniel", "bm_fable", "bm_lewis",
];
const VALID = new Set(VOICE_IDS);

export const VOICES = VOICE_IDS.map((id) => {
  const region = id[0] === "a" ? "American" : "British";
  const gender = id[1] === "f" ? "female" : "male";
  const name = id.slice(3).replace(/^./, (c) => c.toUpperCase());
  return { id, label: `${name} — ${region} ${gender}` };
});

export const DEFAULT_VOICE = "af_heart";

// Serialize generation so concurrent requests don't fight over onnxruntime.
let chain: Promise<unknown> = Promise.resolve();

export function synth(text: string, voice: string): Promise<Buffer> {
  const run = chain.then(async () => {
    const tts = await loadTTS();
    const audio = await tts.generate(text, { voice: VALID.has(voice) ? voice : DEFAULT_VOICE });
    return Buffer.from(audio.toWav());
  });
  chain = run.catch(() => {});
  return run;
}
