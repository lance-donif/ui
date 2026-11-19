export type AudioScene = 'lobby' | 'quilt' | 'toy-repair' | 'pond';

type Note = [step: number, midi: number, length: number];
type Pulse = [step: number, chordTone: number, length: number, strength: number];
type Bar = {
  bass: number;
  chord: number[];
  melody: Note[];
};
type Instrument = keyof typeof instruments;
type Score = {
  bpm: number;
  gain: number;
  width: number;
  lead: Instrument;
  harmony: Instrument;
  bassVoice: Instrument;
  bassPattern: Pulse[];
  accompaniment: Pulse[];
  bars: Bar[];
};

const instruments = {
  celesta: { harmonics: [1, 0.32, 0.06, 0.29], attack: 0.007, decay: 0.20, sustain: 0.20, release: 0.18 },
  felt: { harmonics: [1, 0.36, 0.18, 0.07], attack: 0.012, decay: 0.22, sustain: 0.30, release: 0.12 },
  strings: { harmonics: [1, 0.18, 0.10, 0.03], attack: 0.08, decay: 0.27, sustain: 0.67, release: 0.21 },
  pluck: { harmonics: [1, 0.5, 0.43, 0.14], attack: 0.006, decay: 0.14, sustain: 0.19, release: 0.08 },
  mallet: { harmonics: [1, 0.14, 0.06, 0.45, 0.08], attack: 0.004, decay: 0.13, sustain: 0.14, release: 0.10 },
  flute: { harmonics: [1, 0.16, 0.06], attack: 0.07, decay: 0.19, sustain: 0.78, release: 0.19 },
  harp: { harmonics: [1, 0.42, 0.13, 0.20, 0.06], attack: 0.012, decay: 0.30, sustain: 0.20, release: 0.22 },
  bass: { harmonics: [1, 0.32, 0.12], attack: 0.016, decay: 0.17, sustain: 0.47, release: 0.10 },
};

const scores: Record<AudioScene, Score> = {
  lobby: {
    bpm: 104, gain: 1.04, width: 8, lead: 'celesta', harmony: 'felt', bassVoice: 'bass',
    bassPattern: [[0, 0, 2.4, 1], [4, 7, 1.4, 0.72]],
    accompaniment: [[1, 0, 1.5, 0.80], [1, 1, 1.5, 0.63], [3, 2, 0.8, 0.66], [5, 1, 1.5, 0.82], [5, 2, 1.5, 0.76]],
    bars: [
      { bass: 48, chord: [60, 64, 67], melody: [[0, 67, 1.5], [2, 72, 0.8], [3, 76, 2.3], [6, 74, 0.9]] },
      { bass: 45, chord: [60, 64, 69], melody: [[0, 72, 2.8], [4, 69, 1.5], [6, 67, 0.7]] },
      { bass: 41, chord: [60, 65, 69], melody: [[1, 69, 0.9], [2, 72, 1.6], [4, 77, 2.3]] },
      { bass: 43, chord: [59, 62, 67], melody: [[0, 74, 2], [3, 71, 1.5], [6, 67, 1.3]] },
      { bass: 48, chord: [60, 64, 67], melody: [[0, 67, 1.5], [2, 72, 0.8], [3, 76, 1.5], [5, 79, 2]] },
      { bass: 40, chord: [59, 64, 67], melody: [[0, 76, 2], [3, 74, 0.7], [4, 71, 2.2]] },
      { bass: 41, chord: [60, 65, 69], melody: [[0, 69, 1.6], [2, 72, 1.5], [5, 77, 0.8], [6, 76, 1.3]] },
      { bass: 43, chord: [59, 62, 67], melody: [[0, 74, 2.5], [4, 71, 1.6], [7, 62, 0.65]] },
    ],
  },
  quilt: {
    bpm: 91, gain: 0.98, width: 6, lead: 'felt', harmony: 'strings', bassVoice: 'harp',
    bassPattern: [[0, 0, 2.1, 1]],
    accompaniment: [[2, 0, 1.25, 0.70], [2, 1, 1.25, 0.62], [4, 1, 1.05, 0.61], [4, 2, 1.05, 0.70]],
    bars: [
      { bass: 50, chord: [62, 66, 69], melody: [[0, 66, 1.6], [2, 69, 1.6], [4, 73, 1.6]] },
      { bass: 47, chord: [62, 66, 71], melody: [[0, 74, 2.7], [3, 73, 0.8], [4, 71, 1.4]] },
      { bass: 43, chord: [62, 67, 71], melody: [[0, 67, 2.7], [4, 71, 1.5]] },
      { bass: 45, chord: [61, 64, 69], melody: [[0, 69, 3.6], [5, 64, 0.7]] },
      { bass: 50, chord: [62, 66, 69], melody: [[0, 66, 1.5], [2, 69, 1.6], [4, 74, 1.5]] },
      { bass: 46, chord: [62, 65, 70], melody: [[0, 77, 2.5], [3, 74, 0.8], [4, 70, 1.5]] },
      { bass: 45, chord: [61, 64, 69], melody: [[0, 69, 1.5], [2, 64, 1.6], [4, 61, 1.5]] },
      { bass: 50, chord: [62, 66, 69], melody: [[0, 62, 3.4]] },
    ],
  },
  'toy-repair': {
    bpm: 112, gain: 1.30, width: 8, lead: 'mallet', harmony: 'pluck', bassVoice: 'bass',
    bassPattern: [[0, 0, 1.2, 1], [3, 7, 0.6, 0.67], [5, 12, 1.0, 0.66]],
    accompaniment: [[2, 0, 0.7, 0.92], [2, 2, 0.7, 0.73], [4, 1, 0.7, 0.66], [7, 2, 0.6, 0.68]],
    bars: [
      { bass: 43, chord: [59, 62, 67], melody: [[0, 71, 0.8], [2, 74, 0.7], [3, 76, 0.7], [5, 74, 1.4]] },
      { bass: 40, chord: [59, 64, 67], melody: [[0, 67, 1.3], [3, 71, 0.7], [4, 74, 1.1], [7, 71, 0.6]] },
      { bass: 48, chord: [60, 64, 67], melody: [[0, 72, 1.5], [3, 76, 0.6], [5, 79, 1.2]] },
      { bass: 50, chord: [60, 66, 69], melody: [[0, 78, 0.75], [2, 74, 0.7], [4, 69, 1.4]] },
      { bass: 43, chord: [59, 62, 67], melody: [[0, 71, 0.8], [2, 74, 0.7], [3, 76, 0.7], [5, 79, 0.7], [6, 78, 0.7]] },
      { bass: 45, chord: [60, 64, 69], melody: [[0, 76, 1.3], [3, 72, 0.7], [5, 69, 0.9]] },
      { bass: 50, chord: [60, 66, 69], melody: [[1, 69, 0.8], [2, 72, 0.7], [4, 74, 1.4], [7, 66, 0.65]] },
      { bass: 43, chord: [59, 62, 67], melody: [[0, 67, 2.3], [4, 62, 0.8]] },
    ],
  },
  pond: {
    bpm: 75, gain: 0.65, width: 8, lead: 'flute', harmony: 'harp', bassVoice: 'strings',
    bassPattern: [[0, 0, 4.2, 0.76]],
    accompaniment: [[0, 0, 1.6, 0.78], [2, 1, 1.4, 0.70], [3, 2, 1.3, 0.67], [6, 1, 1.4, 0.58]],
    bars: [
      { bass: 41, chord: [60, 65, 69], melody: [[1, 72, 2.3], [4, 69, 2.7]] },
      { bass: 46, chord: [62, 65, 70], melody: [[0, 65, 2.4], [4, 67, 1.5], [6, 69, 1.5]] },
      { bass: 43, chord: [62, 67, 70], melody: [[0, 74, 3.3], [5, 72, 1.6]] },
      { bass: 48, chord: [60, 65, 67], melody: [[0, 67, 3.4]] },
      { bass: 41, chord: [60, 65, 69], melody: [[1, 72, 2.2], [4, 77, 2.7]] },
      { bass: 50, chord: [62, 65, 69], melody: [[0, 74, 2.3], [4, 72, 1.4], [6, 69, 1.2]] },
      { bass: 46, chord: [62, 65, 70], melody: [[0, 67, 2.4], [4, 65, 2.5]] },
      { bass: 48, chord: [60, 64, 67], melody: [[0, 67, 2.5], [4, 64, 1.5]] },
    ],
  },
};

const timbres = new WeakMap<BaseAudioContext, Map<Instrument, PeriodicWave>>();
const phraseDynamics = [0.91, 0.95, 1, 0.87, 1.04, 1, 0.96, 0.85];

function waveform(ctx: BaseAudioContext, voice: Instrument) {
  let waves = timbres.get(ctx);
  if (!waves) {
    waves = new Map();
    timbres.set(ctx, waves);
  }
  let wave = waves.get(voice);
  if (!wave) {
    const partials = instruments[voice].harmonics;
    const total = partials.reduce((sum, partial) => sum + partial, 0);
    const imaginary = Float32Array.from([0, ...partials.map(partial => partial / total)]);
    wave = ctx.createPeriodicWave(new Float32Array(imaginary.length), imaginary, { disableNormalization: true });
    waves.set(voice, wave);
  }
  return wave;
}

function playNote(ctx: BaseAudioContext, output: AudioNode, voice: Instrument, midi: number, when: number, length: number, level: number) {
  const shape = instruments[voice];
  const oscillator = ctx.createOscillator();
  const volume = ctx.createGain();
  const attackEnd = when + Math.min(length * 0.3, shape.attack);
  const releaseStart = when + length;
  const decayEnd = Math.min(releaseStart, attackEnd + shape.decay);
  const releaseEnd = releaseStart + shape.release;
  oscillator.setPeriodicWave(waveform(ctx, voice));
  oscillator.frequency.setValueAtTime(440 * 2 ** ((midi - 69) / 12), when);
  volume.gain.setValueAtTime(0, when);
  volume.gain.linearRampToValueAtTime(level, attackEnd);
  volume.gain.exponentialRampToValueAtTime(level * shape.sustain, decayEnd);
  volume.gain.setValueAtTime(level * shape.sustain, releaseStart);
  volume.gain.exponentialRampToValueAtTime(0.00003, releaseEnd);
  volume.gain.linearRampToValueAtTime(0, releaseEnd + 0.004);
  oscillator.connect(volume);
  volume.connect(output);
  oscillator.onended = () => {
    oscillator.disconnect();
    volume.disconnect();
  };
  oscillator.start(when);
  oscillator.stop(releaseEnd + 0.005);
}

export function scoreStepDuration(scene: AudioScene) {
  return 30 / scores[scene].bpm;
}

export function scoreStepCount(scene: AudioScene) {
  const score = scores[scene];
  return score.bars.length * score.width;
}

export function renderScoreStep(ctx: BaseAudioContext, output: AudioNode, scene: AudioScene, step: number, when: number) {
  const score = scores[scene];
  const index = step % scoreStepCount(scene);
  const barIndex = Math.floor(index / score.width);
  const beat = index % score.width;
  const bar = score.bars[barIndex];
  const duration = scoreStepDuration(scene);
  const strength = phraseDynamics[barIndex] * score.gain;

  for (const [onset, pitch, length] of bar.melody) {
    if (onset === beat) playNote(ctx, output, score.lead, pitch, when, length * duration, 0.24 * strength);
  }
  for (const [onset, degree, length, accent] of score.accompaniment) {
    if (onset === beat) playNote(ctx, output, score.harmony, bar.chord[degree], when, length * duration, 0.105 * strength * accent);
  }
  for (const [onset, semitones, length, accent] of score.bassPattern) {
    if (onset === beat) playNote(ctx, output, score.bassVoice, bar.bass + semitones, when, length * duration, 0.18 * strength * accent);
  }
}
