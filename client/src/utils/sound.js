// Shared Web Audio foundation for the whole game — one AudioContext, one
// master bus, and two child buses (music / sfx) so the Settings panel can
// control each independently. No audio files anywhere: every sound in the
// game (menu blips, ambience, the whole music system in music.js) is
// synthesized live with oscillators/noise, which sidesteps loop-seam and
// asset-loading concerns entirely.
//
// Everything is gated behind the browser's autoplay rules: nothing plays
// until the first real user gesture (see startAudioOnGesture), and every
// call is wrapped so a browser without Web Audio just silently does
// nothing instead of throwing.

const VOL_MASTER_KEY = "vhs_vol_master";
const VOL_MUSIC_KEY = "vhs_vol_music";
const VOL_SFX_KEY = "vhs_vol_sfx";
const MUTE_MUSIC_KEY = "vhs_music_muted";
const MUTE_SFX_KEY = "vhs_sfx_muted";

let ctx = null;
let masterGain = null;
let musicBus = null;
let sfxBus = null;
let started = false;

function readVolume(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const v = parseFloat(raw);
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;
  } catch {
    return fallback;
  }
}

function readBool(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw === "1";
  } catch {
    return fallback;
  }
}

function writeSetting(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // localStorage unavailable — the setting just won't persist across visits.
  }
}

let masterVolume = readVolume(VOL_MASTER_KEY, 1);
let musicVolume = readVolume(VOL_MUSIC_KEY, 0.7);
let sfxVolume = readVolume(VOL_SFX_KEY, 0.85);
let musicMuted = readBool(MUTE_MUSIC_KEY, false);
let sfxMuted = readBool(MUTE_SFX_KEY, false);

function ensureContext() {
  if (ctx) return ctx;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  try {
    ctx = new AudioCtx();
    masterGain = ctx.createGain();
    masterGain.gain.value = masterVolume;
    masterGain.connect(ctx.destination);

    musicBus = ctx.createGain();
    musicBus.gain.value = musicMuted ? 0 : musicVolume;
    musicBus.connect(masterGain);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = sfxMuted ? 0 : sfxVolume;
    sfxBus.connect(masterGain);
  } catch {
    ctx = null;
  }
  return ctx;
}

export function getAudioContext() {
  return ensureContext();
}

export function getMusicBus() {
  ensureContext();
  return musicBus;
}

export function getSfxBus() {
  ensureContext();
  return sfxBus;
}

// Call on the first pointerdown/keydown anywhere in the app — this is what
// lets the browser's autoplay policy allow any sound at all. Safe to call
// more than once; only the first call does anything.
export function startAudioOnGesture() {
  if (started) return;
  started = true;
  const c = ensureContext();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
}

export function hasAudioStarted() {
  return started;
}

export function noiseBuffer(c, seconds = 2) {
  const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

// --- Volume / mute settings, each independently persisted ---
export function getMasterVolume() {
  return masterVolume;
}
export function setMasterVolume(v) {
  masterVolume = Math.max(0, Math.min(1, v));
  writeSetting(VOL_MASTER_KEY, masterVolume);
  if (masterGain) masterGain.gain.value = masterVolume;
}

export function getMusicVolume() {
  return musicVolume;
}
export function setMusicVolume(v) {
  musicVolume = Math.max(0, Math.min(1, v));
  writeSetting(VOL_MUSIC_KEY, musicVolume);
  if (musicBus && !musicMuted) musicBus.gain.value = musicVolume;
}

export function getSfxVolume() {
  return sfxVolume;
}
export function setSfxVolume(v) {
  sfxVolume = Math.max(0, Math.min(1, v));
  writeSetting(VOL_SFX_KEY, sfxVolume);
  if (sfxBus && !sfxMuted) sfxBus.gain.value = sfxVolume;
}

export function isMusicMuted() {
  return musicMuted;
}
export function setMusicMuted(muted) {
  musicMuted = muted;
  writeSetting(MUTE_MUSIC_KEY, muted ? "1" : "0");
  if (musicBus) musicBus.gain.value = muted ? 0 : musicVolume;
}

export function isSfxMuted() {
  return sfxMuted;
}
export function setSfxMuted(muted) {
  sfxMuted = muted;
  writeSetting(MUTE_SFX_KEY, muted ? "1" : "0");
  if (sfxBus) sfxBus.gain.value = muted ? 0 : sfxVolume;
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
    osc.connect(gain).connect(sfxBus);
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
    osc.connect(gain).connect(sfxBus);
    osc.start();
    osc.stop(c.currentTime + 0.1);
  } catch {
    // ignore
  }
}

// Backward-compatible single on/off switch some older UI still reads —
// toggles both buses together.
export function isMuted() {
  return musicMuted && sfxMuted;
}
export function setMuted(muted) {
  setMusicMuted(muted);
  setSfxMuted(muted);
}
