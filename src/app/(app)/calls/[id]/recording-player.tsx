"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { focusRing } from "@/components/ui";
import { formatDuration } from "@/lib/format";

const BARS = 80;

/**
 * The call recording as a waveform scrubber over a hidden <audio>. The bars are a stand-in shape
 * seeded from the call id (decoding the audio for a real waveform isn't worth a download up front);
 * the played part is ink. A range input over them is the real control, for keyboard and screen readers.
 */
export function RecordingPlayer({ src, seed, durationSec }: { src: string; seed: string; durationSec: number | null }) {
  const t = useTranslations("calls");
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);
  const [total, setTotal] = useState(durationSec ?? 0);

  const heights = useMemo(() => {
    let h = 0;
    for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return Array.from({ length: BARS }, (_, i) => {
      h = (h * 1103515245 + 12345) >>> 0;
      const wave = Math.abs(Math.sin(i * 0.55) * 0.6 + Math.sin(i * 1.7) * 0.3);
      return 0.2 + Math.min(0.8, wave * 0.7 + ((h >>> 16) % 100) / 400);
    });
  }, [seed]);

  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    const time = () => setAt(el.currentTime);
    const meta = () => Number.isFinite(el.duration) && setTotal(el.duration);
    const end = () => setPlaying(false);
    el.addEventListener("timeupdate", time);
    el.addEventListener("loadedmetadata", meta);
    el.addEventListener("ended", end);
    return () => {
      el.removeEventListener("timeupdate", time);
      el.removeEventListener("loadedmetadata", meta);
      el.removeEventListener("ended", end);
    };
  }, []);

  function toggle() {
    const el = audio.current;
    if (!el) return;
    if (el.paused) {
      el.play().then(() => setPlaying(true), () => setPlaying(false));
    } else {
      el.pause();
      setPlaying(false);
    }
  }

  const played = total > 0 ? at / total : 0;
  return (
    <div className="flex items-center gap-4">
      <audio ref={audio} src={src} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? t("pauseRecording") : t("playRecording")}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-900 text-white hover:bg-stone-700 ${focusRing}`}
      >
        <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className="h-3.5 w-3.5">
          {playing ? <path d="M4 3h3v10H4zM9 3h3v10H9z" /> : <path d="M4.5 2.5v11l9-5.5z" />}
        </svg>
      </button>
      <div className="relative flex h-9 min-w-0 flex-1 items-center gap-[2px]">
        {heights.map((h, i) => (
          <span
            key={i}
            aria-hidden
            className={`min-w-[2px] flex-1 rounded-sm ${i / BARS < played ? "bg-stone-900" : "bg-stone-300"}`}
            style={{ height: `${Math.round(h * 100)}%` }}
          />
        ))}
        <input
          type="range"
          min={0}
          max={Math.max(total, 0.1)}
          step={0.1}
          value={at}
          aria-label={t("seekRecording")}
          aria-valuetext={`${formatDuration(Math.floor(at))} / ${formatDuration(Math.round(total))}`}
          onChange={(e) => {
            const el = audio.current;
            if (el) el.currentTime = Number(e.target.value);
            setAt(Number(e.target.value));
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
      <span className="shrink-0 whitespace-nowrap text-[13px] text-stone-600 tabular-nums">
        {formatDuration(Math.floor(at))} / {formatDuration(Math.round(total))}
      </span>
    </div>
  );
}
