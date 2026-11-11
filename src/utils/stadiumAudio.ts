/**
 * Stadium Audio Synthesizer (Web Audio API)
 * Provides authentic, zero-dependency procedural stadium sounds for match gameplay:
 * - Referee Whistle
 * - Ball Kick / Pass Thump
 * - Goalkeeper Glove Save
 * - Post / Crossbar Ping
 * - Stadium Crowd Roar / Goal Cheer
 */

class StadiumAudioEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    // Check localStorage preference
    try {
      const saved = localStorage.getItem('match_stadium_audio_muted');
      if (saved !== null) {
        this.muted = saved === 'true';
      }
    } catch {
      this.muted = false;
    }
  }

  private lastPlayed: Record<string, number> = {};

  /** Returns a running AudioContext, or null when sound should be skipped.
   *  IMPORTANT: one shared context is reused forever. The old code created a brand-new
   *  AudioContext every time the previous one was "suspended" (WebView / background / no gesture),
   *  which leaked contexts and audio threads and froze the app after a few matches. */
  private initCtx(): AudioContext | null {
    if (this.muted) return null;
    if (typeof document !== 'undefined' && document.hidden) return null;
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtxClass) return null;
        this.ctx = new AudioCtxClass();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch {
      return null;
    }
    // Do not queue nodes on a suspended context: they would all fire at once when it resumes
    return this.ctx && this.ctx.state === 'running' ? this.ctx : null;
  }

  /** Drops sounds that are triggered too quickly after the same sound (e.g. skipping matches). */
  private throttled(key: string, minGapMs: number): boolean {
    const now = Date.now();
    if (now - (this.lastPlayed[key] || 0) < minGapMs) return true;
    this.lastPlayed[key] = now;
    return false;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem('match_stadium_audio_muted', String(this.muted));
    } catch {}
    return this.muted;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem('match_stadium_audio_muted', String(this.muted));
    } catch {}
  }

  /**
   * Realistic Fox 40 referee whistle (two high frequencies beating together)
   */
  public playWhistle() {
    if (this.throttled('whistle', 700)) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(2800, now);
      osc2.frequency.setValueAtTime(3100, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.03);
      gain.gain.setValueAtTime(0.2, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.42);
      osc2.stop(now + 0.42);
    } catch {}
  }

  /**
   * Heavy ball kick / strike sound (deep sine pitch drop)
   */
  public playKick(isPowerShot: boolean = false) {
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const startFreq = isPowerShot ? 160 : 120;
      const endFreq = 38;
      const duration = isPowerShot ? 0.18 : 0.12;

      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

      gain.gain.setValueAtTime(isPowerShot ? 0.45 : 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch {}
  }

  /**
   * Goalkeeper glove deflection / save
   */
  public playSave() {
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch {}
  }

  /**
   * Post or crossbar metallic ding
   */
  public playPostHit() {
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(840, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.35);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch {}
  }

  /**
   * Massive stadium crowd goal roar & celebration
   */
  public playGoalRoar() {
    if (this.throttled('roar', 2500)) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 2.2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Generate pink/white noise for crowd roar
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // Bandpass filter to sound like human voices
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(550, now);
      filter.frequency.linearRampToValueAtTime(750, now + 0.6);
      filter.frequency.linearRampToValueAtTime(450, now + 2.0);
      filter.Q.setValueAtTime(1.2, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.45, now + 0.25);
      gain.gain.setValueAtTime(0.4, now + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 2.25);
    } catch {}
  }
}

export const stadiumAudio = new StadiumAudioEngine();
