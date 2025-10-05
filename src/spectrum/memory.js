/**
 * ZX Spectrum 48K memory system
 * 64KB address space:
 * 0x0000-0x3FFF: 16KB ROM
 * 0x4000-0x5AFF: 6KB Screen memory (pixels)
 * 0x5800-0x5AFF: 768 bytes Attributes
 * 0x5B00-0xFFFF: Remaining RAM
 */
export class Memory {
  constructor() {
    this.rom = new Uint8Array(16384); // 16KB ROM
    this.ram = new Uint8Array(49152); // 48KB RAM
    this.romLoaded = false;
    this.ula = null; // Reference to ULA for contention

    // Memory contention table for screen memory access
    // During ULA fetch (scanlines 64-255, specific T-states), add delay
    // Contention pattern repeats every 8 T-states: [6,5,4,3,2,1,0,0]
    this.contentionPattern = [6, 5, 4, 3, 2, 1, 0, 0];
  }

  /**
   * Load ROM data
   */
  loadROM(data) {
    if (data instanceof ArrayBuffer) {
      data = new Uint8Array(data);
    }

    if (data.length !== 16384) {
      throw new Error(`Invalid ROM size: ${data.length} (expected 16384)`);
    }

    this.rom.set(data);
    this.romLoaded = true;
  }

  /**
   * Reset RAM to initial state
   */
  reset() {
    this.ram.fill(0);
  }

  /**
   * Set ULA reference for contention
   */
  setULA(ula) {
    this.ula = ula;
  }

  /**
   * Calculate memory contention delay for screen memory access
   * Per spec: contention occurs when accessing 0x4000-0x7FFF during display fetch
   * Returns number of T-states to add
   */
  getContentionDelay(addr) {
    // No contention if ULA not set or address outside contended range
    if (!this.ula || addr < 0x4000 || addr >= 0x8000) {
      return 0;
    }

    const scanline = this.ula.getCurrentScanline();
    const tstate = this.ula.scanlineTStates;

    // Contention only occurs during active display (scanlines 64-255)
    if (scanline < 64 || scanline >= 256) {
      return 0;
    }

    // Contention occurs during first 128 T-states of scanline (ULA fetch period)
    // Pattern repeats every 8 T-states
    if (tstate < 128) {
      const index = tstate % 8;
      return this.contentionPattern[index];
    }

    return 0;
  }

  /**
   * Read byte from memory
   * Returns {value, contentionDelay}
   */
  read(addr) {
    addr &= 0xffff;

    const delay = this.getContentionDelay(addr);

    if (addr < 0x4000) {
      return this.rom[addr];
    }

    return this.ram[addr - 0x4000];
  }

  /**
   * Read byte from memory with contention delay
   * Returns {value, delay} for CPU to handle
   */
  readWithContention(addr) {
    addr &= 0xffff;
    const delay = this.getContentionDelay(addr);
    const value = addr < 0x4000 ? this.rom[addr] : this.ram[addr - 0x4000];
    return {value, delay};
  }

  /**
   * Write byte to memory (ROM writes are ignored)
   */
  write(addr, value) {
    addr &= 0xffff;
    value &= 0xff;

    if (addr < 0x4000) {
      // ROM area - writes ignored
      return;
    }

    this.ram[addr - 0x4000] = value;
  }

  /**
   * Write byte to memory with contention delay
   * Returns contention delay for CPU to handle
   */
  writeWithContention(addr, value) {
    addr &= 0xffff;
    value &= 0xff;

    const delay = this.getContentionDelay(addr);

    if (addr >= 0x4000) {
      this.ram[addr - 0x4000] = value;
    }

    return delay;
  }

  /**
   * Get screen pixel data (0x4000-0x57FF)
   */
  getScreenPixels() {
    return this.ram.subarray(0, 6144);
  }

  /**
   * Get screen attributes (0x5800-0x5AFF)
   */
  getScreenAttributes() {
    return this.ram.subarray(6144, 6912);
  }

  /**
   * Get full RAM for snapshot save
   */
  getRAM() {
    return this.ram;
  }

  /**
   * Set full RAM for snapshot load
   */
  setRAM(data) {
    if (data.length !== 49152) {
      throw new Error(`Invalid RAM size: ${data.length} (expected 49152)`);
    }
    this.ram.set(data);
  }
}
