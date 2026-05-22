'use client';

// Synthesized howl sound using Web Audio API — no external file needed
export function playHowl() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    const howl = (startTime: number, freq1: number, freq2: number, duration: number, volume = 0.3) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const vibrato = ctx.createOscillator();
      const vibratoGain = ctx.createGain();

      // Vibrato (wolf-like tremolo)
      vibrato.frequency.value = 5;
      vibratoGain.gain.value = 8;
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq1, startTime);
      osc.frequency.linearRampToValueAtTime(freq2, startTime + duration * 0.4);
      osc.frequency.linearRampToValueAtTime(freq1 * 0.85, startTime + duration);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.08);
      gain.gain.setValueAtTime(volume, startTime + duration - 0.15);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      vibrato.start(startTime);
      osc.start(startTime);
      vibrato.stop(startTime + duration);
      osc.stop(startTime + duration);
    };

    const t = ctx.currentTime;
    howl(t,        280, 520, 0.9, 0.28); // first howl — rise
    howl(t + 0.95, 320, 580, 1.1, 0.32); // second howl — longer
    howl(t + 2.2,  260, 440, 0.7, 0.22); // fade out howl
  } catch {
    // AudioContext not supported — silent fallback
  }
}
