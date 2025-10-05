/**
 * Jest setup file
 */

// Mock Web Audio API
global.AudioContext = class {
  constructor() {
    this.state = 'running';
    this.sampleRate = 44100;
    this.destination = {};
    this.audioWorklet = null;
  }

  createGain() {
    return {
      gain: { value: 0.5 },
      connect: jest.fn()
    };
  }

  createScriptProcessor() {
    return {
      onaudioprocess: null,
      connect: jest.fn(),
      disconnect: jest.fn()
    };
  }

  resume() {
    return Promise.resolve();
  }

  close() {
    return Promise.resolve();
  }
};

// Mock AudioWorkletNode
global.AudioWorkletNode = class {
  constructor() {
    this.port = {
      postMessage: jest.fn()
    };
  }

  connect() {}
  disconnect() {}
};

// Mock Canvas API
global.HTMLCanvasElement.prototype.getContext = function() {
  return {
    createImageData: (w, h) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h
    }),
    putImageData: jest.fn()
  };
};

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback) => {
  return setTimeout(callback, 16);
};

global.cancelAnimationFrame = (id) => {
  clearTimeout(id);
};

// Mock performance.now
global.performance = {
  now: () => Date.now()
};
