/**
 * Z80 Instruction Decoder
 * Decodes and executes Z80 instructions with proper timing
 */
import { instructionTable } from '../instructions/base.js';
import { cbInstructionTable } from '../instructions/bit.js';
import { edInstructionTable } from '../instructions/extended.js';
import { ddInstructionTable, ddcbInstructionTable } from '../instructions/ix.js';
import { fdInstructionTable, fdcbInstructionTable } from '../instructions/iy.js';

export class InstructionDecoder {
  constructor(cpu) {
    this.cpu = cpu;
    this.debugMode = false;
    this.traceLog = [];
    this.maxTraceLength = 2000; // Keep last 2000 instructions
    this.instructionCount = 0;
    this.breakOnPC = null; // Set this to break on specific PC
    this.ramInitCount = 0;
    this.callStack = [];
  }

  /**
   * Enable/disable debug mode
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    if (!enabled) {
      this.traceLog = [];
    }
  }

  /**
   * Get trace log
   */
  getTraceLog() {
    return this.traceLog;
  }

  /**
   * Clear trace log
   */
  clearTrace() {
    this.traceLog = [];
    this.instructionCount = 0;
  }

  /**
   * Get opcode name for debugging
   */
  getOpcodeName(opcode, prefix = '') {
    const names = {
      0x00: 'NOP', 0x01: 'LD BC,nn', 0x02: 'LD (BC),A', 0x03: 'INC BC', 0x04: 'INC B',
      0x05: 'DEC B', 0x06: 'LD B,n', 0x07: 'RLCA', 0x08: 'EX AF,AF\'', 0x09: 'ADD HL,BC',
      0x0A: 'LD A,(BC)', 0x0B: 'DEC BC', 0x0C: 'INC C', 0x0D: 'DEC C', 0x0E: 'LD C,n',
      0x0F: 'RRCA', 0x10: 'DJNZ', 0x11: 'LD DE,nn', 0x12: 'LD (DE),A', 0x13: 'INC DE',
      0x14: 'INC D', 0x15: 'DEC D', 0x16: 'LD D,n', 0x17: 'RLA', 0x18: 'JR', 0x19: 'ADD HL,DE',
      0x1A: 'LD A,(DE)', 0x1B: 'DEC DE', 0x1C: 'INC E', 0x1D: 'DEC E', 0x1E: 'LD E,n',
      0x1F: 'RRA', 0x20: 'JR NZ', 0x21: 'LD HL,nn', 0x22: 'LD (nn),HL', 0x23: 'INC HL',
      0x2B: 'DEC HL', 0x28: 'JR Z', 0x30: 'JR NC', 0x35: 'DEC (HL)', 0x36: 'LD (HL),n',
      0xA7: 'AND A', 0xC1: 'POP BC', 0xC3: 'JP nn', 0xC5: 'PUSH BC', 0xC9: 'RET',
      0xCD: 'CALL nn', 0xD9: 'EXX', 0xED: 'ED prefix', 0xF3: 'DI', 0xFB: 'EI'
    };
    return names[opcode] || `0x${opcode.toString(16).toUpperCase().padStart(2, '0')}`;
  }

  /**
   * Log instruction execution
   */
  logInstruction(pc, opcode, prefix = '') {
    if (!this.debugMode) return;

    // Log when PC jumps outside the loop (detect exit from 11E2-11ED)
    const lastPC = this.traceLog.length > 0 ? this.traceLog[this.traceLog.length - 1].pc : null;
    if (lastPC >= 0x11E2 && lastPC <= 0x11ED && (pc < 0x11E2 || pc > 0x11ED)) {
      console.log(`🔵 EXITED LOOP at instruction ${this.instructionCount}: PC jumped from ${lastPC.toString(16).toUpperCase()} to ${pc.toString(16).toUpperCase()}`);
      console.log(`   Registers: HL=${this.cpu.getHL().toString(16).toUpperCase()} DE=${this.cpu.getDE().toString(16).toUpperCase()} BC=${this.cpu.getBC().toString(16).toUpperCase()}`);
      this.watchAfterLoop = 250; // Watch next 250 instructions
    }

    // Watch instructions after loop exit
    if (this.watchAfterLoop > 0) {
      this.watchAfterLoop--;
      const opcodeName = this.getOpcodeName(opcode, prefix);
      // Only log non-LDDR instructions or first/last few LDDR iterations
      const isLDDR = (pc === 0x120A);
      const iteration = 250 - this.watchAfterLoop;
      if (!isLDDR || iteration <= 15 || this.cpu.getBC() <= 0x0005) {
        console.log(`  [${iteration}] ${pc.toString(16).toUpperCase().padStart(4, '0')}: ${opcodeName} | BC=${this.cpu.getBC().toString(16).padStart(4,'0')} HL=${this.cpu.getHL().toString(16).padStart(4,'0')} DE=${this.cpu.getDE().toString(16).padStart(4,'0')} SP=${this.cpu.sp.toString(16).padStart(4,'0')}`);
      } else if (isLDDR && iteration === 16) {
        console.log(`  [...LDDR continues...]`);
      }
    }

    // Detect if PC went to 0 (reset/crash)
    if (pc === 0 && lastPC !== null && lastPC !== 0xFFFF) {
      console.log(`🔴 RESET DETECTED at instruction ${this.instructionCount}: PC jumped from ${lastPC.toString(16).toUpperCase()} to 0000`);
    }

    // Track CALL/RET
    if (opcode === 0xCD || (opcode >= 0xC4 && opcode <= 0xDC && (opcode & 0x07) === 0x04)) {
      // CALL instruction
      const callTarget = this.cpu.readMem((pc + 1) & 0xFFFF) | (this.cpu.readMem((pc + 2) & 0xFFFF) << 8);
      this.callStack.push({ from: pc, to: callTarget, returnAddr: (pc + 3) & 0xFFFF });
      if (this.callStack.length > 100) this.callStack.shift();
    } else if (opcode === 0xC9 || (opcode >= 0xC0 && opcode <= 0xD8 && (opcode & 0x07) === 0x00)) {
      // RET instruction
      if (this.callStack.length > 0) this.callStack.pop();
    }

    // Detect suspicious PC jumps to high memory (likely wrong)
    if (pc >= 0xFF00 && lastPC !== null && lastPC < 0xFF00) {
      console.warn(`⚠️  SUSPICIOUS JUMP to high memory at instruction ${this.instructionCount}: PC jumped from ${lastPC.toString(16).toUpperCase()} to ${pc.toString(16).toUpperCase()}`);
      console.log(`   Registers: HL=${this.cpu.getHL().toString(16)} DE=${this.cpu.getDE().toString(16)} BC=${this.cpu.getBC().toString(16)} SP=${this.cpu.sp.toString(16)}`);
      console.log(`   Recent call stack (last 10 calls):`);
      const recentCalls = this.callStack.slice(-10);
      recentCalls.forEach((call, i) => {
        console.log(`     [${i}] CALL from ${call.from.toString(16).padStart(4,'0')} to ${call.to.toString(16).padStart(4,'0')} (return: ${call.returnAddr.toString(16).padStart(4,'0')})`);
      });
    }

    // Detect jumps to reset vectors
    if (pc >= 0x0000 && pc <= 0x0010 && lastPC !== null && lastPC > 0x0010) {
      console.warn(`⚠️  JUMPED TO RESET VECTOR at instruction ${this.instructionCount}: PC jumped from ${lastPC.toString(16).toUpperCase()} to ${pc.toString(16).toUpperCase()}`);
    }

    // Detect if entering ROM initialization again
    if (pc === 0x11CB) {
      this.ramInitCount++;
      console.log(`⚠️  BACK TO RAM INIT #${this.ramInitCount} at instruction ${this.instructionCount}: PC=${pc.toString(16).toUpperCase()}`);
      if (this.ramInitCount === 3) {
        console.error(`🔴 STUCK IN RAM INIT LOOP! Reinitializing ${this.ramInitCount} times.`);
        console.log('Last 30 instructions in trace log:');
        const last30 = this.traceLog.slice(-30);
        last30.forEach((entry, i) => {
          const pcStr = entry.pc.toString(16).toUpperCase().padStart(4,'0');
          const opStr = entry.opcode.toString(16).toUpperCase().padStart(2,'0');
          const hlStr = entry.hl.toString(16).toUpperCase().padStart(4,'0');
          const bcStr = entry.bc.toString(16).toUpperCase().padStart(4,'0');
          const spStr = entry.sp.toString(16).toUpperCase().padStart(4,'0');
          console.log(`  [${i}] ${pcStr}: ${opStr} | BC=${bcStr} HL=${hlStr} SP=${spStr}`);
        });

        // Check what instruction is at 127C
        console.log('\nAnalyzing instruction at 127C and after:');
        const rom127C = this.cpu.readMem(0x127C);
        const rom127D = this.cpu.readMem(0x127D);
        const rom127E = this.cpu.readMem(0x127E);
        const rom127F = this.cpu.readMem(0x127F);
        const rom1280 = this.cpu.readMem(0x1280);
        console.log(`127C: ${rom127C.toString(16).padStart(2,'0')}`);
        console.log(`127D: ${rom127D.toString(16).padStart(2,'0')}`);
        console.log(`127E: ${rom127E.toString(16).padStart(2,'0')}`);
        console.log(`127F: ${rom127F.toString(16).padStart(2,'0')}`);
        console.log(`1280: ${rom1280.toString(16).padStart(2,'0')}`);
      }
    }

    if (pc === 0x11DA) {
      console.log(`   -> RAM-READ at ${pc.toString(16).toUpperCase()}`);
    }

    const entry = {
      count: this.instructionCount++,
      pc: pc,
      opcode: opcode,
      prefix: prefix,
      af: (this.cpu.a << 8) | this.cpu.f,
      bc: this.cpu.getBC(),
      de: this.cpu.getDE(),
      hl: this.cpu.getHL(),
      sp: this.cpu.sp,
      ix: this.cpu.ix,
      iy: this.cpu.iy,
      tstates: this.cpu.tstates
    };

    // Add memory at (HL) for certain opcodes that use it
    if ([0x34, 0x35, 0x36, 0x46, 0x4E, 0x56, 0x5E, 0x66, 0x6E, 0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x77, 0x7E, 0x86, 0xBE].includes(opcode)) {
      entry.memHL = this.cpu.readMem(this.cpu.getHL());
    }

    this.traceLog.push(entry);

    // Keep only last N instructions
    if (this.traceLog.length > this.maxTraceLength) {
      this.traceLog.shift();
    }
  }

  /**
   * Fetch next byte from PC and increment
   */
  fetchByte() {
    const byte = this.cpu.readMem(this.cpu.pc);
    this.cpu.pc = (this.cpu.pc + 1) & 0xffff;
    this.cpu.incR();
    return byte;
  }

  /**
   * Fetch next word from PC
   */
  fetchWord() {
    const low = this.fetchByte();
    const high = this.fetchByte();
    return (high << 8) | low;
  }

  /**
   * Execute one instruction
   * @returns {number} T-states consumed
   */
  executeInstruction() {
    const startTStates = this.cpu.tstates;

    if (this.cpu.halted) {
      this.cpu.tstates += 4;
      return 4;
    }

    const pc = this.cpu.pc;
    const opcode = this.fetchByte();

    // Log before execution
    this.logInstruction(pc, opcode);

    this.executeOpcode(opcode, instructionTable);

    // Handle delayed interrupt enable from EI instruction
    // Must be done AFTER executing the instruction following EI
    if (this.cpu.enableInterruptsPending) {
      this.cpu.iff1 = this.cpu.iff2 = true;
      this.cpu.enableInterruptsPending = false;
    }

    return this.cpu.tstates - startTStates;
  }

  /**
   * Execute opcode from instruction table
   */
  executeOpcode(opcode, table) {
    const instruction = table[opcode];

    if (!instruction) {
      throw new Error(`Unknown opcode: 0x${opcode.toString(16).padStart(2, '0')}`);
    }

    instruction.execute(this.cpu, this);
  }

  /**
   * Handle CB prefix (bit operations)
   */
  executeCB() {
    const opcode = this.fetchByte();
    this.executeOpcode(opcode, cbInstructionTable);
  }

  /**
   * Handle ED prefix (extended instructions)
   */
  executeED() {
    const opcode = this.fetchByte();
    const instruction = edInstructionTable[opcode];

    if (!instruction) {
      // Treat as NOP for undefined ED opcodes
      this.cpu.tstates += 8;
      return;
    }

    instruction.execute(this.cpu, this);
  }

  /**
   * Handle DD prefix (IX instructions)
   */
  executeDD() {
    const opcode = this.fetchByte();

    // DD CB prefix
    if (opcode === 0xcb) {
      const offset = this.fetchByte();
      const subOpcode = this.fetchByte();
      const instruction = ddcbInstructionTable[subOpcode];

      if (instruction) {
        instruction.execute(this.cpu, this, offset);
      } else {
        this.cpu.tstates += 8;
      }
      return;
    }

    const instruction = ddInstructionTable[opcode];

    if (!instruction) {
      // Fall back to normal instruction table
      this.executeOpcode(opcode, instructionTable);
      return;
    }

    instruction.execute(this.cpu, this);
  }

  /**
   * Handle FD prefix (IY instructions)
   */
  executeFD() {
    const opcode = this.fetchByte();

    // FD CB prefix
    if (opcode === 0xcb) {
      const offset = this.fetchByte();
      const subOpcode = this.fetchByte();
      const instruction = fdcbInstructionTable[subOpcode];

      if (instruction) {
        instruction.execute(this.cpu, this, offset);
      } else {
        this.cpu.tstates += 8;
      }
      return;
    }

    const instruction = fdInstructionTable[opcode];

    if (!instruction) {
      // Fall back to normal instruction table
      this.executeOpcode(opcode, instructionTable);
      return;
    }

    instruction.execute(this.cpu, this);
  }
}
