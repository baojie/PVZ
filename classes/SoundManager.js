/**
 * SoundManager - Procedural audio using Web Audio API
 * No external files needed - all sounds generated programmatically
 */
export class SoundManager {
    constructor() {
        this.ctx = null;
        this.bgmGain = null;
        this.sfxGain = null;
        this.masterGain = null;
        this.bgmPlaying = false;
        this.bgmNodes = [];
        this.muted = false;
    }

    init() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 1;
        this.masterGain.connect(this.ctx.destination);
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = 0.3;
        this.bgmGain.connect(this.masterGain);
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.5;
        this.sfxGain.connect(this.masterGain);
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : 1;
        }
    }

    ensure() {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    // --- Sound Effects ---

    playShoot() {
        this.ensure();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    playIceShoot() {
        this.ensure();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.12);
    }

    playExplosion() {
        this.ensure();
        // Noise burst for explosion
        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.3);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        source.start();
    }

    playCollectSun() {
        this.ensure();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, this.ctx.currentTime);
        osc.frequency.setValueAtTime(659, this.ctx.currentTime + 0.06);
        osc.frequency.setValueAtTime(784, this.ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    playPlant() {
        this.ensure();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(500, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    playZombieDie() {
        this.ensure();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    playLawnmower() {
        this.ensure();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(150, this.ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 1.0);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 1.0);
    }

    playGameOver() {
        this.ensure();
        this.stopBGM();
        const notes = [392, 349, 330, 262];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.25, this.ctx.currentTime + i * 0.3);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.3 + 0.3);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(this.ctx.currentTime + i * 0.3);
            osc.stop(this.ctx.currentTime + i * 0.3 + 0.35);
        });
    }

    playVictory() {
        this.ensure();
        this.stopBGM();
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.25, this.ctx.currentTime + i * 0.2);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.2 + 0.3);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(this.ctx.currentTime + i * 0.2);
            osc.stop(this.ctx.currentTime + i * 0.2 + 0.35);
        });
    }

    // --- Background Music (simple looping melody) ---

    startBGM() {
        this.ensure();
        if (this.bgmPlaying) return;
        this.bgmPlaying = true;
        this._playBGMLoop();
    }

    _playBGMLoop() {
        if (!this.bgmPlaying) return;

        // Grasswalk-inspired melody (PvZ day theme approximation)
        // Key of F major, upbeat and cheerful
        const bpm = 140;
        const beat = 60 / bpm;
        const eighth = beat / 2;

        // Melody notes: [frequency, duration in eighths]
        // Approximation of Grasswalk main riff
        const melody = [
            [349, 1], [440, 1], [523, 1], [440, 1],  // F A C A
            [349, 1], [523, 1], [440, 2],              // F C A-
            [349, 1], [440, 1], [523, 1], [587, 1],    // F A C D
            [523, 1], [440, 1], [349, 2],              // C A F-
            [294, 1], [349, 1], [440, 1], [349, 1],    // D F A F
            [294, 1], [440, 1], [349, 2],              // D A F-
            [262, 1], [294, 1], [349, 1], [440, 1],    // C D F A
            [349, 1], [294, 1], [262, 2],              // F D C-
        ];

        // Bass line
        const bassLine = [
            [175, 4], [175, 4],  // F bass
            [175, 4], [175, 4],  // F bass
            [147, 4], [147, 4],  // D bass
            [131, 4], [131, 4],  // C bass
        ];

        let melodyTime = 0;
        melody.forEach(([freq, dur]) => {
            const startTime = this.ctx.currentTime + melodyTime * eighth;
            const noteLen = dur * eighth;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.1, startTime);
            gain.gain.setValueAtTime(0.08, startTime + noteLen * 0.5);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteLen * 0.95);
            osc.connect(gain);
            gain.connect(this.bgmGain);
            osc.start(startTime);
            osc.stop(startTime + noteLen);
            this.bgmNodes.push(osc);
            melodyTime += dur;
        });

        let bassTime = 0;
        bassLine.forEach(([freq, dur]) => {
            const startTime = this.ctx.currentTime + bassTime * eighth;
            const noteLen = dur * eighth;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.07, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteLen * 0.9);
            osc.connect(gain);
            gain.connect(this.bgmGain);
            osc.start(startTime);
            osc.stop(startTime + noteLen);
            this.bgmNodes.push(osc);
            bassTime += dur;
        });

        const loopLen = melodyTime * eighth * 1000;

        // Schedule next loop
        this._bgmTimeout = setTimeout(() => {
            this.bgmNodes = [];
            this._playBGMLoop();
        }, loopLen);
    }

    stopBGM() {
        this.bgmPlaying = false;
        clearTimeout(this._bgmTimeout);
        this.bgmNodes.forEach(n => {
            try { n.stop(); } catch (e) { /* already stopped */ }
        });
        this.bgmNodes = [];
    }
}
