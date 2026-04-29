export const playTone = (freq: number = 440, type: OscillatorType = 'sine', duration: number = 0.1, vol: number = 0.8) => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;

  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + duration);
};

export const playTick = () => playTone(800, 'square', 0.05, 0.4);
export const playWheelClick = () => playTone(600, 'square', 0.03, 0.3);
export const playAlert = () => playTone(600, 'sine', 0.3, 0.9);
export const playSuccess = () => {
  playTone(400, 'sine', 0.1, 0.8);
  setTimeout(() => playTone(600, 'sine', 0.1, 0.8), 100);
  setTimeout(() => playTone(800, 'sine', 0.2, 0.8), 200);
};
export const playStart = () => {
  playTone(440, 'sine', 0.2, 1.0);
  setTimeout(() => playTone(880, 'sine', 0.4, 1.0), 200);
};