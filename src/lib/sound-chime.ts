/**
 * Web Audio API native chime synthesizer
 * Generates a clean, pleasant double restaurant bell chime without external audio files.
 */
class KitchenChimeManager {
  private audioCtx: AudioContext | null = null;
  private isUnlocked = false;

  public unlock(): boolean {
    try {
      if (!this.audioCtx) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === "suspended") {
        void this.audioCtx.resume();
      }
      this.isUnlocked = true;
      return true;
    } catch {
      return false;
    }
  }

  public isAudioActive(): boolean {
    return this.isUnlocked && this.audioCtx !== null;
  }

  public playNewOrderChime(): void {
    if (!this.unlock() || !this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // First note (High Ding - 880Hz / A5)
    this.playTone(ctx, 880, now, 0.45);

    // Second note (Harmonic Chime - 1174Hz / D6)
    this.playTone(ctx, 1174.66, now + 0.12, 0.7);
  }

  private playTone(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, startTime);

    // Gentle metallic harmonics
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }
}

export const chimeManager = new KitchenChimeManager();
