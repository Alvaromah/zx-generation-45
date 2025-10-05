/**
 * Z80 CPU emulator core
 */
export class Z80CPU {
  constructor() {
    // Main register set
    this.a = 0;
    this.f = 0;
    this.b = 0;
    this.c = 0;
    this.d = 0;
    this.e = 0;
    this.h = 0;
    this.l = 0;

    // Alternate register set (for EX AF,AF' and EXX)
    this.a_ = 0;
    this.f_ = 0;
    this.b_ = 0;
    this.c_ = 0;
    this.d_ = 0;
    this.e_ = 0;
    this.h_ = 0;
    this.l_ = 0;

    // Index registers
    this.ix = 0;
    this.iy = 0;

    // Special purpose registers
    this.sp = 0; // Stack pointer
    this.pc = 0; // Program counter
    this.i = 0; // Interrupt vector
    this.r = 0; // Memory refresh

    // Interrupt flip-flops
    this.iff1 = false;
    this.iff2 = false;
    this.im = 0; // Interrupt mode (0, 1, or 2)
    this.enableInterruptsPending = false; // EI delays interrupt enable by one instruction

    // Halt state
    this.halted = false;

    // T-state counter
    this.tstates = 0;

    // Memory and I/O interfaces
    this.memory = null;
    this.io = null;
  }

  /**
   * Alias for tstates (for compatibility)
   */
  get cycles() {
    return this.tstates;
  }

  set cycles(value) {
    this.tstates = value;
  }

  /**
   * Reset CPU to initial state
   */
  reset() {
    this.a = this.f = 0;
    this.b = this.c = 0;
    this.d = this.e = 0;
    this.h = this.l = 0;
    this.a_ = this.f_ = 0;
    this.b_ = this.c_ = 0;
    this.d_ = this.e_ = 0;
    this.h_ = this.l_ = 0;
    this.ix = this.iy = 0;
    this.sp = 0xffff;
    this.pc = 0;
    this.i = 0;
    this.r = 0;
    this.iff1 = this.iff2 = false;
    this.im = 0;
    this.enableInterruptsPending = false;
    this.halted = false;
    this.tstates = 0;
  }

  /**
   * Get 16-bit register pairs
   */
  getAF() { return (this.a << 8) | this.f; }
  getBC() { return (this.b << 8) | this.c; }
  getDE() { return (this.d << 8) | this.e; }
  getHL() { return (this.h << 8) | this.l; }

  /**
   * Set 16-bit register pairs
   */
  setAF(val) { this.a = (val >> 8) & 0xff; this.f = val & 0xff; }
  setBC(val) { this.b = (val >> 8) & 0xff; this.c = val & 0xff; }
  setDE(val) { this.d = (val >> 8) & 0xff; this.e = val & 0xff; }
  setHL(val) { this.h = (val >> 8) & 0xff; this.l = val & 0xff; }

  /**
   * Undocumented: Access high and low bytes of IX and IY separately
   * Used by many ZX Spectrum games including Manic Miner
   */
  getIXH() { return (this.ix >> 8) & 0xff; }
  getIXL() { return this.ix & 0xff; }
  setIXH(val) { this.ix = ((val & 0xff) << 8) | (this.ix & 0xff); }
  setIXL(val) { this.ix = (this.ix & 0xff00) | (val & 0xff); }

  getIYH() { return (this.iy >> 8) & 0xff; }
  getIYL() { return this.iy & 0xff; }
  setIYH(val) { this.iy = ((val & 0xff) << 8) | (this.iy & 0xff); }
  setIYL(val) { this.iy = (this.iy & 0xff00) | (val & 0xff); }

  /**
   * Flag accessors (bit positions in F register)
   * S(7) Z(6) Y(5) H(4) X(3) P/V(2) N(1) C(0)
   */
  getFlag(flag) {
    return (this.f & flag) !== 0;
  }

  setFlag(flag, value) {
    if (value) {
      this.f |= flag;
    } else {
      this.f &= ~flag;
    }
  }

  // Flag constants
  static FLAG_C = 0x01; // Carry
  static FLAG_N = 0x02; // Add/Subtract
  static FLAG_PV = 0x04; // Parity/Overflow
  static FLAG_X = 0x08; // Undocumented
  static FLAG_H = 0x10; // Half carry
  static FLAG_Y = 0x20; // Undocumented
  static FLAG_Z = 0x40; // Zero
  static FLAG_S = 0x80; // Sign

  /**
   * Memory access helpers
   */
  readMem(addr) {
    return this.memory ? this.memory.read(addr & 0xffff) : 0;
  }

  writeMem(addr, val) {
    if (this.memory) {
      this.memory.write(addr & 0xffff, val & 0xff);
    }
  }

  readMemWord(addr) {
    const low = this.readMem(addr);
    const high = this.readMem((addr + 1) & 0xffff);
    return (high << 8) | low;
  }

  writeMemWord(addr, val) {
    this.writeMem(addr, val & 0xff);
    this.writeMem((addr + 1) & 0xffff, (val >> 8) & 0xff);
  }

  /**
   * Stack operations
   */
  push(val) {
    this.sp = (this.sp - 1) & 0xffff;
    this.writeMem(this.sp, (val >> 8) & 0xff);
    this.sp = (this.sp - 1) & 0xffff;
    this.writeMem(this.sp, val & 0xff);
  }

  pop() {
    const low = this.readMem(this.sp);
    this.sp = (this.sp + 1) & 0xffff;
    const high = this.readMem(this.sp);
    this.sp = (this.sp + 1) & 0xffff;
    return (high << 8) | low;
  }

  /**
   * I/O operations
   */
  portIn(port) {
    return this.io ? this.io.read(port & 0xffff) : 0xff;
  }

  portOut(port, val) {
    if (this.io) {
      this.io.write(port & 0xffff, val & 0xff);
    }
  }

  /**
   * Increment R register (lower 7 bits only)
   */
  incR() {
    this.r = (this.r & 0x80) | ((this.r + 1) & 0x7f);
  }

  /**
   * Calculate parity flag (even parity = 1)
   */
  getParity(val) {
    let p = val;
    p ^= p >> 4;
    p ^= p >> 2;
    p ^= p >> 1;
    return (p & 1) === 0;
  }

  /**
   * Set flags after 8-bit arithmetic
   */
  setArithmeticFlags(result, carry, overflow) {
    this.setFlag(Z80CPU.FLAG_S, result & 0x80);
    this.setFlag(Z80CPU.FLAG_Z, (result & 0xff) === 0);
    this.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    this.setFlag(Z80CPU.FLAG_H, carry & 0x10);
    this.setFlag(Z80CPU.FLAG_X, result & 0x08);
    this.setFlag(Z80CPU.FLAG_PV, overflow);
    this.setFlag(Z80CPU.FLAG_C, carry & 0x100);
  }

  /**
   * Set flags after logical operations
   */
  setLogicalFlags(result) {
    this.setFlag(Z80CPU.FLAG_S, result & 0x80);
    this.setFlag(Z80CPU.FLAG_Z, (result & 0xff) === 0);
    this.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    this.setFlag(Z80CPU.FLAG_H, false);
    this.setFlag(Z80CPU.FLAG_X, result & 0x08);
    this.setFlag(Z80CPU.FLAG_PV, this.getParity(result));
    this.setFlag(Z80CPU.FLAG_N, false);
    this.setFlag(Z80CPU.FLAG_C, false);
  }

  /**
   * Execute interrupt
   */
  interrupt() {
    // Interrupts are not accepted if IFF1 is disabled
    // or if we're in the delay period after EI
    if (!this.iff1 || this.enableInterruptsPending) return;

    this.halted = false;
    this.iff1 = this.iff2 = false;

    if (this.im === 0) {
      // Mode 0: Execute instruction on data bus (RST 38h for ZX Spectrum)
      this.push(this.pc);
      this.pc = 0x0038;
      this.tstates += 13;
    } else if (this.im === 1) {
      // Mode 1: RST 38h
      this.push(this.pc);
      this.pc = 0x0038;
      this.tstates += 13;
    } else {
      // Mode 2: Vectored interrupt
      const vector = (this.i << 8) | 0xff;
      this.push(this.pc);
      this.pc = this.readMemWord(vector);
      this.tstates += 19;
    }
  }

  /**
   * Execute NMI (Non-Maskable Interrupt)
   */
  nmi() {
    this.halted = false;
    this.iff2 = this.iff1;
    this.iff1 = false;
    this.push(this.pc);
    this.pc = 0x0066;
    this.tstates += 11;
  }
}
