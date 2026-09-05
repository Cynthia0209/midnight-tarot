"use client";

const MUTE_KEY = "midnight-tarot-muted";

type AudioWindow = typeof window & {
  webkitAudioContext?: typeof AudioContext;
};

let audioContext: AudioContext | undefined;

function getAudioContext() {
  if (typeof window === "undefined") return undefined;
  const AudioContextClass = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
  if (!AudioContextClass) return undefined;
  audioContext ??= new AudioContextClass();
  return audioContext;
}

export function getMuted() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean) {
  try {
    window.localStorage.setItem(MUTE_KEY, String(muted));
  } catch {
    // Sound still changes for the current page even if the preference cannot persist.
  }
}

export async function unlockRitualSound() {
  const context = getAudioContext();
  if (!context || context.state === "running") return;

  try {
    await context.resume();
  } catch {
    // Some browsers only allow resume during a direct user gesture.
  }
}

export function playRitualSound(kind: "shuffle" | "draw" | "flip", muted: boolean) {
  if (muted) return;

  void (async () => {
    const context = getAudioContext();
    if (!context) return;
    if (context.state !== "running") await unlockRitualSound();
    if (context.state !== "running") return;

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();

    oscillator.type = kind === "shuffle" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(kind === "shuffle" ? 155 : kind === "draw" ? 310 : 460, now);
    oscillator.frequency.exponentialRampToValueAtTime(kind === "shuffle" ? 78 : kind === "draw" ? 190 : 250, now + 0.22);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(kind === "shuffle" ? 900 : 1500, now);

    const peakVolume = kind === "shuffle" ? 0.075 : kind === "draw" ? 0.09 : 0.08;
    const duration = kind === "shuffle" ? 0.42 : 0.24;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peakVolume, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(filter).connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  })().catch(() => {
    // Sound is atmospheric enhancement; audio failures must not interrupt the ritual.
  });
}
