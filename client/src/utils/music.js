// A small generative horror-synth score for VHS: Video Horror Story —
// aiming squarely at 1980s slasher-movie synth scores (Carpenter's
// Halloween/The Fog, Tangerine Dream) rather than a "video game menu"
// sound: a relentless, minimal minor-2nd ostinato, a dissonant tritone
// drone underneath everything, and a slow analog tape-warble wobble over
// the whole mix. Everything is synthesized live with the Web Audio API
// (oscillators, filtered noise) rather than played from audio files — so
// there is no "loop point" to seam-match at all: the drone/cluster layers
// are continuous oscillators, and the rhythmic layers (ostinato/pulse/
// heartbeat/perc/sting) are freshly synthesized on every beat, never a
// repeating clip.
//
// The whole score is one persistent engine, not separate tracks that get
// swapped in and out — a handful of gain "layers" are mixed together, and
// changing MUSIC state just ramps each layer's target gain (and the overall
// tempo) toward a new preset, which is what gives the "cinematic crossfade"
// between Menu/Calm/Tension/Danger/Chase/Final Act. Because it's a single
// engine, there is no way to end up with two tracks playing at once.

import { getAudioContext, getMusicBus, noiseBuffer } from "./sound";

const ROOT = 55; // A1 — a dark, low horror-synth key
// The two-note cell the ostinato and drone are built from: the root and a
// minor 2nd above it, the classic "wrong note" dissonance horror scores
// lean on (think the Halloween theme's insistent half-step). TRITONE adds
// the other genre-defining interval — the "devil's interval" — to the
// sustained cluster underneath.
const MINOR2 = 1;
const TRITONE = 6;
function noteFreq(semitone, octave = 0) {
  return ROOT * 2 ** ((semitone + octave * 12) / 12);
}

// Each state is a target mix (0..1 per layer) plus a target tempo (BPM-ish,
// drives the beat scheduler) and a rare "sting" probability. "master" scales
// the whole mix down for the "silence is scarier" hush state without
// needing a separate code path.
//
// The home screen keeps a full, present score — that's the one place this
// game plays like a title screen. The moment a match starts, the mix drops
// back to something closer to Friday the 13th (2017)'s sound design: mostly
// wind/ambience and a barely-there drone while nothing is happening, with
// the actual "music" (the ostinato, the pulse) held in reserve and only
// earned once the Killer is genuinely a threat. Calm should feel like held
// breath, not a soundtrack.
const STATES = {
  menu: { tempo: 116, drone: 0.42, cluster: 0.22, pulse: 0, heartbeat: 0, perc: 0.03, ostinato: 0.3, sting: 0, ambient: 0, master: 1 },
  calm: { tempo: 88, drone: 0.12, cluster: 0.04, pulse: 0, heartbeat: 0, perc: 0.012, ostinato: 0, sting: 0.02, ambient: 0.24, master: 1 },
  tension: { tempo: 100, drone: 0.2, cluster: 0.09, pulse: 0.05, heartbeat: 0, perc: 0.05, ostinato: 0.07, sting: 0.035, ambient: 0.26, master: 1 },
  danger: { tempo: 120, drone: 0.34, cluster: 0.18, pulse: 0.22, heartbeat: 0.24, perc: 0.15, ostinato: 0.22, sting: 0.05, ambient: 0.18, master: 1 },
  chase: { tempo: 168, drone: 0.34, cluster: 0.16, pulse: 0.42, heartbeat: 0.4, perc: 0.36, ostinato: 0.34, sting: 0.06, ambient: 0.08, master: 1 },
  final: { tempo: 176, drone: 0.48, cluster: 0.3, pulse: 0.46, heartbeat: 0.44, perc: 0.4, ostinato: 0.36, sting: 0.07, ambient: 0.06, master: 1 },
  // "The Killer is in the room and doesn't know you're here" — duck almost
  // everything so a lone heartbeat carries the moment instead of a wall of
  // synth, per the brief's "silence can also be scary".
  hush: { tempo: 100, drone: 0.05, cluster: 0, pulse: 0, heartbeat: 0.5, perc: 0, ostinato: 0, sting: 0, ambient: 0.14, master: 0.4 },
};

let built = false;
let ctx = null;
let bus = null;

let droneGain, clusterGain, pulseGain, heartbeatGain, percGain, ostinatoGain, ambientGain, stingGain, stateMasterGain;
let clusterFilter;
let lfoOsc, lfoGain;
let warbleOsc, warbleGain;
let windFilter, windLfoOsc, windLfoGain;

let currentState = "menu";
let currentTempo = STATES.menu.tempo;
let targetTempo = STATES.menu.tempo;

let schedulerId = null;
let nextBeatTime = 0;
let beatCount = 0;

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

  // A slow, subtle pitch wobble fanned out to every sustained oscillator's
  // detune below — an analog tape-warble wow-and-flutter, tying the score
  // to the game's VHS identity and giving it that slightly-unstable
  // 80s-synth-through-an-old-tape-deck quality instead of a clean, static
  // digital drone.
  warbleOsc = ctx.createOscillator();
  warbleOsc.type = "sine";
  warbleOsc.frequency.value = 0.18;
  warbleGain = ctx.createGain();
  warbleGain.gain.value = 3.5;
  warbleOsc.connect(warbleGain);
  warbleOsc.start();

  // --- Drone: root and tritone, an octave down, heavily detuned against
  // each other so they beat slowly and never quite settle — the sustained
  // "something is wrong" tone under the whole score. ---
  droneGain = ctx.createGain();
  droneGain.gain.value = 0;
  droneGain.connect(stateMasterGain);
  [
    { semi: 0, detune: -8 },
    { semi: 0, detune: 8 },
    { semi: TRITONE, detune: -5 },
  ].forEach(({ semi, detune }) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = noteFreq(semi, -1);
    osc.detune.value = detune;
    warbleGain.connect(osc.detune);
    osc.connect(droneGain);
    osc.start();
  });

  // --- Cluster: root + minor 2nd + tritone through a filter with a very
  // slow LFO sweep on the cutoff — a sustained dissonant chord instead of
  // a pretty triad, the "cold synth pad" of a slasher score, not a fantasy
  // adventure one. ---
  clusterGain = ctx.createGain();
  clusterGain.gain.value = 0;
  clusterFilter = ctx.createBiquadFilter();
  clusterFilter.type = "lowpass";
  clusterFilter.frequency.value = 500;
  clusterFilter.Q.value = 0.7;
  clusterFilter.connect(clusterGain);
  clusterGain.connect(stateMasterGain);
  [0, MINOR2, TRITONE].forEach((semi) => {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = noteFreq(semi, 0);
    osc.detune.value = (Math.random() - 0.5) * 10;
    warbleGain.connect(osc.detune);
    osc.connect(clusterFilter);
    osc.start();
  });

  lfoOsc = ctx.createOscillator();
  lfoOsc.type = "sine";
  lfoOsc.frequency.value = 0.04;
  lfoGain = ctx.createGain();
  lfoGain.gain.value = 260;
  lfoOsc.connect(lfoGain).connect(clusterFilter.frequency);
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

  ostinatoGain = ctx.createGain();
  ostinatoGain.gain.value = 0;
  ostinatoGain.connect(stateMasterGain);

  // Stings are a one-off event, not an ambient layer — always audible at a
  // fixed level when they fire (gated only by how *often* they fire, via
  // cfg.sting), rather than getting scaled down by the quiet percussion
  // level Calm/Tension otherwise use. That's what makes them land as a
  // genuine jolt during an otherwise near-silent stretch.
  stingGain = ctx.createGain();
  stingGain.gain.value = 1;
  stingGain.connect(stateMasterGain);

  // --- Ambient: a continuous, slowly-shifting filtered-noise bed — wind
  // through the trees, a low room tone — carrying most of the gameplay
  // mix's "creepiness" while everything else stays near-silent. This is
  // what keeps Calm from being dead air. ---
  ambientGain = ctx.createGain();
  ambientGain.gain.value = 0;
  ambientGain.connect(stateMasterGain);
  const wind = ctx.createBufferSource();
  wind.buffer = noiseBuffer(ctx, 4);
  wind.loop = true;
  windFilter = ctx.createBiquadFilter();
  windFilter.type = "bandpass";
  windFilter.frequency.value = 480;
  windFilter.Q.value = 0.5;
  windLfoOsc = ctx.createOscillator();
  windLfoOsc.type = "sine";
  windLfoOsc.frequency.value = 0.06;
  windLfoGain = ctx.createGain();
  windLfoGain.gain.value = 220;
  windLfoOsc.connect(windLfoGain).connect(windFilter.frequency);
  windLfoOsc.start();
  wind.connect(windFilter).connect(ambientGain);
  wind.start();
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
  bp.frequency.value = 2200 + Math.random() * 3200;
  bp.Q.value = 9;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.001, time);
  g.gain.exponentialRampToValueAtTime(0.85, time + 0.003);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
  noise.connect(bp).connect(g).connect(percGain);
  noise.start(time);
  noise.stop(time + 0.12);
}

// The driving, relentless two-note figure — root and a minor 2nd above it,
// alternating every beat — that carries the "stalker theme" identity. A
// detuned square wave through a resonant low-pass gives it a harder, more
// mechanical edge than a soft triangle arpeggio would.
let ostinatoStep = 0;
function playOstinatoNote(time) {
  const semi = ostinatoStep % 2 === 0 ? 0 : MINOR2;
  ostinatoStep++;
  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.value = noteFreq(semi, 1);
  osc.detune.value = (Math.random() - 0.5) * 6;
  const filt = ctx.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.value = 1400;
  filt.Q.value = 1.2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.001, time);
  g.gain.exponentialRampToValueAtTime(0.5, time + 0.008);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
  osc.connect(filt).connect(g).connect(ostinatoGain);
  osc.start(time);
  osc.stop(time + 0.24);
}

// A rare, sudden dissonant hit — a tritone dyad plus a burst of noise —
// for the odd unpredictable "sting" a slasher score throws in. Deliberately
// infrequent: this is seasoning, not a rhythmic element.
function playSting(time) {
  [0, TRITONE].forEach((semi) => {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = noteFreq(semi, 1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, time);
    g.gain.exponentialRampToValueAtTime(0.4, time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.9);
    osc.connect(g).connect(stingGain);
    osc.start(time);
    osc.stop(time + 1);
  });
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer(ctx, 0.3);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2200 + Math.random() * 3200;
  bp.Q.value = 9;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.001, time);
  g.gain.exponentialRampToValueAtTime(0.6, time + 0.003);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
  noise.connect(bp).connect(g).connect(stingGain);
  noise.start(time);
  noise.stop(time + 0.12);
}

function scheduler() {
  if (!built || !ctx) return;
  const cfg = STATES[currentState] || STATES.calm;
  while (nextBeatTime < ctx.currentTime + 0.12) {
    // Nudge tempo gradually toward its target instead of snapping, so a
    // state change accelerates/decelerates rather than jump-cutting.
    currentTempo += (targetTempo - currentTempo) * 0.12;
    const beatDur = 60 / Math.max(40, currentTempo);

    if (cfg.pulse > 0.03) {
      playPulse(nextBeatTime);
    }
    if (cfg.heartbeat > 0.05 && beatCount % 2 === 0) {
      playHeartbeat(nextBeatTime);
    }
    if (cfg.perc > 0.03 && Math.random() < cfg.perc) {
      playPerc(nextBeatTime + beatDur * 0.5);
    }
    if (cfg.ostinato > 0.03) {
      playOstinatoNote(nextBeatTime);
    }
    if (cfg.sting > 0 && Math.random() < cfg.sting) {
      playSting(nextBeatTime);
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
  rampTo(clusterGain, cfg.cluster, dur);
  rampTo(pulseGain, cfg.pulse, dur);
  rampTo(heartbeatGain, cfg.heartbeat, dur);
  rampTo(percGain, cfg.perc, dur);
  rampTo(ostinatoGain, cfg.ostinato, dur);
  rampTo(ambientGain, cfg.ambient, dur);
  rampTo(stateMasterGain, cfg.master, dur);
  if (immediate) currentTempo = cfg.tempo;
}

export function getMusicState() {
  return currentState;
}

export const MUSIC_STATES = Object.keys(STATES);
