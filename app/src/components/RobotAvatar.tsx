import { useEffect, useRef } from "react";

/**
 * A friendly robot interviewer that visibly "speaks": its mouth bars and aura
 * vibrate in sync with the real voice (Web Audio analyser), so it's obvious an
 * AI agent is talking. Falls back to a gentle idle when silent.
 */
export default function RobotAvatar({
  speaking,
  listening,
  getAnalyser,
}: {
  speaking: boolean;
  listening: boolean;
  getAnalyser?: () => AnalyserNode | null;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const speakingRef = useRef(speaking);
  speakingRef.current = speaking;

  useEffect(() => {
    let raf = 0;
    const freq = new Uint8Array(128);
    const bars = barsRef.current ? Array.from(barsRef.current.children) as HTMLElement[] : [];
    const n = bars.length || 5;
    const heights = new Array(n).fill(8);

    const loop = () => {
      const an = getAnalyser?.();
      let level = 0;
      const targets = new Array(n).fill(8);
      if (speakingRef.current && an) {
        an.getByteFrequencyData(freq);
        const step = Math.floor((freq.length * 0.6) / n);
        for (let i = 0; i < n; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += freq[i * step + j] || 0;
          const v = sum / step / 255; // 0..1
          targets[i] = 6 + v * 30;
          level += v;
        }
        level = level / n;
      } else if (speakingRef.current) {
        // no analyser → fake a lively mouth
        for (let i = 0; i < n; i++) targets[i] = 8 + Math.abs(Math.sin(Date.now() / 120 + i)) * 18;
        level = 0.5;
      }
      for (let i = 0; i < n; i++) {
        heights[i] += (targets[i] - heights[i]) * 0.35;
        if (bars[i]) bars[i].style.height = `${heights[i].toFixed(1)}px`;
      }
      if (rootRef.current) {
        rootRef.current.style.setProperty("--lvl", level.toFixed(3));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [getAnalyser]);

  return (
    <div ref={rootRef} className={`robot ${speaking ? "is-speaking" : ""} ${listening ? "is-listening" : ""}`}>
      {/* reactive aura */}
      <div className="robot-aura" />
      {/* pulse rings while speaking */}
      <span className="robot-ring" />
      <span className="robot-ring robot-ring-2" />

      <div className="robot-head">
        <div className="robot-antenna"><span /></div>
        <div className="robot-face">
          <div className="robot-eyes">
            <span className="robot-eye" />
            <span className="robot-eye" />
          </div>
          <div ref={barsRef} className="robot-mouth">
            <div /><div /><div /><div /><div />
          </div>
        </div>
      </div>
    </div>
  );
}
