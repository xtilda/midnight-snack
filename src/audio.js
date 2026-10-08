let context = null,
  muted = false,
  lastCrumb = -1;

export function initAudio() {
  if (muted) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    context ??= new AudioContextClass();
    if (context.state === 'suspended') context.resume().catch(() => {});
  } catch {
    context = null
  }
}

export function setMuted(value) {
  muted = value;
  return muted
}

function tone(frequency, duration, type = 'sine', volume = .07, delay = 0) {
  if (muted || !context || context.state !== 'running') return;
  const at = context.currentTime + delay;
  const oscillator = context.createOscillator(),
    gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, at);
  gain.gain.setValueAtTime(.001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + .015);
  gain.gain.exponentialRampToValueAtTime(.001, at + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(at);
  oscillator.stop(at + duration + .02);
}

export function playSound(name) {
  if (muted || !context) return;
  if (name === 'crumb') {
    if (context.currentTime - lastCrumb < .09) return;
    lastCrumb = context.currentTime;
    tone(420, .055, 'sine', .025);
  } else if (name === 'snack') {
    tone(550, .11, 'triangle');
    tone(825, .14, 'triangle', .06, .08);
  } else if (name === 'sauce') {
    tone(300, .12, 'sawtooth', .045);
    tone(460, .16, 'triangle', .07, .10);
    tone(700, .19, 'triangle', .06, .21);
  } else if (name === 'eat') {
    tone(480, .10, 'square', .035);
    tone(720, .14, 'square', .035, .10);
  } else if (name === 'hurt') {
    tone(230, .16, 'triangle', .08);
    tone(150, .23, 'triangle', .07, .13);
  } else if (name === 'win') {
    [392, 523, 659, 784].forEach((note, i) => tone(note, .22, 'triangle', .07, i * .12));
  } else if (name === 'lose') {
    [330, 247, 196].forEach((note, i) => tone(note, .23, 'triangle', .07, i * .15));
  }
}
