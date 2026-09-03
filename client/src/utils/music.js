// A small generative horror-synth score for VHS: Video Horror Story.
// Everything here is synthesized live with the Web Audio API (oscillators,
// filtered noise) rather than played from audio files — so there is no
// "loop point" to seam-match at all: the drone/pad layers are continuous
// oscillators, and the rhythmic layers (pulse/heartbeat/perc/arp) are
// freshly synthesized on every beat, never a repeating clip.
//
// The whole score is one persistent engine, not separate tracks that get
// swapped in and out — a handful of gain "layers" are mixed together, and
// changing MUSIC state just ramps each layer's target gain (and the overall
// tempo) toward a new preset, which is what gives the "cinematic crossfade"
// between Menu/Calm/Tension/Danger/Chase/Final Act. Because it's a single
// engine, there is no way to end up with two tracks playing at once.

import { getAudioContext, getMusicBus, noiseBuffer } from "./sound";

const ROOT = 55; // A1 — a dark, low horror-synth key
// Natural minor scale degrees (semitones from root), used by the arp layer.
const SCALE_SEMITONES = [0, 2, 3, 5, 7, 8, 10, 12, 15];
function noteFreq(semitone, octave = 0) {
  return ROOT * 2 ** ((semitone + octave * 12) / 12);
}

// Each state is a target mix (0..1 per layer) plus a target tempo (BPM-ish,
// drives the beat scheduler). "master" scales the whole mix down for the
// "silence is scarier" hush state without needing a separate code path.
const STATES = {
  menu: { tempo: 74, drone: 0.5, pad: 0.4, pulse: 0, heartbeat: 0, perc: 0.05, arp: 0.16, master: 1 },
  calm: { tempo: 82, drone: 0.38, pad: 0.26, pulse: 0.09, heartbeat: 0, perc: 0.04, arp: 0.07, master: 1 },
  tension: { tempo: 98, drone: 0.44, pad: 0.28, pulse: 0.2, heartbeat: 0.07, perc: 0.13, arp: 0.12, master: 1 },
  danger: { tempo: 114, drone: 0.48, pad: 0.2, pulse: 0.28, heartbeat: 0.28, perc: 0.2, arp: 0.03, master: 1 },
  chase: { tempo: 152, drone: 0.36, pad: 0.08, pulse: 0.4, heartbeat: 0.38, perc: 0.36, arp: 0, master: 1 },
  final: { tempo: 170, drone: 0.5, pad: 0.26, pulse: 0.44, heartbeat: 0.42, perc: 0.4, arp: 0.08, master: 1 },
  // "The Killer is in the room and doesn't know you're here" — duck almost
  // everything so a lone heartbeat carries the moment instead of a wall of
  // synth, per the brief's "silence can also be scary".
  hush: { tempo: 88, drone: 0.1, pad: 0.04, pulse: 0, heartbeat: 0.5, perc: 0, arp: 0, master: 0.4 },
};

let built = false;
let ctx = null;
let bus = null;

let droneGain, padGain, pulseGain, heartbeatGain, percGain, arpGain, stateMasterGain;
let padFilter;
let lfoOsc, lfoGain;

let currentState = "menu";
let currentTempo = STATES.menu.tempo;
let targetTempo = STATES.menu.tempo;

let schedulerId = null;
let nextBeatTime = 0;
let beatCount = 0;
let arpIndex = 0;

const RAMP = 1.6; // seconds — normal crossfade between states
const RAMP_FAST = 0.7; // seconds — used for sudden escalation (chase, hush)

function rampTo(node, value, seconds) {
  const t = ctx.currentTime;
  node.gain.cancelScheduledValues(t);
  node.gain.setValueAtTime(node.gain.value, t);
  node.gain.linearRampToValueAtTime(Math.max(0, value), t + seconds);
}

function buildGraph() {
  if (built) return;
  ctx = getAudioContext();
  bus = getMusicBus();
  if (!ctx || !bus) return;
  built = true;

  stateMasterGain = ctx.createGain();
  stateMasterGain.gain.value = 1;
  stateMasterGain.connect(bus);

  // --- Drone: two slow detuned low tones, always present, the "cursed
  // tape hum" underneath everything else. ---
  droneGain = ctx.createGain();
  droneGain.gain.value = 0;
  droneGain.connect(stateMasterGain);
  [0, 7].forEach((semi, i) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = noteFreq(semi, -1);
    osc.detune.value = i === 0 ? -4 : 4;
    osc.connect(droneGain);
    osc.start();
  });

  // --- Pad: a slow minor triad through a filter with a very slow LFO
  // sweep on the cutoff, for that analog-synth "breathing" quality. ---
  padGain = ctx.createGain();
  padGain.gain.value = 0;
  padFilter = ctx.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = 600;
  padFilter.Q.value = 0.6;
  padFilter.connect(padGain);
  padGain.connect(stateMasterGain);
  [0, 3, 7].forEach((semi) => {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = noteFreq(semi, 0);
    osc.detune.value = (Math.random() - 0.5) * 8;
    osc.connect(padFilter);
    osc.start();
  });

  lfoOsc = ctx.createOscillator();
  lfoOsc.type = "sine";
  lfoOsc.frequency.value = 0.045;
  lfoGain = ctx.createGain();
  lfoGain.gain.value = 340;
  lfoOsc.connect(lfoGain).connect(padFilter.frequency);
  lfoOsc.start();

  // Rhythmic layers are silent continuous gain buses; the actual sound for
  // each hit is a short-lived node created fresh in the scheduler below —
  // these just let per-layer volume be ramped independently of the notes.
  pulseGain = ctx.createGain();
  pulseGain.gain.value = 0;
  pulseGain.connect(stateMasterGain);

  heartbeatGain = ctx.createGain();
  heartbeatGain.gain.value = 0;
  heartbeatGain.connect(stateMasterGain);

  percGain = ctx.createGain();
  percGain.gain.value = 0;
  percGain.connect(stateMasterGain);

  arpGain = ctx.createGain();
  arpGain.gain.value = 0;
  arpGain.connect(stateMasterGain);
}

// --- One-shot synthesized hits, scheduled precisely on the audio clock ---
function pluckKick(time, startFreq, endFreq, dur, dest) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(startFreq, time);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), time + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.001, time);
  g.gain.exponentialRampToValueAtTime(1, time + 0.012);
  g.gain.exponentialRampToValueAtTime(0.001, time + dur);
  osc.connect(g).connect(dest);
  osc.start(time);
  osc.stop(time + dur + 0.02);
}

function playPulse(time) {
  pluckKick(time, 140, 42, 0.28, pulseGain);
}

function playHeartbeat(time) {
  pluckKick(time, 90, 32, 0.16, heartbeatGain);
  pluckKick(time + 0.16, 70, 28, 0.14, heartbeatGain);
}

function playPerc(time) {
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer(ctx, 0.3);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1800 + Math.random() * 2600;
  bp.Q.value = 6;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.001, time);
  g.gain.exponentialRampToValueAtTime(0.8, time + 0.004);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
  noise.connect(bp).connect(g).connect(percGain);
  noise.start(time);
  noise.stop(time + 0.12);
}

function playArpNote(time) {
  const semi = SCALE_SEMITONES[arpIndex % SCALE_SEMITONES.length];
  arpIndex++;
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = noteFreq(semi, 1);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.001, time);
  g.gain.exponentialRampToValueAtTime(0.55, time + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
  osc.connect(g).connect(arpGain);
  osc.start(time);
  osc.stop(time + 0.4);
}

function scheduler() {
  if (!built || !ctx) return;
  const cfg = STATES[currentState] || STATES.calm;
  while (nextBeatTime < ctx.currentTime + 0.12) {
    // Nudge tempo gradually toward its target instead of snapping, so a
    // state change accelerates/decelerates rather than jump-cutting.
    currentTempo += (targetTempo - currentTempo) * 0.12;
    const beatDur = 60 / Math.max(40, currentTempo);

    if (currentState !== "menu" && currentState !== "hush") {
      playPulse(nextBeatTime);
    }
    if (cfg.heartbeat > 0.05 && beatCount % 2 === 0) {
      playHeartbeat(nextBeatTime);
    }
    if (cfg.perc > 0.03 && Math.random() < cfg.perc) {
      playPerc(nextBeatTime + beatDur * 0.5);
    }
    if (cfg.arp > 0.03 && beatCount % 2 === 1) {
      playArpNote(nextBeatTime);
    }

    beatCount++;
    nextBeatTime += beatDur;
  }
}

/** Idempotent — safe to call from multiple mounts/effects. Builds the audio
 * graph and starts the beat scheduler; call setMusicState() to pick a mix. */
export function startMusic(initialState = "menu") {
  const c = getAudioContext();
  if (!c) return;
  buildGraph();
  if (!built) return;
  if (nextBeatTime < c.currentTime) nextBeatTime = c.currentTime + 0.05;
  if (!schedulerId) schedulerId = setInterval(scheduler, 30);
  setMusicState(initialState, { immediate: true });
}

export function stopMusic() {
  if (schedulerId) {
    clearInterval(schedulerId);
    schedulerId = null;
  }
  if (stateMasterGain && ctx) rampTo(stateMasterGain, 0, 0.4);
}

/** Crossfade the mix toward a named state. `fast` uses a shorter ramp for
 * sudden escalations (being found, a chase starting). */
export function setMusicState(state, { immediate = false, fast = false } = {}) {
  if (!built || !ctx) return;
  const cfg = STATES[state] || STATES.calm;
  currentState = state;
  targetTempo = cfg.tempo;
  const dur = immediate ? 0.05 : fast ? RAMP_FAST : RAMP;
  rampTo(droneGain, cfg.drone, dur);
  rampTo(padGain, cfg.pad, dur);
  rampTo(pulseGain, cfg.pulse, dur);
  rampTo(heartbeatGain, cfg.heartbeat, dur);
  rampTo(percGain, cfg.perc, dur);
  rampTo(arpGain, cfg.arp, dur);
  rampTo(stateMasterGain, cfg.master, dur);
  if (immediate) currentTempo = cfg.tempo;
}

export function getMusicState() {
  return currentState;
}

export const MUSIC_STATES = Object.keys(STATES);
