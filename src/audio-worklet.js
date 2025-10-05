/**
 * AudioWorklet processor for ZX Spectrum beeper
 * Runs in separate audio thread for better performance
 */
class BeeperProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.targetBufferSize = 512; // Target buffer size for low latency (~12ms)
    this.maxBufferSize = 1024; // Maximum buffer size to prevent memory issues
    this.lastValue = 0; // Keep last value to prevent clicks

    this.port.onmessage = (e) => {
      const { type, value, count } = e.data;

      if (type === 'sample') {
        // Drop samples if buffer is too full to prevent latency buildup
        if (this.buffer.length > this.maxBufferSize) {
          // Clear excess buffer to resync
          this.buffer.length = Math.floor(this.targetBufferSize / 2);
        }

        // Add samples to buffer
        for (let i = 0; i < count && this.buffer.length < this.maxBufferSize; i++) {
          this.buffer.push(value);
        }
      } else if (type === 'reset') {
        this.buffer = [];
        this.lastValue = 0;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const channel = output[0];

    for (let i = 0; i < channel.length; i++) {
      if (this.buffer.length > 0) {
        this.lastValue = this.buffer.shift();
        channel[i] = this.lastValue;
      } else {
        // Keep last value when buffer is empty to prevent clicks
        channel[i] = this.lastValue;
      }
    }

    return true;
  }
}

registerProcessor('beeper-processor', BeeperProcessor);
