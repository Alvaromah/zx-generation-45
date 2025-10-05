/**
 * ZX Spectrum 48K Emulator
 * Main emulator class coordinating all components
 */
import { Z80CPU } from '../core/cpu.js';
import { InstructionDecoder } from '../decoder/decoder.js';
import { Memory } from './memory.js';
import { ULA } from './ula.js';
import { Display } from './display.js';
import { Sound } from './sound.js';
import { Tape } from './tape.js';
import { Snapshot } from './snapshot.js';
import { TouchKeyboard } from './touch-keyboard.js';
import { TraceAnalyzer } from '../debug/trace-analyzer.js';

export class ZXSpectrum {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = {
      rom: options.rom || 'https://cdn.jsdelivr.net/gh/gasman/zxbasic@master/roms/48.rom',
      autoStart: options.autoStart !== false,
      sound: options.sound !== false,
      useAudioWorklet: options.useAudioWorklet !== false,
      scale: options.scale || 'auto',
      handleKeyboard: options.handleKeyboard !== false,
      touchKeyboard: options.touchKeyboard || 'auto',
      fps: options.fps || 50,
      onReady: options.onReady || null,
      onError: options.onError || null
    };

    // Initialize components
    this.cpu = new Z80CPU();
    this.memory = new Memory();
    this.ula = new ULA();
    this.display = new Display(canvas);
    this.sound = this.options.sound ? new Sound(this.options.useAudioWorklet) : null;
    this.decoder = new InstructionDecoder(this.cpu);

    // Initialize tape with reference to this spectrum object
    this.tape = new Tape(this);
    this.touchKeyboard = null;

    // Connect CPU to memory and I/O
    this.cpu.memory = this.memory;
    this.cpu.io = this.ula;

    // Connect ULA to CPU for accurate T-state tracking
    this.ula.setCPU(this.cpu);

    // Emulation state
    this.running = false;
    this.turboMode = false;
    this.frameId = null;
    this.lastFrameTime = 0;
    this.frameInterval = 1000 / this.options.fps;
    this.tstatesPerFrame = 69888; // 3.5MHz CPU at 50Hz

    // Stats
    this.stats = {
      fps: 0,
      frameCount: 0,
      lastStatsTime: 0
    };

    // Keyboard handling
    if (this.options.handleKeyboard) {
      this.setupKeyboard();
    }

    // Touch keyboard
    if (this.options.touchKeyboard === 'auto') {
      if (this.isMobile()) {
        this.createTouchKeyboard();
      }
    } else if (this.options.touchKeyboard === true) {
      this.createTouchKeyboard();
    }

    // Set display scale
    this.display.setScale(this.options.scale);

    // Initialize
    this.init();
  }

  /**
   * Initialize emulator
   */
  async init() {
    try {
      // Load ROM
      if (typeof this.options.rom === 'string') {
        await this.loadROMFromURL(this.options.rom);
      } else {
        this.loadROM(this.options.rom);
      }

      // Initialize sound
      if (this.sound) {
        await this.sound.init();
      }

      // Reset to initial state
      this.reset();

      // Auto start
      if (this.options.autoStart) {
        this.start();
      }

      if (this.options.onReady) {
        this.options.onReady(this);
      }
    } catch (error) {
      if (this.options.onError) {
        this.options.onError(error);
      } else {
        console.error('Failed to initialize emulator:', error);
      }
    }
  }

  /**
   * Load ROM data
   */
  loadROM(data) {
    this.memory.loadROM(data);
  }

  /**
   * Load ROM from URL
   */
  async loadROMFromURL(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load ROM: ${response.statusText}`);
    }
    const data = await response.arrayBuffer();
    this.loadROM(data);
  }

  /**
   * Reset emulator
   */
  reset() {
    const wasRunning = this.running;

    // Stop execution first
    if (wasRunning) {
      this.stop();
    }

    // Reset all components
    this.cpu.reset();
    this.memory.reset();
    this.ula.reset();
    this.display.clear();
    if (this.sound) this.sound.reset();
    this.tape.reset();

    // Restart if it was running
    if (wasRunning) {
      this.start();
    }
  }

  /**
   * Start emulation
   */
  start() {
    if (this.running) return;

    this.running = true;
    this.lastFrameTime = performance.now();
    this.stats.lastStatsTime = this.lastFrameTime;

    // Resume audio
    if (this.sound) {
      this.sound.resume();
    }

    this.frameLoop();
  }

  /**
   * Stop emulation
   */
  stop() {
    this.running = false;

    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  /**
   * Main frame loop
   */
  frameLoop() {
    if (!this.running) return;

    const now = performance.now();
    const elapsed = now - this.lastFrameTime;

    if (this.turboMode || elapsed >= this.frameInterval) {
      // In turbo mode, execute multiple frames per animation frame
      const framesToExecute = this.turboMode ? 10 : 1;

      for (let i = 0; i < framesToExecute; i++) {
        // Render only the last frame in turbo mode to show progress
        const shouldRender = !this.turboMode || (i === framesToExecute - 1);
        this.executeFrame(shouldRender);
      }

      // Maintain consistent timing even if frames take longer
      this.lastFrameTime += this.frameInterval;

      // If we're too far behind, resync
      if (now - this.lastFrameTime > this.frameInterval * 2) {
        this.lastFrameTime = now;
      }

      this.stats.frameCount++;

      // Update FPS counter every second
      if (now - this.stats.lastStatsTime >= 1000) {
        this.stats.fps = this.stats.frameCount;
        this.stats.frameCount = 0;
        this.stats.lastStatsTime = now;
      }
    }

    this.frameId = requestAnimationFrame(() => this.frameLoop());
  }

  /**
   * Execute one frame
   * @param {boolean} render - Whether to render display (false in turbo mode)
   */
  executeFrame(render = true) {
    const targetTStates = this.cpu.tstates + this.tstatesPerFrame;
    let lastSpeakerState = this.ula.getSpeakerState();
    let tStatesSinceLastSound = 0;

    // Reset border history for new frame
    this.ula.resetFrameTStates();

    while (this.cpu.tstates < targetTStates) {
      const tStatesBefore = this.cpu.tstates;

      // Execute one instruction
      this.decoder.executeInstruction();

      const tStatesExecuted = this.cpu.tstates - tStatesBefore;

      // Update tape and set EAR bit
      const tapeInputBit = this.tape.update(this.cpu.tstates);
      this.ula.setTapeInput(tapeInputBit);

      // Update sound - only when state changes and rendering is enabled
      if (this.sound && render) {
        const speakerState = this.ula.getSpeakerState();
        tStatesSinceLastSound += tStatesExecuted;

        if (speakerState !== lastSpeakerState) {
          this.sound.updateSpeaker(speakerState, tStatesSinceLastSound);
          lastSpeakerState = speakerState;
          tStatesSinceLastSound = 0;
        }
      }
    }

    // Send any remaining t-states at end of frame
    if (this.sound && render && tStatesSinceLastSound > 0) {
      this.sound.updateSpeaker(lastSpeakerState, tStatesSinceLastSound);
    }

    // Generate interrupt (50Hz)
    this.cpu.interrupt();

    // Note: We don't reset tstates here because tape timing depends on absolute cycles
    // The original zx-generation implementation doesn't reset cycles either
    // this.cpu.tstates -= this.tstatesPerFrame;

    // Render display only if not in turbo mode
    if (render) {
      this.display.render(this.memory, this.ula);
    }
  }

  /**
   * Set turbo mode (for fast tape loading)
   */
  setTurboMode(enabled) {
    this.turboMode = enabled;
  }

  /**
   * Load tape file
   */
  loadTape(data) {
    const format = this.detectTapeFormat(data);

    if (format === 'TAP') {
      this.tape.loadTAP(data);
    } else if (format === 'TZX') {
      this.tape.loadTZX(data);
    } else {
      throw new Error('Unknown tape format');
    }
  }

  /**
   * Load tape from URL
   */
  async loadTapeFromURL(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load tape: ${response.statusText}`);
    }
    const data = await response.arrayBuffer();
    this.loadTape(data);
  }

  /**
   * Detect tape format
   */
  detectTapeFormat(data) {
    if (data instanceof ArrayBuffer) {
      data = new Uint8Array(data);
    }

    // TZX has signature "ZXTape!"
    if (data.length > 10 &&
        data[0] === 0x5a && data[1] === 0x58 && data[2] === 0x54 &&
        data[3] === 0x61 && data[4] === 0x70 && data[5] === 0x65 &&
        data[6] === 0x21) {
      return 'TZX';
    }

    // Assume TAP
    return 'TAP';
  }

  /**
   * Play tape
   */
  playTape() {
    this.tape.play();
  }

  /**
   * Pause tape
   */
  pauseTape() {
    this.tape.pause();
  }

  /**
   * Stop tape
   */
  stopTape() {
    this.tape.stop();
  }

  /**
   * Rewind tape
   */
  rewindTape() {
    this.tape.rewind();
  }

  /**
   * Get tape status
   */
  getTapeStatus() {
    return this.tape.getStatus();
  }

  /**
   * Load snapshot
   */
  loadSnapshot(data) {
    const result = Snapshot.loadZ80(data, this.cpu, this.memory);

    if (result.borderColor !== undefined) {
      this.ula.borderColor = result.borderColor;
    }
  }

  /**
   * Load Z80 snapshot from file
   */
  loadZ80Snapshot(data) {
    this.loadSnapshot(data);
  }

  /**
   * Save snapshot
   */
  saveSnapshot() {
    return Snapshot.saveZ80(this.cpu, this.memory);
  }

  /**
   * Keyboard handling
   */
  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Prevent default for keys that ZX Spectrum uses
      if (this.ula.keyMatrix[e.code]) {
        e.preventDefault();

        // Special handling for Period and Comma (need Symbol Shift)
        if (e.code === 'Period') {
          this.keyDown('ControlLeft');  // Symbol Shift
          this.keyDown('KeyM');
        } else if (e.code === 'Comma') {
          this.keyDown('ControlLeft');  // Symbol Shift
          this.keyDown('KeyN');
        } else if (e.code === 'Backspace') {
          // DELETE = Caps Shift + 0
          this.keyDown('ShiftLeft');
          this.keyDown('Digit0');
        } else {
          this.keyDown(e.code);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.ula.keyMatrix[e.code]) {
        e.preventDefault();

        // Special handling for Period and Comma (release Symbol Shift)
        if (e.code === 'Period') {
          this.keyUp('KeyM');
          this.keyUp('ControlLeft');  // Symbol Shift
        } else if (e.code === 'Comma') {
          this.keyUp('KeyN');
          this.keyUp('ControlLeft');  // Symbol Shift
        } else if (e.code === 'Backspace') {
          // DELETE = Caps Shift + 0
          this.keyUp('Digit0');
          this.keyUp('ShiftLeft');
        } else {
          this.keyUp(e.code);
        }
      }
    });
  }

  /**
   * Key down
   */
  keyDown(code) {
    this.ula.keyDown(code);
  }

  /**
   * Key up
   */
  keyUp(code) {
    this.ula.keyUp(code);
  }

  /**
   * Press and release key
   */
  keyPress(code, duration = 100) {
    this.keyDown(code);
    setTimeout(() => this.keyUp(code), duration);
  }

  /**
   * Type text
   */
  async typeText(text, options = {}) {
    const delay = options.delay || 100;
    const enterAtEnd = options.enterAtEnd !== false;

    for (const char of text) {
      await this.typeChar(char, delay);
    }

    if (enterAtEnd) {
      await this.typeChar('\n', delay);
    }
  }

  /**
   * Type single character
   */
  async typeChar(char, delay = 100) {
    // Symbol shift combinations - CHECK FIRST before converting to lowercase
    const symbolShift = {
      '"': 'KeyP',
      ',': 'KeyN',
      '.': 'KeyM',
      ':': 'KeyZ',
      ';': 'KeyO',
      '!': 'Digit1',
      '@': 'Digit2',
      '#': 'Digit3',
      '$': 'Digit4',
      '%': 'Digit5',
      '&': 'Digit6',
      "'": 'Digit7',
      '(': 'Digit8',
      ')': 'Digit9',
      '_': 'Digit0',
      '<': 'KeyR',
      '>': 'KeyT',
      '=': 'KeyL',
      '+': 'KeyK',
      '-': 'KeyJ',
      '*': 'KeyB',
      '/': 'KeyV',
      '?': 'KeyC',
      '£': 'KeyX'
    };

    // Check if it's a symbol shift character FIRST
    if (symbolShift[char]) {
      // Symbol Shift + key
      this.keyDown('ControlLeft');
      this.keyDown(symbolShift[char]);
      await new Promise(resolve => setTimeout(resolve, delay / 2));
      this.keyUp(symbolShift[char]);
      this.keyUp('ControlLeft');
      await new Promise(resolve => setTimeout(resolve, delay / 2));
      return;
    }

    const lowerChar = char.toLowerCase();
    const isUpperCase = char !== lowerChar;

    const mapping = {
      '\n': 'Enter',
      ' ': 'Space',
      'a': 'KeyA', 'b': 'KeyB', 'c': 'KeyC', 'd': 'KeyD', 'e': 'KeyE',
      'f': 'KeyF', 'g': 'KeyG', 'h': 'KeyH', 'i': 'KeyI', 'j': 'KeyJ',
      'k': 'KeyK', 'l': 'KeyL', 'm': 'KeyM', 'n': 'KeyN', 'o': 'KeyO',
      'p': 'KeyP', 'q': 'KeyQ', 'r': 'KeyR', 's': 'KeyS', 't': 'KeyT',
      'u': 'KeyU', 'v': 'KeyV', 'w': 'KeyW', 'x': 'KeyX', 'y': 'KeyY',
      'z': 'KeyZ',
      '0': 'Digit0', '1': 'Digit1', '2': 'Digit2', '3': 'Digit3',
      '4': 'Digit4', '5': 'Digit5', '6': 'Digit6', '7': 'Digit7',
      '8': 'Digit8', '9': 'Digit9'
    };

    const code = mapping[lowerChar];

    if (code) {
      if (isUpperCase) {
        // Caps shift for uppercase letters
        this.keyDown('ShiftLeft');
        this.keyDown(code);
        await new Promise(resolve => setTimeout(resolve, delay / 2));
        this.keyUp(code);
        this.keyUp('ShiftLeft');
        await new Promise(resolve => setTimeout(resolve, delay / 2));
      } else {
        // Normal key press for lowercase
        this.keyDown(code);
        await new Promise(resolve => setTimeout(resolve, delay / 2));
        this.keyUp(code);
        await new Promise(resolve => setTimeout(resolve, delay / 2));
      }
    }
  }

  /**
   * Type a BASIC keyword (in command mode, letters auto-generate keywords)
   * For extended mode keywords, use CAPS+SYM then letter
   */
  async typeKeyword(keyword, delay = 100) {
    keyword = keyword.toUpperCase();

    // Keywords available in extended mode (CAPS SHIFT + Symbol Shift + letter)
    const extendedMode = {
      'BEEP': 'KeyB', 'USR': 'KeyU', 'COPY': 'KeyC', 'RESTORE': 'KeyR',
      'REM': 'KeyE', 'NEW': 'KeyA', 'INK': 'KeyI', 'PAPER': 'KeyP',
      'FLASH': 'KeyF', 'BRIGHT': 'KeyG', 'INVERSE': 'KeyH', 'OVER': 'KeyO',
      'OUT': 'KeyM', 'LPRINT': 'KeyL', 'LLIST': 'KeyK', 'STOP': 'KeyA',
      'READ': 'KeyR', 'DATA': 'KeyD', 'RESTORE': 'KeyR', 'DIM': 'KeyS',
      'FOR': 'KeyF', 'GO TO': 'KeyG', 'GO SUB': 'KeyH', 'INPUT': 'KeyI',
      'LOAD': 'KeyJ', 'LIST': 'KeyK', 'LET': 'KeyL', 'PAUSE': 'KeyM',
      'NEXT': 'KeyN', 'POKE': 'KeyO', 'PRINT': 'KeyP', 'PLOT': 'KeyQ',
      'RUN': 'KeyR', 'SAVE': 'KeyS', 'RANDOMIZE': 'KeyT', 'IF': 'KeyU',
      'CLS': 'KeyV', 'DRAW': 'KeyW', 'CLEAR': 'KeyX', 'RETURN': 'KeyY',
      'CIRCLE': 'KeyC'
    };

    // Direct keywords (just press letter in command mode)
    const directKeys = {
      'PRINT': 'KeyP', 'RUN': 'KeyR', 'LIST': 'KeyL', 'CLS': 'KeyV',
      'SAVE': 'KeyS', 'LOAD': 'KeyJ', 'POKE': 'KeyO', 'RANDOMIZE': 'KeyT',
      'DRAW': 'KeyW', 'CLEAR': 'KeyX', 'RETURN': 'KeyY', 'IF': 'KeyU',
      'GO TO': 'KeyG', 'INPUT': 'KeyI', 'DIM': 'KeyD', 'FOR': 'KeyF',
      'NEXT': 'KeyN', 'PLOT': 'KeyQ', 'LET': 'KeyL', 'PAUSE': 'KeyM'
    };

    // Try direct mode first (most common)
    if (directKeys[keyword]) {
      this.keyDown(directKeys[keyword]);
      await new Promise(resolve => setTimeout(resolve, delay / 2));
      this.keyUp(directKeys[keyword]);
      await new Promise(resolve => setTimeout(resolve, delay / 2));
      return;
    }

    // Try extended mode
    if (extendedMode[keyword]) {
      // Enter extended mode: CAPS SHIFT + Symbol Shift together
      this.keyDown('ShiftLeft');
      this.keyDown('ControlLeft');
      await new Promise(resolve => setTimeout(resolve, delay / 3));
      this.keyUp('ShiftLeft');
      this.keyUp('ControlLeft');
      await new Promise(resolve => setTimeout(resolve, delay / 3));

      // Press the letter
      this.keyDown(extendedMode[keyword]);
      await new Promise(resolve => setTimeout(resolve, delay / 3));
      this.keyUp(extendedMode[keyword]);
      await new Promise(resolve => setTimeout(resolve, delay / 3));
      return;
    }

    // If not found, type it character by character
    for (const char of keyword) {
      await this.typeChar(char, delay);
    }
  }

  /**
   * Poke memory
   */
  poke(address, value) {
    this.memory.write(address, value);
  }

  /**
   * Peek memory
   */
  peek(address) {
    return this.memory.read(address);
  }

  /**
   * Set volume
   */
  setVolume(volume) {
    if (this.sound) {
      this.sound.setVolume(volume);
    }
  }

  /**
   * Set muted
   */
  setMuted(muted) {
    if (this.sound) {
      this.sound.setMuted(muted);
    }
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      fps: this.stats.fps,
      running: this.running,
      turboMode: this.turboMode,
      pc: this.cpu.pc,
      tstates: this.cpu.tstates
    };
  }

  /**
   * Create touch keyboard
   */
  createTouchKeyboard() {
    this.touchKeyboard = new TouchKeyboard(this, document.body);
    this.touchKeyboard.create();

    // Auto-show on mobile
    if (this.isMobile()) {
      this.touchKeyboard.show();
    }
  }

  /**
   * Check if mobile device
   */
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Enable/disable debug mode
   */
  setDebugMode(enabled) {
    this.decoder.setDebugMode(enabled);
  }

  /**
   * Get formatted trace (last 100 instructions)
   */
  getTrace() {
    const log = this.decoder.getTraceLog();
    return TraceAnalyzer.getLastInstructions(log, 100);
  }

  /**
   * Analyze trace for loops
   */
  analyzeTrace() {
    const log = this.decoder.getTraceLog();
    const analysis = TraceAnalyzer.analyzeForLoops(log);
    TraceAnalyzer.printLoopAnalysis(analysis);
    return analysis;
  }

  /**
   * Clear trace log
   */
  clearTrace() {
    this.decoder.clearTrace();
  }

  /**
   * Destroy emulator
   */
  destroy() {
    this.stop();

    if (this.sound) {
      this.sound.destroy();
    }

    if (this.touchKeyboard) {
      this.touchKeyboard.destroy();
    }
  }
}
