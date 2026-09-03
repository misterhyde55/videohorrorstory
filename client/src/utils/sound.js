// Tiny synthesized SFX/ambience for the home screen — no audio files, just
// the Web Audio API. Everything is gated behind the browser's autoplay
// rules: nothing plays until the first real user gesture, and every call
// is wrapped so a browser without Web Audio (or one that refuses to start
// the context) just silently does nothing instead of throwing.

const MUTE_KEY = "vhs_sound_muted";

let ctx = null;
let masterGain = null;
let ambienceNodes = null;
let started = false;

function getMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function setMutedPref(muted) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // localStorage unavailable — the toggle just won't persist across visits.
  }
}

function ensureContext() {
  if (ctx) return ctx;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  try {
    ctx = new AudioCtx();
    masterGain = ctx.createGain();
    masterGain.gain.value = getMuted() ? 0 : 1;
    masterGain.connect(ctx.destination);
  } catch {
    ctx = null;
  }
  return ctx;
}

// Call once on the very first pointerdown/keydown anywhere on the home
// screen. Safe to call more than once — only the first call does anything.
export function startAudioOnGesture() {
  if (started) return;
  started = true;
  const c = ensureContext();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  startAmbience();
}

function noiseBuffer(c) {
  const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

export function startAmbience() {
  const c = ensureContext();
  if (!c || ambienceNodes) return;
  try {
    const hum = c.createOscillator();
    hum.type = "sine";
    hum.frequency.value = 58;
    const humGain = c.createGain();
    humGain.gain.value = 0.02;
    hum.connect(humGain).connect(masterGain);
    hum.start();

    const noise = c.createBufferSource();
    noise.buffer = noiseBuffer(c);
    noise.loop = true;
    const noiseFilter = c.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.value = 1400;
    const noiseGain = c.createGain();
    noiseGain.gain.value = 0.012;
    noise.connect(noiseFilter).connect(noiseGain).connect(masterGain);
    noise.start();

    ambienceNodes = { hum, humGain, noise, noiseFilter, noiseGain };
  } catch {
    ambienceNodes = null;
  }
}

export function stopAmbience() {
  if (!ambienceNodes) return;
  try {
    ambienceNodes.hum.stop();
    ambienceNodes.noise.stop();
  } catch {
    // already stopped
  }
  ambienceNodes = null;
}

// A short, soft blip for moving the menu cursor between options.
export function playHoverBlip() {
  const c = ensureContext();
  if (!c) return;
  try {
    const osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 720;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.06, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.07);
    osc.connect(gain).connect(masterGain);
    osc.start();
    osc.stop(c.currentTime + 0.08);
  } catch {
    // ignore
  }
}

// A quick mechanical click — confirming a menu selection, like a VCR button.
export function playSelectClick() {
  const c = ensureContext();
  if (!c) return;
  try {
    const osc = c.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(180, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, c.currentTime + 0.06);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.09, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.09);
    osc.connect(gain).connect(masterGain);
    osc.start();
    osc.stop(c.currentTime + 0.1);
  } catch {
    // ignore
  }
}

export function isMuted() {
  return getMuted();
}

export function setMuted(muted) {
  setMutedPref(muted);
  if (masterGain) {
    masterGain.gain.value = muted ? 0 : 1;
  }
}
