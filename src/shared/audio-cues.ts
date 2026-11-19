export type AudioCue =
  | "select" | "slide" | "pin" | "stitch" | "undo" | "badge" | "finish"
  | "hop" | "crack" | "flower" | "unlock" | "fail"
  | "grab" | "snip" | "screw" | "gear" | "tool" | "bearPull" | "wind"
  | "musicTwo" | "musicThree";

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

function noiseBuffer(ctx: BaseAudioContext) {
  const cached = noiseBuffers.get(ctx);
  if (cached) return cached;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .7), ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.random() * 2 - 1;
    samples[i] = .72 * sample + .28 * last;
    last = sample;
  }
  noiseBuffers.set(ctx, buffer);
  return buffer;
}

function voice(ctx: BaseAudioContext, out: AudioNode, when: number, duration: number, volume: number, attack: number) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(volume, when + attack);
  gain.gain.exponentialRampToValueAtTime(.00012, when + duration);
  gain.gain.linearRampToValueAtTime(0, when + duration + .006);
  gain.connect(out);
  return gain;
}

function tone(ctx: BaseAudioContext, out: AudioNode, when: number, hz: number, duration: number,
  strength: number, type: OscillatorType = "sine", end = hz, attack = .006) {
  const source = ctx.createOscillator();
  const gain = voice(ctx, out, when, duration, strength, attack);
  source.type = type;
  source.frequency.setValueAtTime(hz, when);
  if (end !== hz) source.frequency.exponentialRampToValueAtTime(end, when + duration * .75);
  source.connect(gain);
  source.onended = () => { source.disconnect(); gain.disconnect(); };
  source.start(when);
  source.stop(when + duration + .009);
}

function brush(ctx: BaseAudioContext, out: AudioNode, when: number, from: number, to: number,
  duration: number, strength: number, resonance = 1, attack = .004) {
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = voice(ctx, out, when, duration, strength, attack);
  source.buffer = noiseBuffer(ctx);
  filter.type = "bandpass";
  filter.Q.value = resonance;
  filter.frequency.setValueAtTime(from, when);
  filter.frequency.exponentialRampToValueAtTime(to, when + duration * .8);
  source.connect(filter);
  filter.connect(gain);
  source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  source.start(when);
  source.stop(when + duration + .009);
}

export function renderCue(ctx: BaseAudioContext, out: AudioNode, cue: AudioCue, when: number) {
  function pluck(hz: number, offset = 0, strength = .15, duration = .18) {
    tone(ctx, out, when + offset, hz, duration, strength);
    tone(ctx, out, when + offset, hz * 2.015, duration * .38, strength * .29);
  }

  switch (cue) {
    case "musicTwo":
    case "musicThree":
      (cue === "musicTwo" ? [523, 659] : [523, 659, 784]).forEach((hz, i) => {
        tone(ctx, out, when + i * .17, hz, .156, .25, "sine", hz, .008);
        tone(ctx, out, when + i * .17, hz * 2, .074, .036);
      });
      break;
    case "select":
      pluck(490, 0, .12, .095);
      break;
    case "slide":
      brush(ctx, out, when, 1750, 690, .19, .34, .72, .025);
      tone(ctx, out, when + .12, 195, .07, .095, "triangle", 155);
      break;
    case "pin":
      pluck(1318, 0, .12, .13);
      brush(ctx, out, when, 4600, 2150, .029, .17);
      break;
    case "stitch":
      brush(ctx, out, when, 1800, 3200, .09, .36, 1.2, .014);
      brush(ctx, out, when + .075, 1410, 630, .08, .27);
      pluck(680, .1, .085, .075);
      break;
    case "undo":
      pluck(622, 0, .12, .12); pluck(415, .072, .13, .17);
      break;
    case "badge":
    case "finish": {
      const notes = cue === "badge" ? [659, 880, 1109] : [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((hz, i) => pluck(hz, i * .079, .14, i === notes.length - 1 ? .38 : .20));
      break;
    }
    case "hop":
      tone(ctx, out, when, 260, .14, .17, "sine", 525);
      tone(ctx, out, when + .085, 360, .105, .12, "sine", 165);
      brush(ctx, out, when + .11, 1250, 540, .085, .22);
      break;
    case "crack":
      brush(ctx, out, when, 3450, 950, .068, .55, .65);
      brush(ctx, out, when + .043, 2550, 610, .065, .36);
      tone(ctx, out, when + .07, 175, .14, .16, "triangle", 83);
      break;
    case "flower":
      [698.46, 880, 1046.5].forEach((hz, i) => pluck(hz, i * .087, .13, .32));
      break;
    case "unlock":
      brush(ctx, out, when, 2500, 560, .047, .43);
      tone(ctx, out, when + .027, 217, .10, .13, "triangle", 163);
      pluck(587, .09); pluck(880, .15, .12, .22);
      break;
    case "fail":
      tone(ctx, out, when, 278, .16, .13, "triangle", 250);
      tone(ctx, out, when + .13, 196, .25, .14, "sine", 178);
      break;
    case "grab":
      brush(ctx, out, when, 1200, 550, .068, .19);
      tone(ctx, out, when, 212, .09, .11, "triangle", 169);
      break;
    case "snip":
      brush(ctx, out, when, 5400, 2250, .047, .52, 1.3);
      tone(ctx, out, when + .012, 1480, .045, .095, "triangle", 970);
      brush(ctx, out, when + .034, 3200, 1600, .036, .28);
      break;
    case "screw":
    case "wind": {
      const count = cue === "wind" ? 6 : 3;
      for (let i = 0; i < count; i++) {
        const t = when + i * (cue === "wind" ? .04 : .056);
        brush(ctx, out, t, 2050 + i * 210, 1250, .032, .38, 1.35);
        tone(ctx, out, t, 421 + i * 15, .037, .09, "triangle", 330 + i * 19);
      }
      break;
    }
    case "gear":
      tone(ctx, out, when, 240, .115, .19, "triangle", 175);
      pluck(742, .014, .13, .19);
      brush(ctx, out, when + .038, 1960, 930, .055, .28);
      break;
    case "tool":
      pluck(1040, 0, .12, .14); pluck(1517, .01, .07, .115);
      brush(ctx, out, when, 2200, 1680, .045, .20);
      break;
    case "bearPull":
      brush(ctx, out, when, 360, 1150, .22, .54, 1.2, .04);
      tone(ctx, out, when + .06, 185, .12, .09, "triangle", 345);
      brush(ctx, out, when + .19, 1560, 530, .11, .26);
      break;
  }
}
