// A small generative horror score for VHS: Video Horror Story, aimed
// squarely at the Friday the 13th (2017) sound design: gameplay is mostly
// genuine outdoor-night ambience (wind, crickets) with almost no "music"
// at all while nothing is happening — dread comes from what you DON'T
// hear (the crickets going quiet) more than from a synth score. Actual
// musical material (drone/dissonant cluster/ostinato/pulse) is held in
// reserve and only earns its way in once the Killer is a real threat. The
// home screen is the one place this still plays like a full 80s slasher
// title theme.
//
// Everything is synthesized live with the Web Audio API (oscillators,
// filtered noise) — no audio files, so there's no "loop point" to seam-
// match. A shared convolution reverb send gives the whole mix some space/
// depth instead of sounding like bare dry oscillators.
//
// One persistent engine, not separate tracks swapped in and out — a
// handful of gain "layers" are mixed together, and changing MUSIC state
// just ramps each layer's target gain (and tempo) toward a new preset.
// Because it's a single engine, two tracks can never end up playing at once.

import { getAudioContext, getMusicBus, noiseBuffer } from "./sound";

const ROOT = 55; // A1 — a dark, low horror-synth key
const MINOR2 = 1;
const TRITONE = 6;
function noteFreq(semitone, octave = 0) {
  return ROOT * 2 ** ((semitone + octave * 12) / 12);
}

// "Brown" (red) noise — a leaky integration of white noise — is heavily
// weighted toward the low end and sounds like a soft, natural rumble/wind
// rather than a hiss, unlike raw white noise which reads as radio/TV
// static even after filtering.
function brownNoiseBuffer(c, seconds = 4) {
  const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.2;
  }
  return buf;
}

// A short, decaying-noise impulse response for a simple algorithmic
// reverb — gives every layer that routes through it some room/space
// instead of the flat, dry, slightly cheap quality raw oscillators have
// on their own. This is most of what separates "generated in a browser"
// from "sounds like it belongs in a movie".
function reverbImpulse(c, seconds = 2.2, decay = 3.2) {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay;
    }
  }
  return buf;
}

// Each state is a target mix (0..1 per layer) plus a target tempo (BPM-ish,
// drives the beat scheduler) and a rare "sting" probability. "master"
// scales the whole mix down for the "silence is scarier" hush state.
// "crickets" is inverted from everything else — present while it's safe,
// gone the moment it isn't, since real crickets going quiet is itself a
// horror-movie cue.
const STATES = {
  menu: { tempo: 116, drone: 0.4, cluster: 0.2, pulse: 0, heartbeat: 0, perc: 0.03, ostinato: 0.28, sting: 0, ambient: 0, crickets: 0, master: 1 },
  calm: { tempo: 80, drone: 0.05, cluster: 0, pulse: 0, heartbeat: 0, perc: 0, ostinato: 0, sting: 0.014, ambient: 0.16, crickets: 0.22, master: 1 },
  tension: { tempo: 92, drone: 0.14, cluster: 0.05, pulse: 0, heartbeat: 0, perc: 0.02, ostinato: 0, sting: 0.03, ambient: 0.18, crickets: 0.1, master: 1 },
  danger: { tempo: 112, drone: 0.3, cluster: 0.16, pulse: 0.2, heartbeat: 0.22, perc: 0.13, ostinato: 0.18, sting: 0.045, ambient: 0.1, crickets: 0, master: 1 },
  chase: { tempo: 164, drone: 0.32, cluster: 0.15, pulse: 0.4, heartbeat: 0.38, perc: 0.34, ostinato: 0.32, sting: 0.055, ambient: 0.05, crickets: 0, master: 1 },
  final: { tempo: 172, drone: 0.46, cluster: 0.28, pulse: 0.44, heartbeat: 0.42, perc: 0.38, ostinato: 0.34, sting: 0.065, ambient: 0.04, crickets: 0, master: 1 },
  // "The Killer is in the room and doesn't know you're here" — duck almost
  // everything so a lone heartbeat carries the moment, crickets included:
  // the world goes quiet because you're holding your breath.
  hush: { tempo: 96, drone: 0.04, cluster: 0, pulse: 0, heartbeat: 0.5, perc: 0, ostinato: 0, sting: 0, ambient: 0.07, crickets: 0, master: 0.4 },
};

let built = false;
let ctx = null;
let bus = null;

let droneGain, clusterGain, pulseGain, heartbeatGain, percGain, ostinatoGain, ambientGain, cricketsGain, stingGain, stateMasterGain;
let clusterFilter;
let lfoOsc, lfoGain;
let warbleOsc, warbleGain;
let reverbSend, reverbNode;

let currentState = "menu";
let currentTempo = STATES.menu.tempo;
let targetTempo = STATES.menu.tempo;

let schedulerId = null;
let nextBeatTime = 0;
let beatCount = 0;
let nextCricketTime = 0;

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

  // A shared reverb send — most layers feed it a little, giving the whole
  // mix some room/depth instead of sounding like dry oscillators typed
  // directly into a browser.
  reverbNode = ctx.createConvolver();
  reverbNode.buffer = reverbImpulse(ctx);
  const reverbReturn = ctx.createGain();
  reverbReturn.gain.value = 0.55;
  reverbNode.connect(reverbReturn).connect(stateMasterGain);
  reverbSend = ctx.createGain();
  reverbSend.gain.value = 1;
  reverbSend.connect(reverbNode);

  // A slow, subtle pitch wobble fanned out to every sustained oscillator's
  // detune — an analog tape-warble wow-and-flutter tying the score to the
  // game's VHS identity.
  warbleOsc = ctx.createOscillator();
  warbleOsc.type = "sine";
  warbleOsc.frequency.value = 0.18;
  warbleGain = ctx.createGain();
  warbleGain.gain.value = 3.5;
  warbleOsc.connect(warbleGain);
  warbleOsc.start();

  // --- Drone: root and tritone, an octave down, heavily detuned against
  // each other so they beat slowly and never quite settle. ---
  droneGain = ctx.createGain();
  droneGain.gain.value = 0;
  droneGain.connect(stateMasterGain);
  droneGain.connect(reverbSend);
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
  // slow LFO sweep — a sustained dissonant chord, not a pretty triad. ---
  clusterGain = ctx.createGain();
  clusterGain.gain.value = 0;
  clusterFilter = ctx.createBiquadFilter();
  clusterFilter.type = "lowpass";
  clusterFilter.frequency.value = 500;
  clusterFilter.Q.value = 0.7;
  clusterFilter.connect(clusterGain);
  clusterGain.connect(stateMasterGain);
  clusterGain.connect(reverbSend);
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
  // each hit is a short-lived node created fresh in the scheduler below.
  pulseGain = ctx.createGain();
  pulseGain.gain.value = 0;
  pulseGain.connect(stateMasterGain);

  heartbeatGain = ctx.createGain();
  heartbeatGain.gain.value = 0;
  heartbeatGain.connect(stateMasterGain);

  percGain = ctx.createGain();
  percGain.gain.value = 0;
  percGain.connect(stateMasterGain);
  percGain.connect(reverbSend);

  ostinatoGain = ctx.createGain();
  ostinatoGain.gain.value = 0;
  ostinatoGain.connect(stateMasterGain);
  ostinatoGain.connect(reverbSend);

  // Stings are a one-off event, always audible at a fixed level when they
  // fire (gated only by how *often* they fire, via cfg.sting) rather than
  // scaled down by the quiet percussion level Calm/Tension use — that's
  // what makes them land as a genuine jolt during a near-silent stretch.
  // Routed hard through reverb for a proper "orchestral hit" boom.
  stingGain = ctx.createGain();
  stingGain.gain.value = 1;
  stingGain.connect(stateMasterGain);
  stingGain.connect(reverbSend);

  // --- Ambient: a continuous, slowly-shifting low rumble — wind through
  // the trees — carrying most of Calm's atmosphere. Brown noise through
  // two cascaded low-pass stages so nothing above a soft, muffled rumble
  // gets through. ---
  ambientGain = ctx.createGain();
  ambientGain.gain.value = 0;
  ambientGain.connect(stateMasterGain);
  const wind = ctx.createBufferSource();
  wind.buffer = brownNoiseBuffer(ctx, 6);
  wind.loop = true;
  const windFilter = ctx.createBiquadFilter();
  windFilter.type = "lowpass";
  windFilter.frequency.value = 260;
  windFilter.Q.value = 0.3;
  const windFilter2 = ctx.createBiquadFilter();
  windFilter2.type = "lowpass";
  windFilter2.frequency.value = 340;
  windFilter2.Q.value = 0.3;
  const windLfoOsc = ctx.createOscillator();
  windLfoOsc.type = "sine";
  windLfoOsc.frequency.value = 0.05;
  const windLfoGain = ctx.createGain();
  windLfoGain.gain.value = 110;
  windLfoOsc.connect(windLfoGain).connect(windFilter.frequency);
  windLfoOsc.start();
  wind.connect(windFilter).connect(windFilter2).connect(ambientGain);
  wind.start();

  // --- Crickets: the single biggest "outdoor at night" identifier, and —
  // critically — an instantly-readable horror cue when they suddenly
  // aren't there anymore. Short high, narrow-band chirps, randomly timed,
  // scheduled in the beat loop below rather than as a continuous layer. ---
  cricketsGain = ctx.createGain();
  cricketsGain.gain.value = 0;
  cricketsGain.connect(stateMasterGain);
  cricketsGain.connect(reverbSend);
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

// A single cricket chirp — 2-3 quick pulses at a narrow high frequency.
// Randomized pitch/spacing per chirp so a run of them never sounds like a
// mechanical loop.
function playCricket(time) {
  const freq = 3800 + Math.random() * 1400;
  const pulses = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < pulses; i++) {
    const t = time + i * 0.045;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = freq;
    bp.Q.value = 18;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc.connect(bp).connect(g).connect(cricketsGain);
    osc.start(t);
    osc.stop(t + 0.04);
  }
}

// The driving, relentless two-note figure — root and a minor 2nd above it,
// alternating every beat. A detuned square wave through a resonant
// low-pass gives it a harder, more mechanical edge than a soft triangle
// arpeggio would.
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

  // Crickets run on their own irregular clock, not the beat grid — real
  // ones don't chirp in time. Only scheduled at all while cfg.crickets is
  // meaningfully above zero, so they vanish immediately (not just fade)
  // the moment a state with crickets: 0 takes over.
  if (cfg.crickets > 0.03) {
    if (nextCricketTime < ctx.currentTime) nextCricketTime = ctx.currentTime + 0.2;
    while (nextCricketTime < ctx.currentTime + 0.5) {
      if (Math.random() < cfg.crickets) playCricket(nextCricketTime);
      nextCricketTime += 0.35 + Math.random() * 0.9;
    }
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
  rampTo(cricketsGain, cfg.crickets, dur);
  rampTo(stateMasterGain, cfg.master, dur);
  if (immediate) currentTempo = cfg.tempo;
}

export function getMusicState() {
  return currentState;
}

export const MUSIC_STATES = Object.keys(STATES);
