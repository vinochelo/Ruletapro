export const playTone = (freq: number = 440, type: OscillatorType = 'sine', duration: number = 0.1) => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;

  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + duration);
};

export const playTick = () => playTone(800, 'square', 0.05);
export const playWheelClick = () => playTone(300, 'triangle', 0.05); // Deeper click for wheel
export const playAlert = () => playTone(600, 'sine', 0.3);
export const playSuccess = () => {
  playTone(400, 'sine', 0.1);
  setTimeout(() => playTone(600, 'sine', 0.1), 100);
  setTimeout(() => playTone(800, 'sine', 0.2), 200);
};