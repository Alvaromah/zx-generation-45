/**
 * Base Z80 instruction set (non-prefixed)
 */
import { Z80CPU } from '../core/cpu.js';

// Helper to create signed byte from unsigned
const toSigned = (val) => (val & 0x80) ? val - 256 : val;

export const instructionTable = [];

// 0x00: NOP
instructionTable[0x00] = {
  execute: (cpu) => {
    cpu.tstates += 4;
  }
};

// 0x01: LD BC,nn
instructionTable[0x01] = {
  execute: (cpu, decoder) => {
    const val = decoder.fetchWord();
    cpu.setBC(val);
    cpu.tstates += 10;
  }
};

// 0x02: LD (BC),A
instructionTable[0x02] = {
  execute: (cpu) => {
    cpu.writeMem(cpu.getBC(), cpu.a);
    cpu.tstates += 7;
  }
};

// 0x03: INC BC
instructionTable[0x03] = {
  execute: (cpu) => {
    cpu.setBC((cpu.getBC() + 1) & 0xffff);
    cpu.tstates += 6;
  }
};

// 0x04: INC B
instructionTable[0x04] = {
  execute: (cpu) => {
    const result = (cpu.b + 1) & 0xff;
    const overflow = cpu.b === 0x7f;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, (cpu.b & 0x0f) === 0x0f);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.b = result;
    cpu.tstates += 4;
  }
};

// 0x05: DEC B
instructionTable[0x05] = {
  execute: (cpu) => {
    const result = (cpu.b - 1) & 0xff;
    const overflow = cpu.b === 0x80;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, (cpu.b & 0x0f) === 0);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, true);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.b = result;
    cpu.tstates += 4;
  }
};

// 0x06: LD B,n
instructionTable[0x06] = {
  execute: (cpu, decoder) => {
    cpu.b = decoder.fetchByte();
    cpu.tstates += 7;
  }
};

// 0x07: RLCA
instructionTable[0x07] = {
  execute: (cpu) => {
    const carry = cpu.a & 0x80;
    cpu.a = ((cpu.a << 1) | (carry >> 7)) & 0xff;
    cpu.setFlag(Z80CPU.FLAG_C, carry);
    cpu.setFlag(Z80CPU.FLAG_H, false);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.tstates += 4;
  }
};

// 0x08: EX AF,AF'
instructionTable[0x08] = {
  execute: (cpu) => {
    [cpu.a, cpu.a_] = [cpu.a_, cpu.a];
    [cpu.f, cpu.f_] = [cpu.f_, cpu.f];
    cpu.tstates += 4;
  }
};

// 0x09: ADD HL,BC
instructionTable[0x09] = {
  execute: (cpu) => {
    const hl = cpu.getHL();
    const bc = cpu.getBC();
    const result = hl + bc;
    cpu.setFlag(Z80CPU.FLAG_C, result & 0x10000);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_H, ((hl & 0x0fff) + (bc & 0x0fff)) & 0x1000);
    cpu.setFlag(Z80CPU.FLAG_Y, (result >> 8) & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, (result >> 8) & 0x08);
    cpu.setHL(result & 0xffff);
    cpu.tstates += 11;
  }
};

// 0x0A: LD A,(BC)
instructionTable[0x0a] = {
  execute: (cpu) => {
    cpu.a = cpu.readMem(cpu.getBC());
    cpu.tstates += 7;
  }
};

// 0x0B: DEC BC
instructionTable[0x0b] = {
  execute: (cpu) => {
    cpu.setBC((cpu.getBC() - 1) & 0xffff);
    cpu.tstates += 6;
  }
};

// 0x0C: INC C
instructionTable[0x0c] = {
  execute: (cpu) => {
    const result = (cpu.c + 1) & 0xff;
    const overflow = cpu.c === 0x7f;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, (cpu.c & 0x0f) === 0x0f);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.c = result;
    cpu.tstates += 4;
  }
};

// 0x0D: DEC C
instructionTable[0x0d] = {
  execute: (cpu) => {
    const result = (cpu.c - 1) & 0xff;
    const overflow = cpu.c === 0x80;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, (cpu.c & 0x0f) === 0);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, true);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.c = result;
    cpu.tstates += 4;
  }
};

// 0x0E: LD C,n
instructionTable[0x0e] = {
  execute: (cpu, decoder) => {
    cpu.c = decoder.fetchByte();
    cpu.tstates += 7;
  }
};

// 0x0F: RRCA
instructionTable[0x0f] = {
  execute: (cpu) => {
    const carry = cpu.a & 0x01;
    cpu.a = ((cpu.a >> 1) | (carry << 7)) & 0xff;
    cpu.setFlag(Z80CPU.FLAG_C, carry);
    cpu.setFlag(Z80CPU.FLAG_H, false);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.tstates += 4;
  }
};

// 0x10: DJNZ d
instructionTable[0x10] = {
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    cpu.b = (cpu.b - 1) & 0xff;
    if (cpu.b !== 0) {
      cpu.pc = (cpu.pc + offset) & 0xffff;
      cpu.tstates += 13;
    } else {
      cpu.tstates += 8;
    }
  }
};

// 0x11: LD DE,nn
instructionTable[0x11] = {
  execute: (cpu, decoder) => {
    const val = decoder.fetchWord();
    cpu.setDE(val);
    cpu.tstates += 10;
  }
};

// 0x12: LD (DE),A
instructionTable[0x12] = {
  execute: (cpu) => {
    cpu.writeMem(cpu.getDE(), cpu.a);
    cpu.tstates += 7;
  }
};

// 0x13: INC DE
instructionTable[0x13] = {
  execute: (cpu) => {
    cpu.setDE((cpu.getDE() + 1) & 0xffff);
    cpu.tstates += 6;
  }
};

// 0x14-0x1F: Similar to 0x04-0x0F but for D and E registers
instructionTable[0x14] = {
  execute: (cpu) => {
    const result = (cpu.d + 1) & 0xff;
    const overflow = cpu.d === 0x7f;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, (cpu.d & 0x0f) === 0x0f);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.d = result;
    cpu.tstates += 4;
  }
};

instructionTable[0x15] = {
  execute: (cpu) => {
    const result = (cpu.d - 1) & 0xff;
    const overflow = cpu.d === 0x80;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, (cpu.d & 0x0f) === 0);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, true);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.d = result;
    cpu.tstates += 4;
  }
};

instructionTable[0x16] = {
  execute: (cpu, decoder) => {
    cpu.d = decoder.fetchByte();
    cpu.tstates += 7;
  }
};

instructionTable[0x17] = {
  execute: (cpu) => {
    const oldCarry = cpu.getFlag(Z80CPU.FLAG_C) ? 1 : 0;
    const newCarry = cpu.a & 0x80;
    cpu.a = ((cpu.a << 1) | oldCarry) & 0xff;
    cpu.setFlag(Z80CPU.FLAG_C, newCarry);
    cpu.setFlag(Z80CPU.FLAG_H, false);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.tstates += 4;
  }
};

// 0x18: JR d
instructionTable[0x18] = {
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    cpu.pc = (cpu.pc + offset) & 0xffff;
    cpu.tstates += 12;
  }
};

// 0x19: ADD HL,DE
instructionTable[0x19] = {
  execute: (cpu) => {
    const hl = cpu.getHL();
    const de = cpu.getDE();
    const result = hl + de;
    cpu.setFlag(Z80CPU.FLAG_C, result & 0x10000);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_H, ((hl & 0x0fff) + (de & 0x0fff)) & 0x1000);
    cpu.setFlag(Z80CPU.FLAG_Y, (result >> 8) & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, (result >> 8) & 0x08);
    cpu.setHL(result & 0xffff);
    cpu.tstates += 11;
  }
};

instructionTable[0x1a] = {
  execute: (cpu) => {
    cpu.a = cpu.readMem(cpu.getDE());
    cpu.tstates += 7;
  }
};

instructionTable[0x1b] = {
  execute: (cpu) => {
    cpu.setDE((cpu.getDE() - 1) & 0xffff);
    cpu.tstates += 6;
  }
};

instructionTable[0x1c] = {
  execute: (cpu) => {
    const result = (cpu.e + 1) & 0xff;
    const overflow = cpu.e === 0x7f;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, (cpu.e & 0x0f) === 0x0f);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.e = result;
    cpu.tstates += 4;
  }
};

instructionTable[0x1d] = {
  execute: (cpu) => {
    const result = (cpu.e - 1) & 0xff;
    const overflow = cpu.e === 0x80;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, (cpu.e & 0x0f) === 0);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, true);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.e = result;
    cpu.tstates += 4;
  }
};

instructionTable[0x1e] = {
  execute: (cpu, decoder) => {
    cpu.e = decoder.fetchByte();
    cpu.tstates += 7;
  }
};

instructionTable[0x1f] = {
  execute: (cpu) => {
    const oldCarry = cpu.getFlag(Z80CPU.FLAG_C) ? 0x80 : 0;
    const newCarry = cpu.a & 0x01;
    cpu.a = ((cpu.a >> 1) | oldCarry) & 0xff;
    cpu.setFlag(Z80CPU.FLAG_C, newCarry);
    cpu.setFlag(Z80CPU.FLAG_H, false);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.tstates += 4;
  }
};

// Continue with the rest of the base instruction set...
// Due to length, I'll add the most critical ones and patterns

// 0x20-0x27: JR NZ,d; LD HL,nn; LD (nn),HL; INC HL; INC H; DEC H; LD H,n; DAA
instructionTable[0x20] = {
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    if (!cpu.getFlag(Z80CPU.FLAG_Z)) {
      cpu.pc = (cpu.pc + offset) & 0xffff;
      cpu.tstates += 12;
    } else {
      cpu.tstates += 7;
    }
  }
};

instructionTable[0x21] = {
  execute: (cpu, decoder) => {
    const val = decoder.fetchWord();
    cpu.setHL(val);
    cpu.tstates += 10;
  }
};

instructionTable[0x22] = {
  execute: (cpu, decoder) => {
    const addr = decoder.fetchWord();
    cpu.writeMemWord(addr, cpu.getHL());
    cpu.tstates += 16;
  }
};

instructionTable[0x23] = {
  execute: (cpu) => {
    cpu.setHL((cpu.getHL() + 1) & 0xffff);
    cpu.tstates += 6;
  }
};

instructionTable[0x24] = {
  execute: (cpu) => {
    const result = (cpu.h + 1) & 0xff;
    const overflow = cpu.h === 0x7f;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, (cpu.h & 0x0f) === 0x0f);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.h = result;
    cpu.tstates += 4;
  }
};

instructionTable[0x25] = {
  execute: (cpu) => {
    const result = (cpu.h - 1) & 0xff;
    const overflow = cpu.h === 0x80;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, (cpu.h & 0x0f) === 0);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, true);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.h = result;
    cpu.tstates += 4;
  }
};

instructionTable[0x26] = {
  execute: (cpu, decoder) => {
    cpu.h = decoder.fetchByte();
    cpu.tstates += 7;
  }
};

// 0x27: DAA (Decimal Adjust Accumulator)
instructionTable[0x27] = {
  execute: (cpu) => {
    let a = cpu.a;
    let correction = 0;
    const nFlag = cpu.getFlag(Z80CPU.FLAG_N);
    const hFlag = cpu.getFlag(Z80CPU.FLAG_H);
    const cFlag = cpu.getFlag(Z80CPU.FLAG_C);
    let newHFlag = false;

    if (nFlag) {
      // After subtraction
      if (hFlag) {
        correction |= 0x06;
        newHFlag = (a & 0x0f) < 6;
      }
      if (cFlag) {
        correction |= 0x60;
      }
      a = (a - correction) & 0xff;
    } else {
      // After addition
      if (hFlag || (a & 0x0f) > 9) {
        correction |= 0x06;
        newHFlag = (a & 0x0f) > 9;
      }
      if (cFlag || a > 0x99) {
        correction |= 0x60;
        cpu.setFlag(Z80CPU.FLAG_C, true);
      }
      a = (a + correction) & 0xff;
    }

    cpu.setFlag(Z80CPU.FLAG_S, a & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, a === 0);
    cpu.setFlag(Z80CPU.FLAG_H, newHFlag);
    cpu.setFlag(Z80CPU.FLAG_PV, cpu.getParity(a));
    cpu.setFlag(Z80CPU.FLAG_Y, a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, a & 0x08);
    cpu.a = a;
    cpu.tstates += 4;
  }
};

// 0x28-0x2F: Conditional jumps and more
instructionTable[0x28] = {
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    if (cpu.getFlag(Z80CPU.FLAG_Z)) {
      cpu.pc = (cpu.pc + offset) & 0xffff;
      cpu.tstates += 12;
    } else {
      cpu.tstates += 7;
    }
  }
};

instructionTable[0x29] = {
  execute: (cpu) => {
    const hl = cpu.getHL();
    const result = hl + hl;
    cpu.setFlag(Z80CPU.FLAG_C, result & 0x10000);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_H, ((hl & 0x0fff) + (hl & 0x0fff)) & 0x1000);
    cpu.setFlag(Z80CPU.FLAG_Y, (result >> 8) & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, (result >> 8) & 0x08);
    cpu.setHL(result & 0xffff);
    cpu.tstates += 11;
  }
};

instructionTable[0x2a] = {
  execute: (cpu, decoder) => {
    const addr = decoder.fetchWord();
    cpu.setHL(cpu.readMemWord(addr));
    cpu.tstates += 16;
  }
};

instructionTable[0x2b] = {
  execute: (cpu) => {
    cpu.setHL((cpu.getHL() - 1) & 0xffff);
    cpu.tstates += 6;
  }
};

instructionTable[0x2c] = {
  execute: (cpu) => {
    const result = (cpu.l + 1) & 0xff;
    const overflow = cpu.l === 0x7f;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, (cpu.l & 0x0f) === 0x0f);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.l = result;
    cpu.tstates += 4;
  }
};

instructionTable[0x2d] = {
  execute: (cpu) => {
    const result = (cpu.l - 1) & 0xff;
    const overflow = cpu.l === 0x80;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, (cpu.l & 0x0f) === 0);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, true);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.l = result;
    cpu.tstates += 4;
  }
};

instructionTable[0x2e] = {
  execute: (cpu, decoder) => {
    cpu.l = decoder.fetchByte();
    cpu.tstates += 7;
  }
};

instructionTable[0x2f] = {
  execute: (cpu) => {
    cpu.a = (~cpu.a) & 0xff;
    cpu.setFlag(Z80CPU.FLAG_H, true);
    cpu.setFlag(Z80CPU.FLAG_N, true);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.tstates += 4;
  }
};

// 0x30-0x37
instructionTable[0x30] = {
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    if (!cpu.getFlag(Z80CPU.FLAG_C)) {
      cpu.pc = (cpu.pc + offset) & 0xffff;
      cpu.tstates += 12;
    } else {
      cpu.tstates += 7;
    }
  }
};

instructionTable[0x31] = {
  execute: (cpu, decoder) => {
    cpu.sp = decoder.fetchWord();
    cpu.tstates += 10;
  }
};

instructionTable[0x32] = {
  execute: (cpu, decoder) => {
    const addr = decoder.fetchWord();
    cpu.writeMem(addr, cpu.a);
    cpu.tstates += 13;
  }
};

instructionTable[0x33] = {
  execute: (cpu) => {
    cpu.sp = (cpu.sp + 1) & 0xffff;
    cpu.tstates += 6;
  }
};

instructionTable[0x34] = {
  execute: (cpu) => {
    const addr = cpu.getHL();
    const val = cpu.readMem(addr);
    const result = (val + 1) & 0xff;
    const overflow = val === 0x7f;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, (val & 0x0f) === 0x0f);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.writeMem(addr, result);
    cpu.tstates += 11;
  }
};

instructionTable[0x35] = {
  execute: (cpu) => {
    const addr = cpu.getHL();
    const val = cpu.readMem(addr);
    const result = (val - 1) & 0xff;
    const overflow = val === 0x80;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, (val & 0x0f) === 0);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, true);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.writeMem(addr, result);
    cpu.tstates += 11;
  }
};

instructionTable[0x36] = {
  execute: (cpu, decoder) => {
    const val = decoder.fetchByte();
    cpu.writeMem(cpu.getHL(), val);
    cpu.tstates += 10;
  }
};

instructionTable[0x37] = {
  execute: (cpu) => {
    cpu.setFlag(Z80CPU.FLAG_C, true);
    cpu.setFlag(Z80CPU.FLAG_H, false);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.tstates += 4;
  }
};

// 0x38-0x3F
instructionTable[0x38] = {
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    if (cpu.getFlag(Z80CPU.FLAG_C)) {
      cpu.pc = (cpu.pc + offset) & 0xffff;
      cpu.tstates += 12;
    } else {
      cpu.tstates += 7;
    }
  }
};

instructionTable[0x39] = {
  execute: (cpu) => {
    const hl = cpu.getHL();
    const sp = cpu.sp;
    const result = hl + sp;
    cpu.setFlag(Z80CPU.FLAG_C, result & 0x10000);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_H, ((hl & 0x0fff) + (sp & 0x0fff)) & 0x1000);
    cpu.setFlag(Z80CPU.FLAG_Y, (result >> 8) & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, (result >> 8) & 0x08);
    cpu.setHL(result & 0xffff);
    cpu.tstates += 11;
  }
};

instructionTable[0x3a] = {
  execute: (cpu, decoder) => {
    const addr = decoder.fetchWord();
    cpu.a = cpu.readMem(addr);
    cpu.tstates += 13;
  }
};

instructionTable[0x3b] = {
  execute: (cpu) => {
    cpu.sp = (cpu.sp - 1) & 0xffff;
    cpu.tstates += 6;
  }
};

instructionTable[0x3c] = {
  execute: (cpu) => {
    const result = (cpu.a + 1) & 0xff;
    const overflow = cpu.a === 0x7f;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, (cpu.a & 0x0f) === 0x0f);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.a = result;
    cpu.tstates += 4;
  }
};

instructionTable[0x3d] = {
  execute: (cpu) => {
    const result = (cpu.a - 1) & 0xff;
    const overflow = cpu.a === 0x80;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, (cpu.a & 0x0f) === 0);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, true);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.a = result;
    cpu.tstates += 4;
  }
};

instructionTable[0x3e] = {
  execute: (cpu, decoder) => {
    cpu.a = decoder.fetchByte();
    cpu.tstates += 7;
  }
};

instructionTable[0x3f] = {
  execute: (cpu) => {
    const oldCarry = cpu.getFlag(Z80CPU.FLAG_C);
    cpu.setFlag(Z80CPU.FLAG_H, oldCarry);
    cpu.setFlag(Z80CPU.FLAG_C, !oldCarry);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.tstates += 4;
  }
};

// LD r,r' instructions (0x40-0x7F except HALT at 0x76)
const registers = ['b', 'c', 'd', 'e', 'h', 'l', null, 'a'];

for (let dst = 0; dst < 8; dst++) {
  for (let src = 0; src < 8; src++) {
    const opcode = 0x40 + (dst * 8) + src;

    if (opcode === 0x76) continue; // HALT

    instructionTable[opcode] = {
      execute: (cpu) => {
        if (src === 6) {
          // LD r,(HL)
          cpu[registers[dst]] = cpu.readMem(cpu.getHL());
          cpu.tstates += 7;
        } else if (dst === 6) {
          // LD (HL),r
          cpu.writeMem(cpu.getHL(), cpu[registers[src]]);
          cpu.tstates += 7;
        } else {
          // LD r,r'
          cpu[registers[dst]] = cpu[registers[src]];
          cpu.tstates += 4;
        }
      }
    };
  }
}

// 0x76: HALT
instructionTable[0x76] = {
  execute: (cpu) => {
    cpu.halted = true;
    cpu.tstates += 4;
  }
};

// ALU instructions (0x80-0xBF)
const aluOps = ['add', 'adc', 'sub', 'sbc', 'and', 'xor', 'or', 'cp'];

for (let op = 0; op < 8; op++) {
  for (let reg = 0; reg < 8; reg++) {
    const opcode = 0x80 + (op * 8) + reg;
    const operation = aluOps[op];

    instructionTable[opcode] = {
      execute: (cpu) => {
        let value;
        if (reg === 6) {
          value = cpu.readMem(cpu.getHL());
          cpu.tstates += 7;
        } else {
          value = cpu[registers[reg]];
          cpu.tstates += 4;
        }

        executeALU(cpu, operation, value);
      }
    };
  }
}

// Immediate ALU instructions (0xC6, 0xCE, 0xD6, 0xDE, 0xE6, 0xEE, 0xF6, 0xFE)
for (let op = 0; op < 8; op++) {
  const opcode = 0xc6 + (op * 8);
  const operation = aluOps[op];

  instructionTable[opcode] = {
    execute: (cpu, decoder) => {
      const value = decoder.fetchByte();
      executeALU(cpu, operation, value);
      cpu.tstates += 3;
    }
  };
}

// ALU execution helper
function executeALU(cpu, operation, value) {
  let result, carry, overflow;

  switch (operation) {
    case 'add':
      result = cpu.a + value;
      carry = result;
      overflow = ((cpu.a ^ result) & (value ^ result) & 0x80) !== 0;
      cpu.a = result & 0xff;
      cpu.setFlag(Z80CPU.FLAG_N, false);
      cpu.setArithmeticFlags(cpu.a, carry, overflow);
      break;

    case 'adc':
      const oldCarry = cpu.getFlag(Z80CPU.FLAG_C) ? 1 : 0;
      result = cpu.a + value + oldCarry;
      carry = result;
      overflow = ((cpu.a ^ result) & (value ^ result) & 0x80) !== 0;
      cpu.a = result & 0xff;
      cpu.setFlag(Z80CPU.FLAG_N, false);
      cpu.setArithmeticFlags(cpu.a, carry, overflow);
      break;

    case 'sub':
      result = cpu.a - value;
      carry = result;
      overflow = ((cpu.a ^ value) & (cpu.a ^ result) & 0x80) !== 0;
      const halfBorrowSub = (cpu.a & 0x0f) < (value & 0x0f);
      cpu.a = result & 0xff;
      cpu.setFlag(Z80CPU.FLAG_N, true);
      cpu.setFlag(Z80CPU.FLAG_S, cpu.a & 0x80);
      cpu.setFlag(Z80CPU.FLAG_Z, cpu.a === 0);
      cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
      cpu.setFlag(Z80CPU.FLAG_H, halfBorrowSub);
      cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
      cpu.setFlag(Z80CPU.FLAG_PV, overflow);
      cpu.setFlag(Z80CPU.FLAG_C, carry & 0x100);
      break;

    case 'sbc':
      const oldBorrow = cpu.getFlag(Z80CPU.FLAG_C) ? 1 : 0;
      result = cpu.a - value - oldBorrow;
      carry = result;
      overflow = ((cpu.a ^ value) & (cpu.a ^ result) & 0x80) !== 0;
      const halfBorrowSbc = (cpu.a & 0x0f) < ((value & 0x0f) + oldBorrow);
      cpu.a = result & 0xff;
      cpu.setFlag(Z80CPU.FLAG_N, true);
      cpu.setFlag(Z80CPU.FLAG_S, cpu.a & 0x80);
      cpu.setFlag(Z80CPU.FLAG_Z, cpu.a === 0);
      cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
      cpu.setFlag(Z80CPU.FLAG_H, halfBorrowSbc);
      cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
      cpu.setFlag(Z80CPU.FLAG_PV, overflow);
      cpu.setFlag(Z80CPU.FLAG_C, carry & 0x100);
      break;

    case 'and':
      cpu.a &= value;
      cpu.setLogicalFlags(cpu.a);
      cpu.setFlag(Z80CPU.FLAG_H, true);
      break;

    case 'xor':
      cpu.a ^= value;
      cpu.setLogicalFlags(cpu.a);
      break;

    case 'or':
      cpu.a |= value;
      cpu.setLogicalFlags(cpu.a);
      break;

    case 'cp':
      result = cpu.a - value;
      carry = result;
      overflow = ((cpu.a ^ value) & (cpu.a ^ result) & 0x80) !== 0;
      const halfBorrowCp = (cpu.a & 0x0f) < (value & 0x0f);
      cpu.setFlag(Z80CPU.FLAG_N, true);
      cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
      cpu.setFlag(Z80CPU.FLAG_Z, (result & 0xff) === 0);
      cpu.setFlag(Z80CPU.FLAG_H, halfBorrowCp);
      cpu.setFlag(Z80CPU.FLAG_PV, overflow);
      cpu.setFlag(Z80CPU.FLAG_C, carry & 0x100);
      cpu.setFlag(Z80CPU.FLAG_Y, value & 0x20);
      cpu.setFlag(Z80CPU.FLAG_X, value & 0x08);
      break;
  }
}

// RET conditions (0xC0, 0xC8, 0xD0, 0xD8, 0xE0, 0xE8, 0xF0, 0xF8)
const conditions = [
  { flag: Z80CPU.FLAG_Z, value: false },  // NZ
  { flag: Z80CPU.FLAG_Z, value: true },   // Z
  { flag: Z80CPU.FLAG_C, value: false },  // NC
  { flag: Z80CPU.FLAG_C, value: true },   // C
  { flag: Z80CPU.FLAG_PV, value: false }, // PO
  { flag: Z80CPU.FLAG_PV, value: true },  // PE
  { flag: Z80CPU.FLAG_S, value: false },  // P
  { flag: Z80CPU.FLAG_S, value: true }    // M
];

for (let cc = 0; cc < 8; cc++) {
  // RET cc
  instructionTable[0xc0 + (cc * 8)] = {
    execute: (cpu) => {
      const condition = conditions[cc];
      if (cpu.getFlag(condition.flag) === condition.value) {
        cpu.pc = cpu.pop();
        cpu.tstates += 11;
      } else {
        cpu.tstates += 5;
      }
    }
  };

  // JP cc,nn
  instructionTable[0xc2 + (cc * 8)] = {
    execute: (cpu, decoder) => {
      const addr = decoder.fetchWord();
      const condition = conditions[cc];
      if (cpu.getFlag(condition.flag) === condition.value) {
        cpu.pc = addr;
      }
      cpu.tstates += 10;
    }
  };

  // CALL cc,nn
  instructionTable[0xc4 + (cc * 8)] = {
    execute: (cpu, decoder) => {
      const addr = decoder.fetchWord();
      const condition = conditions[cc];
      if (cpu.getFlag(condition.flag) === condition.value) {
        cpu.push(cpu.pc);
        cpu.pc = addr;
        cpu.tstates += 17;
      } else {
        cpu.tstates += 10;
      }
    }
  };
}

// PUSH/POP (0xC1, 0xC5, 0xD1, 0xD5, 0xE1, 0xE5, 0xF1, 0xF5)
const regPairs = ['bc', 'de', 'hl', 'af'];
for (let rp = 0; rp < 4; rp++) {
  // POP rp
  instructionTable[0xc1 + (rp * 16)] = {
    execute: (cpu) => {
      const value = cpu.pop();
      if (rp === 3) {
        cpu.setAF(value);
      } else if (rp === 2) {
        cpu.setHL(value);
      } else if (rp === 1) {
        cpu.setDE(value);
      } else {
        cpu.setBC(value);
      }
      cpu.tstates += 10;
    }
  };

  // PUSH rp
  instructionTable[0xc5 + (rp * 16)] = {
    execute: (cpu) => {
      let value;
      if (rp === 3) {
        value = cpu.getAF();
      } else if (rp === 2) {
        value = cpu.getHL();
      } else if (rp === 1) {
        value = cpu.getDE();
      } else {
        value = cpu.getBC();
      }
      cpu.push(value);
      cpu.tstates += 11;
    }
  };
}

// More critical instructions
instructionTable[0xc3] = { // JP nn
  execute: (cpu, decoder) => {
    cpu.pc = decoder.fetchWord();
    cpu.tstates += 10;
  }
};

instructionTable[0xc9] = { // RET
  execute: (cpu) => {
    cpu.pc = cpu.pop();
    cpu.tstates += 10;
  }
};

instructionTable[0xcb] = { // CB prefix
  execute: (cpu, decoder) => {
    decoder.executeCB();
  }
};

instructionTable[0xcd] = { // CALL nn
  execute: (cpu, decoder) => {
    const addr = decoder.fetchWord();
    cpu.push(cpu.pc);
    cpu.pc = addr;
    cpu.tstates += 17;
  }
};

// RST instructions (0xC7, 0xCF, 0xD7, 0xDF, 0xE7, 0xEF, 0xF7, 0xFF)
for (let t = 0; t < 8; t++) {
  instructionTable[0xc7 + (t * 8)] = {
    execute: (cpu) => {
      cpu.push(cpu.pc);
      cpu.pc = t * 8;
      cpu.tstates += 11;
    }
  };
}

instructionTable[0xd3] = { // OUT (n),A
  execute: (cpu, decoder) => {
    const port = decoder.fetchByte();
    cpu.portOut((cpu.a << 8) | port, cpu.a);
    cpu.tstates += 11;
  }
};

instructionTable[0xd9] = { // EXX
  execute: (cpu) => {
    [cpu.b, cpu.b_] = [cpu.b_, cpu.b];
    [cpu.c, cpu.c_] = [cpu.c_, cpu.c];
    [cpu.d, cpu.d_] = [cpu.d_, cpu.d];
    [cpu.e, cpu.e_] = [cpu.e_, cpu.e];
    [cpu.h, cpu.h_] = [cpu.h_, cpu.h];
    [cpu.l, cpu.l_] = [cpu.l_, cpu.l];
    cpu.tstates += 4;
  }
};

instructionTable[0xdb] = { // IN A,(n)
  execute: (cpu, decoder) => {
    const port = decoder.fetchByte();
    cpu.a = cpu.portIn((cpu.a << 8) | port);
    cpu.tstates += 11;
  }
};

instructionTable[0xdd] = { // DD prefix (IX)
  execute: (cpu, decoder) => {
    decoder.executeDD();
  }
};

instructionTable[0xe3] = { // EX (SP),HL
  execute: (cpu) => {
    const temp = cpu.readMemWord(cpu.sp);
    cpu.writeMemWord(cpu.sp, cpu.getHL());
    cpu.setHL(temp);
    cpu.tstates += 19;
  }
};

instructionTable[0xe9] = { // JP (HL)
  execute: (cpu) => {
    cpu.pc = cpu.getHL();
    cpu.tstates += 4;
  }
};

instructionTable[0xeb] = { // EX DE,HL
  execute: (cpu) => {
    const temp = cpu.getDE();
    cpu.setDE(cpu.getHL());
    cpu.setHL(temp);
    cpu.tstates += 4;
  }
};

instructionTable[0xed] = { // ED prefix
  execute: (cpu, decoder) => {
    decoder.executeED();
  }
};

instructionTable[0xf3] = { // DI
  execute: (cpu) => {
    cpu.iff1 = cpu.iff2 = false;
    cpu.tstates += 4;
  }
};

instructionTable[0xf9] = { // LD SP,HL
  execute: (cpu) => {
    cpu.sp = cpu.getHL();
    cpu.tstates += 6;
  }
};

instructionTable[0xfb] = { // EI
  execute: (cpu) => {
    // EI delays interrupt enable by one instruction
    cpu.enableInterruptsPending = true;
    cpu.tstates += 4;
  }
};

instructionTable[0xfd] = { // FD prefix (IY)
  execute: (cpu, decoder) => {
    decoder.executeFD();
  }
};
