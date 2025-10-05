/**
 * ZX Spectrum ULA (Uncommitted Logic Array) chip emulation
 * Handles keyboard, border, speaker, and I/O
 */
export class ULA {
  constructor() {
    this.borderColor = 7; // White
    this.speakerState = false;
    this.keyboardState = new Uint8Array(8); // 8 half-rows
    this.earBit = true; // Default to high (no tape signal)

    // Border color history for accurate rendering (simulate CRT beam)
    this.borderHistory = [];
    this.cpu = null; // Reference to CPU for accurate T-state tracking
    this.frameStartBorderColor = 7; // Border color at start of frame
    this.frameStartTState = 0; // T-state at start of frame

    // Scanline tracking (per specification: 312 scanlines, 224 T-states each)
    this.currentScanline = 0;
    this.scanlineTStates = 0;
    this.TSTATES_PER_SCANLINE = 224;
    this.TOTAL_SCANLINES = 312;
    this.interruptRequested = false;
    this.floatingBusValue = 0xFF; // For undefined port reads

    // Keyboard matrix (8 rows × 5 columns)
    // Each bit represents a key state (0 = pressed, 1 = released)
    this.keyboardState.fill(0xff);

    // ZX Spectrum keyboard mapping
    this.keyMatrix = {
      // Row 0 (0xFEFE): Shift, Z, X, C, V
      'ShiftLeft': [0, 0],
      'ShiftRight': [0, 0],
      'KeyZ': [0, 1],
      'KeyX': [0, 2],
      'KeyC': [0, 3],
      'KeyV': [0, 4],

      // Row 1 (0xFDFE): A, S, D, F, G
      'KeyA': [1, 0],
      'KeyS': [1, 1],
      'KeyD': [1, 2],
      'KeyF': [1, 3],
      'KeyG': [1, 4],

      // Row 2 (0xFBFE): Q, W, E, R, T
      'KeyQ': [2, 0],
      'KeyW': [2, 1],
      'KeyE': [2, 2],
      'KeyR': [2, 3],
      'KeyT': [2, 4],

      // Row 3 (0xF7FE): 1, 2, 3, 4, 5
      'Digit1': [3, 0],
      'Digit2': [3, 1],
      'Digit3': [3, 2],
      'Digit4': [3, 3],
      'Digit5': [3, 4],

      // Row 4 (0xEFFE): 0, 9, 8, 7, 6
      'Digit0': [4, 0],
      'Digit9': [4, 1],
      'Digit8': [4, 2],
      'Digit7': [4, 3],
      'Digit6': [4, 4],

      // Row 5 (0xDFFE): P, O, I, U, Y
      'KeyP': [5, 0],
      'KeyO': [5, 1],
      'KeyI': [5, 2],
      'KeyU': [5, 3],
      'KeyY': [5, 4],

      // Row 6 (0xBFFE): Enter, L, K, J, H
      'Enter': [6, 0],
      'KeyL': [6, 1],
      'KeyK': [6, 2],
      'KeyJ': [6, 3],
      'KeyH': [6, 4],

      // Row 7 (0x7FFE): Space, Symbol Shift, M, N, B
      'Space': [7, 0],
      'ControlLeft': [7, 1],  // Symbol Shift
      'ControlRight': [7, 1], // Symbol Shift
      'KeyM': [7, 2],
      'KeyN': [7, 3],
      'KeyB': [7, 4],

      // Additional PC keyboard mappings
      'Period': [7, 2],      // . = Symbol Shift + M
      'Comma': [7, 3],       // , = Symbol Shift + N
      'Backspace': [0, 0],   // Backspace = Caps Shift (for DELETE)
    };
  }

  /**
   * Read from I/O port
   */
  read(port) {
    // Port 0xFE: Keyboard and tape input
    // The lower byte determines the port, the upper byte selects keyboard rows
    if ((port & 0x0001) === 0) {
      let result = 0xff;

      // Check keyboard matrix using the high byte
      const highByte = (port >> 8) & 0xff;
      for (let row = 0; row < 8; row++) {
        // If bit is 0 in high byte, check that row
        if ((highByte & (1 << row)) === 0) {
          result &= this.keyboardState[row];
        }
      }

      // Bit 6: EAR input (tape)
      // When earBit is true (signal HIGH), bit 6 should be 1
      // When earBit is false (signal LOW), bit 6 should be 0
      if (this.earBit) {
        result |= 0x40;
      } else {
        result &= ~0x40;
      }

      // Update floating bus value for this read
      this.floatingBusValue = result;

      return result;
    }

    // Floating bus: return last value read from data bus for undefined ports
    // This matches real hardware behavior
    return this.floatingBusValue;
  }

  /**
   * Write to I/O port
   */
  write(port, value) {
    port &= 0xff;
    value &= 0xff;

    // Port 0xFE: Border color and speaker
    if ((port & 0x01) === 0) {
      // Bits 0-2: Border color
      const newBorderColor = value & 0x07;

      // Record border color change with timing
      if (newBorderColor !== this.borderColor) {
        const tstate = this.cpu ? (this.cpu.tstates - this.frameStartTState) : 0;
        this.borderHistory.push({
          tstate: tstate,
          color: newBorderColor
        });
        this.borderColor = newBorderColor;
      }

      // Bit 3: MIC output (used during SAVE)
      // Bit 4: Speaker/Beeper output
      // Note: In real hardware, MIC and Speaker are ORed together to the sound output
      // The EAR bit here is OUTPUT (speaker), not INPUT (tape)
      const micBit = (value & 0x08) !== 0;
      const speakerBit = (value & 0x10) !== 0;
      const newSpeakerState = micBit || speakerBit; // OR (both go to speaker)

      // Debug logging - add timestamp to track periodic changes
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        if (newSpeakerState !== this.speakerState) {
          const now = performance.now();
          if (!this._lastSpeakerChange) this._lastSpeakerChange = now;
          const delta = now - this._lastSpeakerChange;
          console.log('Speaker change:', this.speakerState ? '1→0' : '0→1',
                      'MIC=' + (micBit ? 1 : 0), 'SPEAKER=' + (speakerBit ? 1 : 0),
                      'value=0x' + value.toString(16),
                      'Δt=' + delta.toFixed(1) + 'ms');
          this._lastSpeakerChange = now;
        }
      }

      this.speakerState = newSpeakerState;
    }
  }

  /**
   * Press a key
   */
  keyDown(code) {
    const pos = this.keyMatrix[code];
    if (pos) {
      const [row, col] = pos;
      this.keyboardState[row] &= ~(1 << col);
    }
  }

  /**
   * Release a key
   */
  keyUp(code) {
    const pos = this.keyMatrix[code];
    if (pos) {
      const [row, col] = pos;
      this.keyboardState[row] |= (1 << col);
    }
  }

  /**
   * Release all keys
   */
  releaseAllKeys() {
    this.keyboardState.fill(0xff);
  }

  /**
   * Set EAR input (for tape loading)
   */
  setEarBit(value) {
    this.earBit = value;
  }

  /**
   * Set tape input bit (alias for compatibility)
   */
  setTapeInput(bit) {
    this.earBit = bit ? 1 : 0;
  }

  /**
   * Get speaker state
   */
  getSpeakerState() {
    return this.speakerState;
  }

  /**
   * Get border color
   */
  getBorderColor() {
    return this.borderColor;
  }

  /**
   * Get border history (without resetting)
   */
  getBorderHistory() {
    return this.borderHistory;
  }

  /**
   * Get border color at start of frame
   */
  getFrameStartBorderColor() {
    return this.frameStartBorderColor;
  }

  /**
   * Set CPU reference for T-state tracking
   */
  setCPU(cpu) {
    this.cpu = cpu;
  }

  /**
   * Reset border history for new frame
   */
  resetFrameTStates() {
    this.frameStartBorderColor = this.borderColor;
    this.frameStartTState = this.cpu ? this.cpu.tstates : 0;
    this.borderHistory = [];
  }

  /**
   * Advance scanline tracking by T-states
   * Per spec: 312 scanlines, 224 T-states per scanline
   */
  addCycles(cycles) {
    this.scanlineTStates += cycles;

    while (this.scanlineTStates >= this.TSTATES_PER_SCANLINE) {
      this.scanlineTStates -= this.TSTATES_PER_SCANLINE;
      this.currentScanline++;

      if (this.currentScanline >= this.TOTAL_SCANLINES) {
        this.currentScanline = 0;
        this.interruptRequested = true;
      }
    }
  }

  /**
   * Check if interrupt is requested and clear the flag
   */
  checkInterrupt() {
    const requested = this.interruptRequested;
    this.interruptRequested = false;
    return requested;
  }

  /**
   * Get current scanline (0-311)
   */
  getCurrentScanline() {
    return this.currentScanline;
  }

  /**
   * Reset ULA
   */
  reset() {
    this.borderColor = 7;
    this.speakerState = false;
    this.earBit = true; // Default to high (no tape signal)
    this.releaseAllKeys();
    this.currentScanline = 0;
    this.scanlineTStates = 0;
    this.interruptRequested = false;
    this.floatingBusValue = 0xFF;
  }
}
