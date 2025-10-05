/**
 * ZX Spectrum tape loading system
 * Supports TAP and basic TZX formats
 */
export class Tape {
  constructor(spectrum) {
    this.spectrum = spectrum;
    this.cpu = spectrum.cpu;
    this.ula = spectrum.ula;

    this.data = null;
    this.format = null;
    this.blocks = [];
    this.currentBlock = null;
    this.blockIndex = 0;
    this.playing = false;
    this.paused = false;
    this.position = 0;

    // Bit and byte position
    this.bitPosition = 0;
    this.bytePosition = 0;
    this.currentBit = 0;
    this.lastEarBit = 0;

    // Timing with absolute cycles
    this.nextEdgeCycle = 0;
    this.lastUpdateCycle = 0;

    // State machine
    this.state = 'IDLE';
    this.pulseCount = 0;
    this.edgeCount = 0;
    this.pauseCycles = 0;
    this.pulseIndex = 0;

    // Standard timing constants (in T-states)
    this.PILOT_PULSE = 2168;
    this.SYNC1_PULSE = 667;
    this.SYNC2_PULSE = 735;
    this.ZERO_PULSE = 855;
    this.ONE_PULSE = 1710;
    this.PILOT_PULSES_HEADER = 8063;
    this.PILOT_PULSES_DATA = 3223;
    this.STANDARD_PAUSE = 500;
    this.CYCLES_PER_MS = 3500;

    // Block types
    this.BLOCK_STANDARD = 0x10;
    this.BLOCK_TURBO = 0x11;
    this.BLOCK_PURE_TONE = 0x12;
    this.BLOCK_PULSE_SEQUENCE = 0x13;
    this.BLOCK_PURE_DATA = 0x14;
    this.BLOCK_DIRECT_RECORDING = 0x15;
    this.BLOCK_PAUSE = 0x20;
    this.BLOCK_GROUP_START = 0x21;
    this.BLOCK_GROUP_END = 0x22;
    this.BLOCK_JUMP = 0x23;
    this.BLOCK_LOOP_START = 0x24;
    this.BLOCK_LOOP_END = 0x25;
    this.BLOCK_SELECT = 0x28;
    this.BLOCK_STOP_TAPE_48K = 0x2A;
    this.BLOCK_TEXT = 0x30;
    this.BLOCK_MESSAGE = 0x31;
    this.BLOCK_ARCHIVE_INFO = 0x32;
    this.BLOCK_HARDWARE = 0x33;
    this.BLOCK_GLUE = 0x5A;

    // Loop stack for handling loop blocks
    this.loopStack = [];

    // Pulse sequence for complex blocks
    this.pulseSequence = null;
  }

  /**
   * Load TAP file
   */
  loadTAP(data) {
    if (data instanceof ArrayBuffer) {
      data = new Uint8Array(data);
    }

    this.data = data;
    this.format = 'TAP';
    this.blocks = this.parseTAPBlocks(data);
    this.reset();
  }

  /**
   * Parse TAP blocks
   */
  parseTAPBlocks(data) {
    const blocks = [];
    let offset = 0;

    while (offset < data.length) {
      if (offset + 2 > data.length) break;

      const length = data[offset] | (data[offset + 1] << 8);
      offset += 2;

      if (offset + length > data.length) break;

      const blockData = data.slice(offset, offset + length);
      const flagByte = blockData[0];

      // Different pause times for headers vs data blocks
      const pauseTime = (flagByte < 128) ? 100 : 500;

      blocks.push({
        type: this.BLOCK_STANDARD,
        data: blockData,
        pilotPulse: this.PILOT_PULSE,
        sync1Pulse: this.SYNC1_PULSE,
        sync2Pulse: this.SYNC2_PULSE,
        zeroPulse: this.ZERO_PULSE,
        onePulse: this.ONE_PULSE,
        pilotPulses: flagByte < 128 ? this.PILOT_PULSES_HEADER : this.PILOT_PULSES_DATA,
        pause: pauseTime,
        usedBits: 8
      });

      offset += length;
    }

    console.log(`TAP: Parsed ${blocks.length} blocks`);
    return blocks;
  }

  /**
   * Load TZX file (basic support)
   */
  loadTZX(data) {
    if (data instanceof ArrayBuffer) {
      data = new Uint8Array(data);
    }

    this.data = data;
    this.format = 'TZX';
    this.blocks = this.parseTZXBlocks(data);
    this.reset();
  }

  /**
   * Parse TZX blocks (comprehensive implementation)
   */
  parseTZXBlocks(data) {
    const blocks = [];
    let offset = 10; // Skip TZX header "ZXTape!" + 0x1A + major + minor

    while (offset < data.length) {
      const blockId = data[offset++];
      const parseResult = this.parseTZXBlock(data, offset, blockId);

      if (!parseResult) {
        console.warn(`Unknown or unsupported TZX block ID: 0x${blockId.toString(16).padStart(2, '0')} at offset ${offset - 1}`);
        break;
      }

      if (parseResult.block) {
        blocks.push(parseResult.block);
      }

      offset = parseResult.offset;
    }

    console.log(`TZX: Parsed ${blocks.length} blocks`);
    return blocks;
  }

  /**
   * Parse a single TZX block
   */
  parseTZXBlock(data, offset, blockId) {
    switch (blockId) {
      case 0x10: // Standard speed data block
        return this.parseTZXBlock10(data, offset);

      case 0x11: // Turbo speed data block
        return this.parseTZXBlock11(data, offset);

      case 0x12: // Pure tone
        return this.parseTZXBlock12(data, offset);

      case 0x13: // Pulse sequence
        return this.parseTZXBlock13(data, offset);

      case 0x14: // Pure data block
        return this.parseTZXBlock14(data, offset);

      case 0x15: // Direct recording
        return this.parseTZXBlock15(data, offset);

      case 0x20: // Pause (silence)
        return this.parseTZXBlock20(data, offset);

      case 0x21: // Group start
        return this.parseTZXBlock21(data, offset);

      case 0x22: // Group end
        return { offset, block: null }; // No block generated

      case 0x23: // Jump to block
        return this.parseTZXBlock23(data, offset);

      case 0x24: // Loop start
        return this.parseTZXBlock24(data, offset);

      case 0x25: // Loop end
        return this.parseTZXBlock25(data, offset);

      case 0x28: // Select block
        return this.parseTZXBlock28(data, offset);

      case 0x2A: // Stop tape if in 48K mode
        return this.parseTZXBlock2A(data, offset);

      case 0x30: // Text description
        return this.parseTZXBlock30(data, offset);

      case 0x31: // Message block
        return this.parseTZXBlock31(data, offset);

      case 0x32: // Archive info
        return this.parseTZXBlock32(data, offset);

      case 0x33: // Hardware type
        return this.parseTZXBlock33(data, offset);

      case 0x35: // Custom info
        return this.parseTZXBlock35(data, offset);

      case 0x5A: // "Glue" block
        return this.parseTZXBlock5A(data, offset);

      default:
        return null;
    }
  }

  // Block 0x10: Standard speed data block
  parseTZXBlock10(data, offset) {
    const pause = data[offset] | (data[offset + 1] << 8);
    const length = data[offset + 2] | (data[offset + 3] << 8);
    offset += 4;

    const blockData = data.slice(offset, offset + length);
    const flagByte = blockData[0] || 0;

    const block = {
      type: this.BLOCK_STANDARD,
      data: blockData,
      pilotPulse: this.PILOT_PULSE,
      sync1Pulse: this.SYNC1_PULSE,
      sync2Pulse: this.SYNC2_PULSE,
      zeroPulse: this.ZERO_PULSE,
      onePulse: this.ONE_PULSE,
      pilotPulses: flagByte < 128 ? this.PILOT_PULSES_HEADER : this.PILOT_PULSES_DATA,
      pause: pause,
      usedBits: 8
    };

    return { offset: offset + length, block };
  }

  // Block 0x11: Turbo speed data block
  parseTZXBlock11(data, offset) {
    const pilotPulse = data[offset] | (data[offset + 1] << 8);
    const sync1Pulse = data[offset + 2] | (data[offset + 3] << 8);
    const sync2Pulse = data[offset + 4] | (data[offset + 5] << 8);
    const zeroPulse = data[offset + 6] | (data[offset + 7] << 8);
    const onePulse = data[offset + 8] | (data[offset + 9] << 8);
    const pilotPulses = data[offset + 10] | (data[offset + 11] << 8);
    const usedBits = data[offset + 12];
    const pause = data[offset + 13] | (data[offset + 14] << 8);
    const length = data[offset + 15] | (data[offset + 16] << 8) | (data[offset + 17] << 16);
    offset += 18;

    const blockData = data.slice(offset, offset + length);

    const block = {
      type: this.BLOCK_TURBO,
      data: blockData,
      pilotPulse,
      sync1Pulse,
      sync2Pulse,
      zeroPulse,
      onePulse,
      pilotPulses,
      pause,
      usedBits
    };

    return { offset: offset + length, block };
  }

  // Block 0x12: Pure tone
  parseTZXBlock12(data, offset) {
    const pulseLength = data[offset] | (data[offset + 1] << 8);
    const pulseCount = data[offset + 2] | (data[offset + 3] << 8);

    const block = {
      type: this.BLOCK_PURE_TONE,
      pulseLength,
      pulseCount
    };

    return { offset: offset + 4, block };
  }

  // Block 0x13: Pulse sequence
  parseTZXBlock13(data, offset) {
    const numPulses = data[offset];
    offset++;

    const pulses = [];
    for (let i = 0; i < numPulses; i++) {
      pulses.push(data[offset] | (data[offset + 1] << 8));
      offset += 2;
    }

    const block = {
      type: this.BLOCK_PULSE_SEQUENCE,
      pulses
    };

    return { offset, block };
  }

  // Block 0x14: Pure data block
  parseTZXBlock14(data, offset) {
    const zeroPulse = data[offset] | (data[offset + 1] << 8);
    const onePulse = data[offset + 2] | (data[offset + 3] << 8);
    const usedBits = data[offset + 4];
    const pause = data[offset + 5] | (data[offset + 6] << 8);
    const length = data[offset + 7] | (data[offset + 8] << 8) | (data[offset + 9] << 16);
    offset += 10;

    const blockData = data.slice(offset, offset + length);

    const block = {
      type: this.BLOCK_PURE_DATA,
      data: blockData,
      zeroPulse,
      onePulse,
      usedBits,
      pause
    };

    return { offset: offset + length, block };
  }

  // Block 0x15: Direct recording
  parseTZXBlock15(data, offset) {
    const tStatesPerSample = data[offset] | (data[offset + 1] << 8);
    const pause = data[offset + 2] | (data[offset + 3] << 8);
    const usedBits = data[offset + 4];
    const length = data[offset + 5] | (data[offset + 6] << 8) | (data[offset + 7] << 16);
    offset += 8;

    const blockData = data.slice(offset, offset + length);

    const block = {
      type: this.BLOCK_DIRECT_RECORDING,
      data: blockData,
      tStatesPerSample,
      pause,
      usedBits
    };

    return { offset: offset + length, block };
  }

  // Block 0x20: Pause (silence)
  parseTZXBlock20(data, offset) {
    const pause = data[offset] | (data[offset + 1] << 8);

    const block = {
      type: this.BLOCK_PAUSE,
      pause
    };

    return { offset: offset + 2, block };
  }

  // Block 0x21: Group start
  parseTZXBlock21(data, offset) {
    const length = data[offset];
    offset++;
    const name = String.fromCharCode(...data.slice(offset, offset + length));
    console.log(`TZX Group Start: ${name}`);

    return { offset: offset + length, block: null };
  }

  // Block 0x23: Jump to block
  parseTZXBlock23(data, offset) {
    const jumpOffset = (data[offset] | (data[offset + 1] << 8));
    const signedOffset = jumpOffset > 32767 ? jumpOffset - 65536 : jumpOffset;

    const block = {
      type: this.BLOCK_JUMP,
      jumpOffset: signedOffset
    };

    return { offset: offset + 2, block };
  }

  // Block 0x24: Loop start
  parseTZXBlock24(data, offset) {
    const repetitions = data[offset] | (data[offset + 1] << 8);

    const block = {
      type: this.BLOCK_LOOP_START,
      repetitions
    };

    return { offset: offset + 2, block };
  }

  // Block 0x25: Loop end
  parseTZXBlock25(data, offset) {
    const block = {
      type: this.BLOCK_LOOP_END
    };

    return { offset, block };
  }

  // Block 0x28: Select block
  parseTZXBlock28(data, offset) {
    const length = data[offset] | (data[offset + 1] << 8);
    const endOffset = offset + 2 + length;
    offset += 2;

    const numSelections = data[offset];
    offset++;

    // Skip select block - just advance past it
    console.log(`TZX Select block with ${numSelections} selections - skipping`);

    return { offset: endOffset, block: null };
  }

  // Block 0x2A: Stop tape if in 48K mode
  parseTZXBlock2A(data, offset) {
    const block = {
      type: this.BLOCK_STOP_TAPE_48K
    };

    return { offset: offset + 4, block };
  }

  // Block 0x30: Text description
  parseTZXBlock30(data, offset) {
    const length = data[offset];
    offset++;
    const text = String.fromCharCode(...data.slice(offset, offset + length));
    console.log(`TZX Text: ${text}`);

    return { offset: offset + length, block: null };
  }

  // Block 0x31: Message block
  parseTZXBlock31(data, offset) {
    const displayTime = data[offset];
    const length = data[offset + 1];
    offset += 2;
    const message = String.fromCharCode(...data.slice(offset, offset + length));
    console.log(`TZX Message (${displayTime}s): ${message}`);

    return { offset: offset + length, block: null };
  }

  // Block 0x32: Archive info
  parseTZXBlock32(data, offset) {
    const length = data[offset] | (data[offset + 1] << 8);
    // Skip archive info
    return { offset: offset + 2 + length, block: null };
  }

  // Block 0x33: Hardware type
  parseTZXBlock33(data, offset) {
    const numEntries = data[offset];
    // Each entry is 3 bytes
    return { offset: offset + 1 + (numEntries * 3), block: null };
  }

  // Block 0x35: Custom info
  parseTZXBlock35(data, offset) {
    const length = data[offset] | (data[offset + 1] << 8) |
                   (data[offset + 2] << 16) | (data[offset + 3] << 24);
    return { offset: offset + 4 + length + 16, block: null }; // +16 for identification
  }

  // Block 0x5A: Glue block
  parseTZXBlock5A(data, offset) {
    // Glue block is 9 bytes total
    return { offset: offset + 9, block: null };
  }

  /**
   * Start playback
   */
  play() {
    if (!this.blocks || this.blocks.length === 0) {
      console.log('No blocks to play');
      return;
    }

    console.log('Starting tape playback');
    this.playing = true;
    this.paused = false;

    // Initialize timing
    this.lastUpdateCycle = this.cpu.cycles;

    if (!this.currentBlock) {
      this.nextBlock();
    }
  }

  /**
   * Pause playback
   */
  pause() {
    this.paused = true;
    console.log('Tape paused');
  }

  /**
   * Stop playback
   */
  stop() {
    this.playing = false;
    this.paused = false;
    this.blockIndex = 0;
    this.reset();
    console.log('Tape stopped');
  }

  /**
   * Rewind to start
   */
  rewind() {
    this.stop();
    this.blockIndex = 0;
    console.log('Tape rewound');
  }

  /**
   * Reset tape state
   */
  reset() {
    this.state = 'IDLE';
    this.currentBlock = null;
    this.lastEarBit = 0;
    this.nextEdgeCycle = 0;
    this.pulseCount = 0;
    this.edgeCount = 0;
    this.bitPosition = 0;
    this.bytePosition = 0;
    this.currentBit = 0;
    this.pauseCycles = 0;
    this.pulseIndex = 0;
  }

  /**
   * Move to next block
   */
  nextBlock() {
    console.log(`nextBlock() called: blockIndex=${this.blockIndex}, total=${this.blocks.length}`);

    if (this.blockIndex >= this.blocks.length) {
      console.log('End of tape reached');
      this.stop();
      return;
    }

    this.currentBlock = this.blocks[this.blockIndex];
    console.log(`\nStarting block ${this.blockIndex}, type: 0x${this.currentBlock.type.toString(16).padStart(2, '0')}`);

    if (this.currentBlock.data) {
      const flagByte = this.currentBlock.data[0];
      console.log(`  Flag byte: 0x${flagByte.toString(16).padStart(2, '0')} (${flagByte < 128 ? 'Header' : 'Data'})`);
      console.log(`  Data length: ${this.currentBlock.data.length} bytes`);
      console.log(`  Pause after: ${this.currentBlock.pause || 0}ms`);
    }

    this.blockIndex++;

    // Reset block state
    this.bitPosition = 0;
    this.bytePosition = 0;
    this.pulseCount = 0;
    this.edgeCount = 0;
    this.pulseIndex = 0;

    // Initialize block state based on type
    switch (this.currentBlock.type) {
      case this.BLOCK_STANDARD:
      case this.BLOCK_TURBO:
        this.state = 'PILOT';
        this.nextEdgeCycle = this.cpu.cycles + this.currentBlock.pilotPulse;
        console.log(`  Starting PILOT state with ${this.currentBlock.pilotPulses} pulses, nextEdge=${this.nextEdgeCycle}`);
        break;

      case this.BLOCK_PURE_TONE:
        this.state = 'PURE_TONE';
        this.edgeCount = 0;
        this.nextEdgeCycle = this.cpu.cycles + this.currentBlock.pulseLength;
        console.log(`  Starting PURE_TONE: ${this.currentBlock.pulseCount} pulses of ${this.currentBlock.pulseLength} T-states`);
        break;

      case this.BLOCK_PULSE_SEQUENCE:
        this.state = 'PULSE_SEQUENCE';
        this.pulseIndex = 0;
        this.pulseSequence = this.currentBlock.pulses;
        this.nextEdgeCycle = this.cpu.cycles + this.pulseSequence[0];
        console.log(`  Starting PULSE_SEQUENCE: ${this.pulseSequence.length} pulses`);
        break;

      case this.BLOCK_PURE_DATA:
        this.state = 'DATA';
        this.bitPosition = 0;
        this.bytePosition = 0;
        this.pulseCount = 0;
        if (this.currentBlock.data && this.currentBlock.data.length > 0) {
          this.currentBit = (this.currentBlock.data[0] >> 7) & 1;
          const pulseLength = this.currentBit ? this.currentBlock.onePulse : this.currentBlock.zeroPulse;
          this.nextEdgeCycle = this.cpu.cycles + pulseLength;
          console.log(`  Starting PURE_DATA: ${this.currentBlock.data.length} bytes`);
        } else {
          this.handleBlockEnd();
        }
        break;

      case this.BLOCK_DIRECT_RECORDING:
        this.state = 'DIRECT_RECORDING';
        this.bitPosition = 0;
        this.bytePosition = 0;
        this.nextEdgeCycle = this.cpu.cycles + this.currentBlock.tStatesPerSample;
        console.log(`  Starting DIRECT_RECORDING: ${this.currentBlock.data.length} bytes at ${this.currentBlock.tStatesPerSample} T-states/sample`);
        break;

      case this.BLOCK_PAUSE:
        this.state = 'PAUSE';
        this.pauseCycles = this.currentBlock.pause * this.CYCLES_PER_MS;
        console.log(`  Starting PAUSE state for ${this.currentBlock.pause}ms`);
        if (this.currentBlock.pause === 0) {
          console.log('Stop the tape command encountered');
          this.stop();
        }
        break;

      case this.BLOCK_LOOP_START:
        if (!this.loopStack) this.loopStack = [];
        this.loopStack.push({
          blockIndex: this.blockIndex - 1,
          counter: this.currentBlock.repetitions
        });
        console.log(`  Loop start: ${this.currentBlock.repetitions} repetitions`);
        this.nextBlock(); // Move to next block immediately
        break;

      case this.BLOCK_LOOP_END:
        if (this.loopStack && this.loopStack.length > 0) {
          const loop = this.loopStack[this.loopStack.length - 1];
          loop.counter--;
          if (loop.counter > 0) {
            console.log(`  Loop end: ${loop.counter} repetitions remaining, jumping back to block ${loop.blockIndex + 1}`);
            this.blockIndex = loop.blockIndex + 1;
          } else {
            console.log(`  Loop end: complete`);
            this.loopStack.pop();
          }
        }
        this.nextBlock(); // Move to next block immediately
        break;

      case this.BLOCK_JUMP:
        console.log(`  Jump: offset ${this.currentBlock.jumpOffset}`);
        this.blockIndex += this.currentBlock.jumpOffset;
        this.nextBlock(); // Move to next block immediately
        break;

      case this.BLOCK_STOP_TAPE_48K:
        console.log('  Stop tape (48K mode)');
        this.stop();
        break;

      default:
        console.warn(`Unsupported block type for playback: 0x${this.currentBlock.type.toString(16).padStart(2, '0')}`);
        this.nextBlock();
    }
  }

  /**
   * Update tape playback
   * @param {number} cycles - Current CPU cycle count
   * @returns {number} - Current tape input bit (0 or 1)
   */
  update(cycles) {
    if (!this.playing || this.paused || !this.currentBlock) {
      return this.lastEarBit;
    }

    // Debug logging for first few calls
    if (!this._updateCallCount) this._updateCallCount = 0;
    this._updateCallCount++;
    if (this._updateCallCount <= 5) {
      console.log(`Tape.update(${cycles}): state=${this.state}, nextEdge=${this.nextEdgeCycle}, lastEar=${this.lastEarBit}`);
    }

    // Handle pause state
    if (this.state === 'PAUSE') {
      this.updatePauseState(cycles);
      this.lastUpdateCycle = cycles;
      return this.lastEarBit;
    }

    // Update based on current block type
    if (this.currentBlock.type === this.BLOCK_STANDARD || this.currentBlock.type === this.BLOCK_TURBO) {
      this.updateDataBlock(cycles);
    } else if (this.currentBlock.type === this.BLOCK_PAUSE) {
      this.updatePauseState(cycles);
    }

    this.lastUpdateCycle = cycles;
    return this.lastEarBit;
  }

  /**
   * Update standard/turbo data block
   */
  updateDataBlock(cycles) {
    const block = this.currentBlock;

    // Process all edges that should have occurred up to this cycle
    while (cycles >= this.nextEdgeCycle && this.state !== 'PAUSE' && this.state !== 'IDLE') {
      // Toggle EAR bit
      this.lastEarBit = 1 - this.lastEarBit;

      // Handle different block types
      if (block.type === this.BLOCK_PURE_TONE) {
        this.processPureTone(cycles, block);
      } else if (block.type === this.BLOCK_PULSE_SEQUENCE) {
        this.processPulseSequence(cycles, block);
      } else if (block.type === this.BLOCK_PURE_DATA) {
        this.processPureData(cycles, block);
      } else if (block.type === this.BLOCK_DIRECT_RECORDING) {
        this.processDirectRecording(cycles, block);
      } else {
        // Standard and turbo blocks
        this.processEdge(cycles, block);
      }
    }
  }

  /**
   * Process a single edge
   */
  processEdge(cycles, block) {
    switch (this.state) {
      case 'PILOT':
        // Generate pilot tone
        this.nextEdgeCycle += block.pilotPulse;
        this.edgeCount++;

        // Each pulse consists of 2 edges
        if (this.edgeCount >= block.pilotPulses * 2) {
          console.log(`Pilot complete after ${this.edgeCount} edges`);
          this.state = 'SYNC1';
          this.nextEdgeCycle = cycles + block.sync1Pulse;
        }
        break;

      case 'SYNC1':
        // First sync pulse
        this.state = 'SYNC2';
        this.nextEdgeCycle = cycles + block.sync2Pulse;
        break;

      case 'SYNC2':
        // Second sync pulse - prepare for data
        this.state = 'DATA';
        this.bytePosition = 0;
        this.bitPosition = 0;
        this.pulseCount = 0;

        // Start with first bit
        if (block.data && block.data.length > 0) {
          this.currentBit = (block.data[0] >> 7) & 1;
          const pulseLength = this.currentBit ? block.onePulse : block.zeroPulse;
          this.nextEdgeCycle = cycles + pulseLength;
          console.log(`Starting DATA state: ${block.data.length} bytes, first bit=${this.currentBit}`);
        } else {
          // No data, move to next block
          console.log('No data in block, moving to next');
          this.handleBlockEnd();
        }
        break;

      case 'DATA':
        // Output data bits
        this.pulseCount++;

        // Each bit consists of 2 pulses (4 edges)
        if (this.pulseCount < 2) {
          // Same bit, next pulse
          const pulseLength = this.currentBit ? block.onePulse : block.zeroPulse;
          this.nextEdgeCycle = cycles + pulseLength;
        } else {
          // Move to next bit
          this.pulseCount = 0;
          this.bitPosition++;

          if (this.bitPosition >= 8) {
            // Move to next byte
            this.bitPosition = 0;
            this.bytePosition++;

            if (this.bytePosition >= block.data.length) {
              // All data sent
              this.handleBlockEnd();
              return;
            }
          }

          // Check if this is the last byte and we have limited bits
          const isLastByte = (this.bytePosition === block.data.length - 1);
          const bitsInByte = isLastByte ? block.usedBits : 8;

          if (this.bitPosition < bitsInByte) {
            // Get next bit
            const byte = block.data[this.bytePosition];
            this.currentBit = (byte >> (7 - this.bitPosition)) & 1;
            const pulseLength = this.currentBit ? block.onePulse : block.zeroPulse;
            this.nextEdgeCycle = cycles + pulseLength;
          } else {
            // No more bits in last byte
            this.handleBlockEnd();
          }
        }
        break;
    }
  }

  /**
   * Process pure tone block
   */
  processPureTone(cycles, block) {
    this.edgeCount++;
    this.nextEdgeCycle += block.pulseLength;

    if (this.edgeCount >= block.pulseCount * 2) {
      console.log(`Pure tone complete: ${this.edgeCount / 2} pulses`);
      this.handleBlockEnd();
    }
  }

  /**
   * Process pulse sequence block
   */
  processPulseSequence(cycles, block) {
    this.pulseIndex++;

    if (this.pulseIndex >= this.pulseSequence.length) {
      console.log(`Pulse sequence complete: ${this.pulseSequence.length} pulses`);
      this.handleBlockEnd();
    } else {
      this.nextEdgeCycle = cycles + this.pulseSequence[this.pulseIndex];
    }
  }

  /**
   * Process pure data block (data without pilot or sync)
   */
  processPureData(cycles, block) {
    // Similar to DATA state processing
    this.pulseCount++;

    // Each bit consists of 2 pulses
    if (this.pulseCount < 2) {
      const pulseLength = this.currentBit ? block.onePulse : block.zeroPulse;
      this.nextEdgeCycle = cycles + pulseLength;
    } else {
      this.pulseCount = 0;
      this.bitPosition++;

      if (this.bitPosition >= 8) {
        this.bitPosition = 0;
        this.bytePosition++;

        if (this.bytePosition >= block.data.length) {
          console.log(`Pure data complete: ${this.bytePosition} bytes`);
          this.handleBlockEnd();
          return;
        }
      }

      const isLastByte = (this.bytePosition === block.data.length - 1);
      const bitsInByte = isLastByte ? block.usedBits : 8;

      if (this.bitPosition < bitsInByte) {
        const byte = block.data[this.bytePosition];
        this.currentBit = (byte >> (7 - this.bitPosition)) & 1;
        const pulseLength = this.currentBit ? block.onePulse : block.zeroPulse;
        this.nextEdgeCycle = cycles + pulseLength;
      } else {
        console.log(`Pure data complete: ${this.bytePosition} bytes`);
        this.handleBlockEnd();
      }
    }
  }

  /**
   * Process direct recording block
   */
  processDirectRecording(cycles, block) {
    // Get current bit from data
    const byteIndex = Math.floor(this.bitPosition / 8);
    const bitInByte = 7 - (this.bitPosition % 8);

    if (byteIndex >= block.data.length) {
      console.log(`Direct recording complete: ${byteIndex} bytes`);
      this.handleBlockEnd();
      return;
    }

    const byte = block.data[byteIndex];
    this.lastEarBit = (byte >> bitInByte) & 1;

    this.bitPosition++;
    const isLastByte = (byteIndex === block.data.length - 1);
    const totalBits = isLastByte ?
      ((block.data.length - 1) * 8 + block.usedBits) :
      (block.data.length * 8);

    if (this.bitPosition >= totalBits) {
      console.log(`Direct recording complete: ${byteIndex + 1} bytes`);
      this.handleBlockEnd();
    } else {
      this.nextEdgeCycle = cycles + block.tStatesPerSample;
    }
  }

  /**
   * Update pause state
   */
  updatePauseState(cycles) {
    if (!this._pauseLogCount) this._pauseLogCount = 0;

    if (this.pauseCycles > 0) {
      const elapsed = cycles - this.lastUpdateCycle;
      this.pauseCycles -= elapsed;

      // During pause, keep EAR bit low (0)
      this.lastEarBit = 0;

      if (this._pauseLogCount < 3) {
        console.log(`updatePauseState: cycles=${cycles}, elapsed=${elapsed}, pauseCycles remaining=${this.pauseCycles}`);
        this._pauseLogCount++;
      }

      if (this.pauseCycles <= 0) {
        console.log(`Pause complete, moving to next block`);
        this.pauseCycles = 0;
        this.state = 'IDLE';
        this.nextBlock();
      }
    } else {
      // No pause cycles, move to next block immediately
      console.log('No pause cycles remaining, moving to next block');
      this.state = 'IDLE';
      this.nextBlock();
    }
  }

  /**
   * Handle end of current block
   */
  handleBlockEnd() {
    const block = this.currentBlock;

    console.log(`Block ${this.blockIndex - 1} complete: ${this.bytePosition} bytes sent`);

    // Check if there's a pause after this block
    if (block.pause && block.pause > 0) {
      this.state = 'PAUSE';
      this.pauseCycles = block.pause * this.CYCLES_PER_MS;
      // Set nextEdgeCycle to infinity so we don't process edges during pause
      this.nextEdgeCycle = Infinity;
      console.log(`Entering PAUSE state for ${block.pause}ms (${this.pauseCycles} cycles)`);
    } else {
      // Move to next block immediately
      console.log('No pause, moving to next block immediately');
      this.nextBlock();
    }
  }

  /**
   * Get current EAR bit for tape input
   * @returns {number} Current EAR bit (0 or 1)
   */
  getEarBit() {
    return this.lastEarBit;
  }

  /**
   * Get tape status
   */
  getStatus() {
    const currentBlockNum = Math.max(0, this.blockIndex - 1);
    return {
      loaded: this.blocks.length > 0,
      playing: this.playing,
      format: this.format,
      totalBlocks: this.blocks.length,
      currentBlock: currentBlockNum,
      position: this.bytePosition,
      blockSize: this.currentBlock && this.currentBlock.data ? this.currentBlock.data.length : 0,
      state: this.state
    };
  }
}
