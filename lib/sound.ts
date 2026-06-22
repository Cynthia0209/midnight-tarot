"use client";

const MUTE_KEY = "midnight-tarot-muted";

export function getMuted() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTE_KEY) === "true";
}

export function setMuted(muted: boolean) {
  window.localStorage.setItem(MUTE_KEY, String(muted));
}

export function playRitualSound(kind: "shuffle" | "draw" | "flip", muted: boolean) {
  if (muted || typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;

  oscillator.type = kind === "shuffle" ? "triangle" : "sine";
  oscillator.frequency.setValueAtTime(kind === "shuffle" ? 120 : kind === "draw" ? 240 : 360, now);
  oscillator.frequency.exponentialRampToValueAtTime(kind === "shuffle" ? 70 : 160, now + 0.18);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(kind === "shuffle" ? 0.025 : 0.04, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "shuffle" ? 0.32 : 0.2));
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.35);
  oscillator.addEventListener("ended", () => void context.close());
}
