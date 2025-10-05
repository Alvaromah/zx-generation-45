/**
 * ZX Spectrum sound system
 * 1-bit beeper emulation using Web Audio API
 */
export class Sound {
  constructor(useAudioWorklet = true) {
    this.audioContext = null;
    this.useAudioWorklet = useAudioWorklet;
    this.workletNode = null;
    this.oscillatorNode = null;
    this.gainNode = null;
    this.sampleRate = 44100;
    this.buffer = [];
    this.maxBufferSize = 1024; // Maximum buffer size
    this.targetBufferSize = 512; // Target buffer size
    this.lastState = false;
    this.lastValue = 0; // Keep last value to prevent clicks
    this.volume = 0.5;
    this.muted = false;
    this.initialized = false;
  }

  /**
   * Initialize audio system
   */
  async init() {
    if (this.initialized) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.sampleRate
      });

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.muted ? 0 : this.volume;
      this.gainNode.connect(this.audioContext.destination);

      if (this.useAudioWorklet && this.audioContext.audioWorklet) {
        try {
          await this.initAudioWorklet();
        } catch (e) {
          console.warn('AudioWorklet failed, falling back to ScriptProcessor:', e);
          this.initScriptProcessor();
        }
      } else {
        this.initScriptProcessor();
      }

      this.initialized = true;
    } catch (e) {
      console.error('Failed to initialize audio:', e);
    }
  }

  /**
   * Initialize AudioWorklet (preferred)
   */
  async initAudioWorklet() {
    await this.audioContext.audioWorklet.addModule('dist/audio-worklet.js');

    this.workletNode = new AudioWorkletNode(this.audioContext, 'beeper-processor', {
      outputChannelCount: [1]
    });

    this.workletNode.connect(this.gainNode);
  }

  /**
   * Initialize ScriptProcessor (fallback)
   */
  initScriptProcessor() {
    // Use deprecated ScriptProcessorNode as fallback
    const bufferSize = 2048;
    this.scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 0, 1);

    this.scriptProcessor.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0);

      // Drop samples if buffer is too full to prevent latency buildup
      if (this.buffer.length > this.maxBufferSize) {
        this.buffer.length = Math.floor(this.targetBufferSize / 2);
      }

      for (let i = 0; i < output.length; i++) {
        if (this.buffer.length > 0) {
          this.lastValue = this.buffer.shift();
          output[i] = this.lastValue;
        } else {
          // Keep last value when buffer is empty to prevent clicks
          output[i] = this.lastValue;
        }
      }
    };

    this.scriptProcessor.connect(this.gainNode);
  }

  /**
   * Update speaker state
   */
  updateSpeaker(state, tstates) {
    if (!this.initialized || !this.audioContext) return;

    // Calculate number of samples for this t-state period
    // ZX Spectrum runs at 3.5MHz, 69888 T-states per frame at 50Hz
    const clockSpeed = 3500000;
    const samplesPerTState = this.sampleRate / clockSpeed;
    const numSamples = Math.max(1, Math.floor(tstates * samplesPerTState));

    const value = state ? 0.5 : -0.5;

    if (this.workletNode) {
      // Send to AudioWorklet
      this.workletNode.port.postMessage({
        type: 'sample',
        value: value,
        count: numSamples
      });
    } else if (this.scriptProcessor) {
      // Add to buffer for ScriptProcessor
      for (let i = 0; i < numSamples; i++) {
        if (this.buffer.length < this.maxBufferSize) {
          this.buffer.push(value);
        }
      }
    }

    this.lastState = state;
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode && !this.muted) {
      this.gainNode.gain.value = this.volume;
    }
  }

  /**
   * Set muted state
   */
  setMuted(muted) {
    this.muted = muted;
    if (this.gainNode) {
      this.gainNode.gain.value = muted ? 0 : this.volume;
    }
  }

  /**
   * Resume audio context (needed for user interaction on some browsers)
   */
  async resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (e) {
        // Ignore errors - likely no user gesture yet
      }
    }
  }

  /**
   * Reset audio system
   */
  reset() {
    this.buffer = [];
    this.lastState = false;
    this.lastValue = 0;

    if (this.workletNode) {
      this.workletNode.port.postMessage({ type: 'reset' });
    }
  }

  /**
   * Destroy audio system
   */
  destroy() {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.initialized = false;
  }
}
