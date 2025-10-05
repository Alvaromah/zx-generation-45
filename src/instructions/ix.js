/**
 * DD-prefixed IX register instructions
 */
import { Z80CPU } from '../core/cpu.js';
import { cbInstructionTable } from './bit.js';

export const ddInstructionTable = [];
export const ddcbInstructionTable = [];

const toSigned = (val) => (val & 0x80) ? val - 256 : val;

// Most IX instructions mirror standard HL instructions but use IX
// 0x09: ADD IX,BC
ddInstructionTable[0x09] = {
  execute: (cpu) => {
    const bc = cpu.getBC();
    const result = cpu.ix + bc;
    cpu.setFlag(Z80CPU.FLAG_C, result & 0x10000);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_H, ((cpu.ix & 0x0fff) + (bc & 0x0fff)) & 0x1000);
    cpu.setFlag(Z80CPU.FLAG_Y, (result >> 8) & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, (result >> 8) & 0x08);
    cpu.ix = result & 0xffff;
    cpu.tstates += 15;
  }
};

ddInstructionTable[0x19] = {
  execute: (cpu) => {
    const de = cpu.getDE();
    const result = cpu.ix + de;
    cpu.setFlag(Z80CPU.FLAG_C, result & 0x10000);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_H, ((cpu.ix & 0x0fff) + (de & 0x0fff)) & 0x1000);
    cpu.setFlag(Z80CPU.FLAG_Y, (result >> 8) & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, (result >> 8) & 0x08);
    cpu.ix = result & 0xffff;
    cpu.tstates += 15;
  }
};

ddInstructionTable[0x21] = {
  execute: (cpu, decoder) => {
    cpu.ix = decoder.fetchWord();
    cpu.tstates += 14;
  }
};

ddInstructionTable[0x22] = {
  execute: (cpu, decoder) => {
    const addr = decoder.fetchWord();
    cpu.writeMemWord(addr, cpu.ix);
    cpu.tstates += 20;
  }
};

ddInstructionTable[0x23] = {
  execute: (cpu) => {
    cpu.ix = (cpu.ix + 1) & 0xffff;
    cpu.tstates += 10;
  }
};

ddInstructionTable[0x29] = {
  execute: (cpu) => {
    const result = cpu.ix + cpu.ix;
    cpu.setFlag(Z80CPU.FLAG_C, result & 0x10000);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_H, ((cpu.ix & 0x0fff) + (cpu.ix & 0x0fff)) & 0x1000);
    cpu.setFlag(Z80CPU.FLAG_Y, (result >> 8) & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, (result >> 8) & 0x08);
    cpu.ix = result & 0xffff;
    cpu.tstates += 15;
  }
};

ddInstructionTable[0x2a] = {
  execute: (cpu, decoder) => {
    const addr = decoder.fetchWord();
    cpu.ix = cpu.readMemWord(addr);
    cpu.tstates += 20;
  }
};

ddInstructionTable[0x2b] = {
  execute: (cpu) => {
    cpu.ix = (cpu.ix - 1) & 0xffff;
    cpu.tstates += 10;
  }
};

ddInstructionTable[0x34] = {
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    const addr = (cpu.ix + offset) & 0xffff;
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
    cpu.tstates += 23;
  }
};

ddInstructionTable[0x35] = {
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    const addr = (cpu.ix + offset) & 0xffff;
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
    cpu.tstates += 23;
  }
};

ddInstructionTable[0x36] = {
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    const val = decoder.fetchByte();
    cpu.writeMem((cpu.ix + offset) & 0xffff, val);
    cpu.tstates += 19;
  }
};

ddInstructionTable[0x39] = {
  execute: (cpu) => {
    const result = cpu.ix + cpu.sp;
    cpu.setFlag(Z80CPU.FLAG_C, result & 0x10000);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_H, ((cpu.ix & 0x0fff) + (cpu.sp & 0x0fff)) & 0x1000);
    cpu.setFlag(Z80CPU.FLAG_Y, (result >> 8) & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, (result >> 8) & 0x08);
    cpu.ix = result & 0xffff;
    cpu.tstates += 15;
  }
};

// LD instructions with (IX+d)
const registers = ['b', 'c', 'd', 'e', 'h', 'l', null, 'a'];

for (let r = 0; r < 8; r++) {
  if (r === 6) continue;

  // LD r,(IX+d)
  ddInstructionTable[0x46 + (r * 8)] = {
    execute: (cpu, decoder) => {
      const offset = toSigned(decoder.fetchByte());
      cpu[registers[r]] = cpu.readMem((cpu.ix + offset) & 0xffff);
      cpu.tstates += 19;
    }
  };

  // LD (IX+d),r
  ddInstructionTable[0x70 + r] = {
    execute: (cpu, decoder) => {
      const offset = toSigned(decoder.fetchByte());
      cpu.writeMem((cpu.ix + offset) & 0xffff, cpu[registers[r]]);
      cpu.tstates += 19;
    }
  };
}

// ALU operations with (IX+d)
ddInstructionTable[0x86] = { // ADD A,(IX+d)
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    const val = cpu.readMem((cpu.ix + offset) & 0xffff);
    const result = cpu.a + val;
    const overflow = ((cpu.a ^ result) & (val ^ result) & 0x80) !== 0;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, (result & 0xff) === 0);
    cpu.setFlag(Z80CPU.FLAG_H, ((cpu.a & 0x0f) + (val & 0x0f)) & 0x10);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_C, result & 0x100);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.a = result & 0xff;
    cpu.tstates += 19;
  }
};

ddInstructionTable[0x8e] = { // ADC A,(IX+d)
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    const val = cpu.readMem((cpu.ix + offset) & 0xffff);
    const carry = cpu.getFlag(Z80CPU.FLAG_C) ? 1 : 0;
    const result = cpu.a + val + carry;
    const overflow = ((cpu.a ^ result) & (val ^ result) & 0x80) !== 0;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, (result & 0xff) === 0);
    cpu.setFlag(Z80CPU.FLAG_H, ((cpu.a & 0x0f) + (val & 0x0f) + carry) & 0x10);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_C, result & 0x100);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.a = result & 0xff;
    cpu.tstates += 19;
  }
};

ddInstructionTable[0x96] = { // SUB (IX+d)
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    const val = cpu.readMem((cpu.ix + offset) & 0xffff);
    const result = cpu.a - val;
    const overflow = ((cpu.a ^ val) & (cpu.a ^ result) & 0x80) !== 0;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, (result & 0xff) === 0);
    cpu.setFlag(Z80CPU.FLAG_H, ((cpu.a & 0x0f) - (val & 0x0f)) & 0x10);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, true);
    cpu.setFlag(Z80CPU.FLAG_C, result < 0);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.a = result & 0xff;
    cpu.tstates += 19;
  }
};

ddInstructionTable[0x9e] = { // SBC A,(IX+d)
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    const val = cpu.readMem((cpu.ix + offset) & 0xffff);
    const carry = cpu.getFlag(Z80CPU.FLAG_C) ? 1 : 0;
    const result = cpu.a - val - carry;
    const overflow = ((cpu.a ^ val) & (cpu.a ^ result) & 0x80) !== 0;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, (result & 0xff) === 0);
    cpu.setFlag(Z80CPU.FLAG_H, ((cpu.a & 0x0f) - (val & 0x0f) - carry) & 0x10);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, true);
    cpu.setFlag(Z80CPU.FLAG_C, result < 0);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.a = result & 0xff;
    cpu.tstates += 19;
  }
};

ddInstructionTable[0xa6] = { // AND (IX+d)
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    const val = cpu.readMem((cpu.ix + offset) & 0xffff);
    cpu.a = (cpu.a & val) & 0xff;
    cpu.setFlag(Z80CPU.FLAG_S, cpu.a & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, cpu.a === 0);
    cpu.setFlag(Z80CPU.FLAG_H, true);
    cpu.setFlag(Z80CPU.FLAG_PV, cpu.getParity(cpu.a));
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_C, false);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.tstates += 19;
  }
};

ddInstructionTable[0xae] = { // XOR (IX+d)
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    const val = cpu.readMem((cpu.ix + offset) & 0xffff);
    cpu.a = (cpu.a ^ val) & 0xff;
    cpu.setFlag(Z80CPU.FLAG_S, cpu.a & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, cpu.a === 0);
    cpu.setFlag(Z80CPU.FLAG_H, false);
    cpu.setFlag(Z80CPU.FLAG_PV, cpu.getParity(cpu.a));
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_C, false);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.tstates += 19;
  }
};

ddInstructionTable[0xb6] = { // OR (IX+d)
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    const val = cpu.readMem((cpu.ix + offset) & 0xffff);
    cpu.a = (cpu.a | val) & 0xff;
    cpu.setFlag(Z80CPU.FLAG_S, cpu.a & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, cpu.a === 0);
    cpu.setFlag(Z80CPU.FLAG_H, false);
    cpu.setFlag(Z80CPU.FLAG_PV, cpu.getParity(cpu.a));
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_C, false);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.tstates += 19;
  }
};

ddInstructionTable[0xbe] = { // CP (IX+d)
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    const val = cpu.readMem((cpu.ix + offset) & 0xffff);
    const result = cpu.a - val;
    const overflow = ((cpu.a ^ val) & (cpu.a ^ result) & 0x80) !== 0;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, (result & 0xff) === 0);
    cpu.setFlag(Z80CPU.FLAG_H, ((cpu.a & 0x0f) - (val & 0x0f)) & 0x10);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, true);
    cpu.setFlag(Z80CPU.FLAG_C, result < 0);
    cpu.setFlag(Z80CPU.FLAG_Y, val & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, val & 0x08);
    cpu.tstates += 19;
  }
};

ddInstructionTable[0xe1] = { // POP IX
  execute: (cpu) => {
    cpu.ix = cpu.pop();
    cpu.tstates += 14;
  }
};

ddInstructionTable[0xe3] = { // EX (SP),IX
  execute: (cpu) => {
    const temp = cpu.readMemWord(cpu.sp);
    cpu.writeMemWord(cpu.sp, cpu.ix);
    cpu.ix = temp;
    cpu.tstates += 23;
  }
};

ddInstructionTable[0xe5] = { // PUSH IX
  execute: (cpu) => {
    cpu.push(cpu.ix);
    cpu.tstates += 15;
  }
};

ddInstructionTable[0xe9] = { // JP (IX)
  execute: (cpu) => {
    cpu.pc = cpu.ix;
    cpu.tstates += 8;
  }
};

ddInstructionTable[0xf9] = { // LD SP,IX
  execute: (cpu) => {
    cpu.sp = cpu.ix;
    cpu.tstates += 10;
  }
};

// DDCB instructions (bit operations on (IX+d))
for (let opcode = 0; opcode < 256; opcode++) {
  ddcbInstructionTable[opcode] = {
    execute: (cpu, decoder, offset) => {
      const addr = (cpu.ix + toSigned(offset)) & 0xffff;
      const value = cpu.readMem(addr);

      // Decode operation
      const op = (opcode >> 6) & 0x03;
      const bit = (opcode >> 3) & 0x07;
      const reg = opcode & 0x07;

      if (op === 1) { // BIT
        const bitValue = (value >> bit) & 1;
        cpu.setFlag(Z80CPU.FLAG_Z, bitValue === 0);
        cpu.setFlag(Z80CPU.FLAG_PV, bitValue === 0);
        cpu.setFlag(Z80CPU.FLAG_H, true);
        cpu.setFlag(Z80CPU.FLAG_N, false);
        cpu.setFlag(Z80CPU.FLAG_S, bit === 7 && bitValue === 1);
        cpu.setFlag(Z80CPU.FLAG_Y, (addr >> 8) & 0x20);
        cpu.setFlag(Z80CPU.FLAG_X, (addr >> 8) & 0x08);
        cpu.tstates += 20;
      } else if (op === 2) { // RES
        const result = value & ~(1 << bit);
        cpu.writeMem(addr, result);
        if (reg !== 6) cpu[registers[reg]] = result;
        cpu.tstates += 23;
      } else if (op === 3) { // SET
        const result = value | (1 << bit);
        cpu.writeMem(addr, result);
        if (reg !== 6) cpu[registers[reg]] = result;
        cpu.tstates += 23;
      } else { // Rotate/shift (op === 0)
        const table = cbInstructionTable[opcode];
        if (table) {
          // Execute rotation on memory
          const oldPC = cpu.pc;
          const oldHL = cpu.getHL();
          cpu.setHL(addr);
          table.execute(cpu);
          const result = cpu.readMem(addr);
          cpu.setHL(oldHL);
          cpu.pc = oldPC;
          if (reg !== 6) cpu[registers[reg]] = result;
          cpu.tstates += 8; // Adjust timing
        }
      }
    }
  };
}

// ============================================================================
// UNDOCUMENTED INSTRUCTIONS: IXH and IXL (high and low bytes of IX)
// These are used by many ZX Spectrum games including Manic Miner
// ============================================================================

// 0x24: INC IXH
ddInstructionTable[0x24] = {
  execute: (cpu) => {
    const val = cpu.getIXH();
    const result = (val + 1) & 0xff;
    const overflow = val === 0x7f;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, (val & 0x0f) === 0x0f);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.setIXH(result);
    cpu.tstates += 8;
  }
};

// 0x25: DEC IXH
ddInstructionTable[0x25] = {
  execute: (cpu) => {
    const val = cpu.getIXH();
    const result = (val - 1) & 0xff;
    const overflow = val === 0x80;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, (val & 0x0f) === 0);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, true);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.setIXH(result);
    cpu.tstates += 8;
  }
};

// 0x26: LD IXH,n
ddInstructionTable[0x26] = {
  execute: (cpu, decoder) => {
    cpu.setIXH(decoder.fetchByte());
    cpu.tstates += 11;
  }
};

// 0x2C: INC IXL
ddInstructionTable[0x2c] = {
  execute: (cpu) => {
    const val = cpu.getIXL();
    const result = (val + 1) & 0xff;
    const overflow = val === 0x7f;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, (val & 0x0f) === 0x0f);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.setIXL(result);
    cpu.tstates += 8;
  }
};

// 0x2D: DEC IXL
ddInstructionTable[0x2d] = {
  execute: (cpu) => {
    const val = cpu.getIXL();
    const result = (val - 1) & 0xff;
    const overflow = val === 0x80;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, (val & 0x0f) === 0);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, true);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.setIXL(result);
    cpu.tstates += 8;
  }
};

// 0x2E: LD IXL,n
ddInstructionTable[0x2e] = {
  execute: (cpu, decoder) => {
    cpu.setIXL(decoder.fetchByte());
    cpu.tstates += 11;
  }
};

// LD r,IXH instructions (0x44, 0x4C, 0x54, 0x5C, 0x7C)
ddInstructionTable[0x44] = { execute: (cpu) => { cpu.b = cpu.getIXH(); cpu.tstates += 8; } }; // LD B,IXH
ddInstructionTable[0x4c] = { execute: (cpu) => { cpu.c = cpu.getIXH(); cpu.tstates += 8; } }; // LD C,IXH
ddInstructionTable[0x54] = { execute: (cpu) => { cpu.d = cpu.getIXH(); cpu.tstates += 8; } }; // LD D,IXH
ddInstructionTable[0x5c] = { execute: (cpu) => { cpu.e = cpu.getIXH(); cpu.tstates += 8; } }; // LD E,IXH
ddInstructionTable[0x7c] = { execute: (cpu) => { cpu.a = cpu.getIXH(); cpu.tstates += 8; } }; // LD A,IXH

// LD r,IXL instructions (0x45, 0x4D, 0x55, 0x5D, 0x7D)
ddInstructionTable[0x45] = { execute: (cpu) => { cpu.b = cpu.getIXL(); cpu.tstates += 8; } }; // LD B,IXL
ddInstructionTable[0x4d] = { execute: (cpu) => { cpu.c = cpu.getIXL(); cpu.tstates += 8; } }; // LD C,IXL
ddInstructionTable[0x55] = { execute: (cpu) => { cpu.d = cpu.getIXL(); cpu.tstates += 8; } }; // LD D,IXL
ddInstructionTable[0x5d] = { execute: (cpu) => { cpu.e = cpu.getIXL(); cpu.tstates += 8; } }; // LD E,IXL
ddInstructionTable[0x7d] = { execute: (cpu) => { cpu.a = cpu.getIXL(); cpu.tstates += 8; } }; // LD A,IXL

// LD IXH,r instructions (0x60, 0x61, 0x62, 0x63, 0x64, 0x67)
ddInstructionTable[0x60] = { execute: (cpu) => { cpu.setIXH(cpu.b); cpu.tstates += 8; } }; // LD IXH,B
ddInstructionTable[0x61] = { execute: (cpu) => { cpu.setIXH(cpu.c); cpu.tstates += 8; } }; // LD IXH,C
ddInstructionTable[0x62] = { execute: (cpu) => { cpu.setIXH(cpu.d); cpu.tstates += 8; } }; // LD IXH,D
ddInstructionTable[0x63] = { execute: (cpu) => { cpu.setIXH(cpu.e); cpu.tstates += 8; } }; // LD IXH,E
ddInstructionTable[0x64] = { execute: (cpu) => { cpu.setIXH(cpu.getIXH()); cpu.tstates += 8; } }; // LD IXH,IXH
ddInstructionTable[0x65] = { execute: (cpu) => { cpu.setIXH(cpu.getIXL()); cpu.tstates += 8; } }; // LD IXH,IXL
ddInstructionTable[0x67] = { execute: (cpu) => { cpu.setIXH(cpu.a); cpu.tstates += 8; } }; // LD IXH,A

// LD IXL,r instructions (0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6F)
ddInstructionTable[0x68] = { execute: (cpu) => { cpu.setIXL(cpu.b); cpu.tstates += 8; } }; // LD IXL,B
ddInstructionTable[0x69] = { execute: (cpu) => { cpu.setIXL(cpu.c); cpu.tstates += 8; } }; // LD IXL,C
ddInstructionTable[0x6a] = { execute: (cpu) => { cpu.setIXL(cpu.d); cpu.tstates += 8; } }; // LD IXL,D
ddInstructionTable[0x6b] = { execute: (cpu) => { cpu.setIXL(cpu.e); cpu.tstates += 8; } }; // LD IXL,E
ddInstructionTable[0x6c] = { execute: (cpu) => { cpu.setIXL(cpu.getIXH()); cpu.tstates += 8; } }; // LD IXL,IXH
ddInstructionTable[0x6d] = { execute: (cpu) => { cpu.setIXL(cpu.getIXL()); cpu.tstates += 8; } }; // LD IXL,IXL
ddInstructionTable[0x6f] = { execute: (cpu) => { cpu.setIXL(cpu.a); cpu.tstates += 8; } }; // LD IXL,A

// ADD A,IXH / ADD A,IXL
ddInstructionTable[0x84] = {
  execute: (cpu) => {
    const value = cpu.getIXH();
    const result = cpu.a + value;
    const carry = result;
    const overflow = ((cpu.a ^ result) & (value ^ result) & 0x80) !== 0;
    cpu.a = result & 0xff;
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_S, cpu.a & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, cpu.a === 0);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_H, carry & 0x10);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_C, carry & 0x100);
    cpu.tstates += 8;
  }
};

ddInstructionTable[0x85] = {
  execute: (cpu) => {
    const value = cpu.getIXL();
    const result = cpu.a + value;
    const carry = result;
    const overflow = ((cpu.a ^ result) & (value ^ result) & 0x80) !== 0;
    cpu.a = result & 0xff;
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_S, cpu.a & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, cpu.a === 0);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_H, carry & 0x10);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_C, carry & 0x100);
    cpu.tstates += 8;
  }
};

// ADC A,IXH / ADC A,IXL
ddInstructionTable[0x8c] = {
  execute: (cpu) => {
    const value = cpu.getIXH();
    const oldCarry = cpu.getFlag(Z80CPU.FLAG_C) ? 1 : 0;
    const result = cpu.a + value + oldCarry;
    const carry = result;
    const overflow = ((cpu.a ^ result) & (value ^ result) & 0x80) !== 0;
    cpu.a = result & 0xff;
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_S, cpu.a & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, cpu.a === 0);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_H, carry & 0x10);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_C, carry & 0x100);
    cpu.tstates += 8;
  }
};

ddInstructionTable[0x8d] = {
  execute: (cpu) => {
    const value = cpu.getIXL();
    const oldCarry = cpu.getFlag(Z80CPU.FLAG_C) ? 1 : 0;
    const result = cpu.a + value + oldCarry;
    const carry = result;
    const overflow = ((cpu.a ^ result) & (value ^ result) & 0x80) !== 0;
    cpu.a = result & 0xff;
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_S, cpu.a & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, cpu.a === 0);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_H, carry & 0x10);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_C, carry & 0x100);
    cpu.tstates += 8;
  }
};

// SUB IXH / SUB IXL
ddInstructionTable[0x94] = {
  execute: (cpu) => {
    const value = cpu.getIXH();
    const result = cpu.a - value;
    const carry = result;
    const overflow = ((cpu.a ^ value) & (cpu.a ^ result) & 0x80) !== 0;
    const halfBorrow = (cpu.a & 0x0f) < (value & 0x0f);
    cpu.a = result & 0xff;
    cpu.setFlag(Z80CPU.FLAG_N, true);
    cpu.setFlag(Z80CPU.FLAG_S, cpu.a & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, cpu.a === 0);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_H, halfBorrow);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_C, carry & 0x100);
    cpu.tstates += 8;
  }
};

ddInstructionTable[0x95] = {
  execute: (cpu) => {
    const value = cpu.getIXL();
    const result = cpu.a - value;
    const carry = result;
    const overflow = ((cpu.a ^ value) & (cpu.a ^ result) & 0x80) !== 0;
    const halfBorrow = (cpu.a & 0x0f) < (value & 0x0f);
    cpu.a = result & 0xff;
    cpu.setFlag(Z80CPU.FLAG_N, true);
    cpu.setFlag(Z80CPU.FLAG_S, cpu.a & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, cpu.a === 0);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_H, halfBorrow);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_C, carry & 0x100);
    cpu.tstates += 8;
  }
};

// SBC A,IXH / SBC A,IXL
ddInstructionTable[0x9c] = {
  execute: (cpu) => {
    const value = cpu.getIXH();
    const oldBorrow = cpu.getFlag(Z80CPU.FLAG_C) ? 1 : 0;
    const result = cpu.a - value - oldBorrow;
    const carry = result;
    const overflow = ((cpu.a ^ value) & (cpu.a ^ result) & 0x80) !== 0;
    const halfBorrow = (cpu.a & 0x0f) < ((value & 0x0f) + oldBorrow);
    cpu.a = result & 0xff;
    cpu.setFlag(Z80CPU.FLAG_N, true);
    cpu.setFlag(Z80CPU.FLAG_S, cpu.a & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, cpu.a === 0);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_H, halfBorrow);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_C, carry & 0x100);
    cpu.tstates += 8;
  }
};

ddInstructionTable[0x9d] = {
  execute: (cpu) => {
    const value = cpu.getIXL();
    const oldBorrow = cpu.getFlag(Z80CPU.FLAG_C) ? 1 : 0;
    const result = cpu.a - value - oldBorrow;
    const carry = result;
    const overflow = ((cpu.a ^ value) & (cpu.a ^ result) & 0x80) !== 0;
    const halfBorrow = (cpu.a & 0x0f) < ((value & 0x0f) + oldBorrow);
    cpu.a = result & 0xff;
    cpu.setFlag(Z80CPU.FLAG_N, true);
    cpu.setFlag(Z80CPU.FLAG_S, cpu.a & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, cpu.a === 0);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_H, halfBorrow);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_C, carry & 0x100);
    cpu.tstates += 8;
  }
};

// AND IXH / AND IXL
ddInstructionTable[0xa4] = {
  execute: (cpu) => {
    cpu.a &= cpu.getIXH();
    cpu.setFlag(Z80CPU.FLAG_S, cpu.a & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, cpu.a === 0);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_H, true);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.setFlag(Z80CPU.FLAG_PV, cpu.getParity(cpu.a));
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_C, false);
    cpu.tstates += 8;
  }
};

ddInstructionTable[0xa5] = {
  execute: (cpu) => {
    cpu.a &= cpu.getIXL();
    cpu.setFlag(Z80CPU.FLAG_S, cpu.a & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, cpu.a === 0);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_H, true);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.setFlag(Z80CPU.FLAG_PV, cpu.getParity(cpu.a));
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_C, false);
    cpu.tstates += 8;
  }
};

// XOR IXH / XOR IXL
ddInstructionTable[0xac] = {
  execute: (cpu) => {
    cpu.a ^= cpu.getIXH();
    cpu.setFlag(Z80CPU.FLAG_S, cpu.a & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, cpu.a === 0);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_H, false);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.setFlag(Z80CPU.FLAG_PV, cpu.getParity(cpu.a));
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_C, false);
    cpu.tstates += 8;
  }
};

ddInstructionTable[0xad] = {
  execute: (cpu) => {
    cpu.a ^= cpu.getIXL();
    cpu.setFlag(Z80CPU.FLAG_S, cpu.a & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, cpu.a === 0);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_H, false);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.setFlag(Z80CPU.FLAG_PV, cpu.getParity(cpu.a));
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_C, false);
    cpu.tstates += 8;
  }
};

// OR IXH / OR IXL
ddInstructionTable[0xb4] = {
  execute: (cpu) => {
    cpu.a |= cpu.getIXH();
    cpu.setFlag(Z80CPU.FLAG_S, cpu.a & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, cpu.a === 0);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_H, false);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.setFlag(Z80CPU.FLAG_PV, cpu.getParity(cpu.a));
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_C, false);
    cpu.tstates += 8;
  }
};

ddInstructionTable[0xb5] = {
  execute: (cpu) => {
    cpu.a |= cpu.getIXL();
    cpu.setFlag(Z80CPU.FLAG_S, cpu.a & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, cpu.a === 0);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_H, false);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.setFlag(Z80CPU.FLAG_PV, cpu.getParity(cpu.a));
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_C, false);
    cpu.tstates += 8;
  }
};

// CP IXH / CP IXL
ddInstructionTable[0xbc] = {
  execute: (cpu) => {
    const value = cpu.getIXH();
    const result = cpu.a - value;
    const carry = result;
    const overflow = ((cpu.a ^ value) & (cpu.a ^ result) & 0x80) !== 0;
    const halfBorrow = (cpu.a & 0x0f) < (value & 0x0f);
    cpu.setFlag(Z80CPU.FLAG_N, true);
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, (result & 0xff) === 0);
    cpu.setFlag(Z80CPU.FLAG_H, halfBorrow);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_C, carry & 0x100);
    cpu.setFlag(Z80CPU.FLAG_Y, value & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, value & 0x08);
    cpu.tstates += 8;
  }
};

ddInstructionTable[0xbd] = {
  execute: (cpu) => {
    const value = cpu.getIXL();
    const result = cpu.a - value;
    const carry = result;
    const overflow = ((cpu.a ^ value) & (cpu.a ^ result) & 0x80) !== 0;
    const halfBorrow = (cpu.a & 0x0f) < (value & 0x0f);
    cpu.setFlag(Z80CPU.FLAG_N, true);
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, (result & 0xff) === 0);
    cpu.setFlag(Z80CPU.FLAG_H, halfBorrow);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_C, carry & 0x100);
    cpu.setFlag(Z80CPU.FLAG_Y, value & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, value & 0x08);
    cpu.tstates += 8;
  }
};
