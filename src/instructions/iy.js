/**
 * FD-prefixed IY register instructions
 * Nearly identical to IX instructions but use IY register
 */
import { Z80CPU } from '../core/cpu.js';
import { cbInstructionTable } from './bit.js';

export const fdInstructionTable = [];
export const fdcbInstructionTable = [];

const toSigned = (val) => (val & 0x80) ? val - 256 : val;

// Most IY instructions mirror standard HL instructions but use IY
fdInstructionTable[0x09] = {
  execute: (cpu) => {
    const bc = cpu.getBC();
    const result = cpu.iy + bc;
    cpu.setFlag(Z80CPU.FLAG_C, result & 0x10000);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_H, ((cpu.iy & 0x0fff) + (bc & 0x0fff)) & 0x1000);
    cpu.setFlag(Z80CPU.FLAG_Y, (result >> 8) & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, (result >> 8) & 0x08);
    cpu.iy = result & 0xffff;
    cpu.tstates += 15;
  }
};

fdInstructionTable[0x19] = {
  execute: (cpu) => {
    const de = cpu.getDE();
    const result = cpu.iy + de;
    cpu.setFlag(Z80CPU.FLAG_C, result & 0x10000);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_H, ((cpu.iy & 0x0fff) + (de & 0x0fff)) & 0x1000);
    cpu.setFlag(Z80CPU.FLAG_Y, (result >> 8) & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, (result >> 8) & 0x08);
    cpu.iy = result & 0xffff;
    cpu.tstates += 15;
  }
};

fdInstructionTable[0x21] = {
  execute: (cpu, decoder) => {
    cpu.iy = decoder.fetchWord();
    cpu.tstates += 14;
  }
};

fdInstructionTable[0x22] = {
  execute: (cpu, decoder) => {
    const addr = decoder.fetchWord();
    cpu.writeMemWord(addr, cpu.iy);
    cpu.tstates += 20;
  }
};

fdInstructionTable[0x23] = {
  execute: (cpu) => {
    cpu.iy = (cpu.iy + 1) & 0xffff;
    cpu.tstates += 10;
  }
};

fdInstructionTable[0x29] = {
  execute: (cpu) => {
    const result = cpu.iy + cpu.iy;
    cpu.setFlag(Z80CPU.FLAG_C, result & 0x10000);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_H, ((cpu.iy & 0x0fff) + (cpu.iy & 0x0fff)) & 0x1000);
    cpu.setFlag(Z80CPU.FLAG_Y, (result >> 8) & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, (result >> 8) & 0x08);
    cpu.iy = result & 0xffff;
    cpu.tstates += 15;
  }
};

fdInstructionTable[0x2a] = {
  execute: (cpu, decoder) => {
    const addr = decoder.fetchWord();
    cpu.iy = cpu.readMemWord(addr);
    cpu.tstates += 20;
  }
};

fdInstructionTable[0x2b] = {
  execute: (cpu) => {
    cpu.iy = (cpu.iy - 1) & 0xffff;
    cpu.tstates += 10;
  }
};

fdInstructionTable[0x34] = {
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    const addr = (cpu.iy + offset) & 0xffff;
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

fdInstructionTable[0x35] = {
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    const addr = (cpu.iy + offset) & 0xffff;
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

fdInstructionTable[0x36] = {
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    const val = decoder.fetchByte();
    cpu.writeMem((cpu.iy + offset) & 0xffff, val);
    cpu.tstates += 19;
  }
};

fdInstructionTable[0x39] = {
  execute: (cpu) => {
    const result = cpu.iy + cpu.sp;
    cpu.setFlag(Z80CPU.FLAG_C, result & 0x10000);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_H, ((cpu.iy & 0x0fff) + (cpu.sp & 0x0fff)) & 0x1000);
    cpu.setFlag(Z80CPU.FLAG_Y, (result >> 8) & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, (result >> 8) & 0x08);
    cpu.iy = result & 0xffff;
    cpu.tstates += 15;
  }
};

// LD instructions with (IY+d)
const registers = ['b', 'c', 'd', 'e', 'h', 'l', null, 'a'];

for (let r = 0; r < 8; r++) {
  if (r === 6) continue;

  // LD r,(IY+d)
  fdInstructionTable[0x46 + (r * 8)] = {
    execute: (cpu, decoder) => {
      const offset = toSigned(decoder.fetchByte());
      cpu[registers[r]] = cpu.readMem((cpu.iy + offset) & 0xffff);
      cpu.tstates += 19;
    }
  };

  // LD (IY+d),r
  fdInstructionTable[0x70 + r] = {
    execute: (cpu, decoder) => {
      const offset = toSigned(decoder.fetchByte());
      cpu.writeMem((cpu.iy + offset) & 0xffff, cpu[registers[r]]);
      cpu.tstates += 19;
    }
  };
}

// ALU operations with (IY+d)
fdInstructionTable[0x86] = { // ADD A,(IY+d)
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    const val = cpu.readMem((cpu.iy + offset) & 0xffff);
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

fdInstructionTable[0x8e] = { // ADC A,(IY+d)
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    const val = cpu.readMem((cpu.iy + offset) & 0xffff);
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

fdInstructionTable[0x96] = { // SUB (IY+d)
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    const val = cpu.readMem((cpu.iy + offset) & 0xffff);
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

fdInstructionTable[0x9e] = { // SBC A,(IY+d)
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    const val = cpu.readMem((cpu.iy + offset) & 0xffff);
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

fdInstructionTable[0xa6] = { // AND (IY+d)
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    const val = cpu.readMem((cpu.iy + offset) & 0xffff);
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

fdInstructionTable[0xae] = { // XOR (IY+d)
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    const val = cpu.readMem((cpu.iy + offset) & 0xffff);
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

fdInstructionTable[0xb6] = { // OR (IY+d)
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    const val = cpu.readMem((cpu.iy + offset) & 0xffff);
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

fdInstructionTable[0xbe] = { // CP (IY+d)
  execute: (cpu, decoder) => {
    const offset = toSigned(decoder.fetchByte());
    const val = cpu.readMem((cpu.iy + offset) & 0xffff);
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

fdInstructionTable[0xe1] = { // POP IY
  execute: (cpu) => {
    cpu.iy = cpu.pop();
    cpu.tstates += 14;
  }
};

fdInstructionTable[0xe3] = { // EX (SP),IY
  execute: (cpu) => {
    const temp = cpu.readMemWord(cpu.sp);
    cpu.writeMemWord(cpu.sp, cpu.iy);
    cpu.iy = temp;
    cpu.tstates += 23;
  }
};

fdInstructionTable[0xe5] = { // PUSH IY
  execute: (cpu) => {
    cpu.push(cpu.iy);
    cpu.tstates += 15;
  }
};

fdInstructionTable[0xe9] = { // JP (IY)
  execute: (cpu) => {
    cpu.pc = cpu.iy;
    cpu.tstates += 8;
  }
};

fdInstructionTable[0xf9] = { // LD SP,IY
  execute: (cpu) => {
    cpu.sp = cpu.iy;
    cpu.tstates += 10;
  }
};

// FDCB instructions (bit operations on (IY+d))
for (let opcode = 0; opcode < 256; opcode++) {
  fdcbInstructionTable[opcode] = {
    execute: (cpu, decoder, offset) => {
      const addr = (cpu.iy + toSigned(offset)) & 0xffff;
      const value = cpu.readMem(addr);

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
      } else {
        const table = cbInstructionTable[opcode];
        if (table) {
          const oldPC = cpu.pc;
          const oldHL = cpu.getHL();
          cpu.setHL(addr);
          table.execute(cpu);
          const result = cpu.readMem(addr);
          cpu.setHL(oldHL);
          cpu.pc = oldPC;
          if (reg !== 6) cpu[registers[reg]] = result;
          cpu.tstates += 8;
        }
      }
    }
  };
}

// ============================================================================
// UNDOCUMENTED INSTRUCTIONS: IYH and IYL (high and low bytes of IY)
// These are used by many ZX Spectrum games including Manic Miner
// ============================================================================

// 0x24: INC IYH
fdInstructionTable[0x24] = {
  execute: (cpu) => {
    const val = cpu.getIYH();
    const result = (val + 1) & 0xff;
    const overflow = val === 0x7f;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, (val & 0x0f) === 0x0f);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.setIYH(result);
    cpu.tstates += 8;
  }
};

// 0x25: DEC IYH
fdInstructionTable[0x25] = {
  execute: (cpu) => {
    const val = cpu.getIYH();
    const result = (val - 1) & 0xff;
    const overflow = val === 0x80;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, (val & 0x0f) === 0);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, true);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.setIYH(result);
    cpu.tstates += 8;
  }
};

// 0x26: LD IYH,n
fdInstructionTable[0x26] = {
  execute: (cpu, decoder) => {
    cpu.setIYH(decoder.fetchByte());
    cpu.tstates += 11;
  }
};

// 0x2C: INC IYL
fdInstructionTable[0x2c] = {
  execute: (cpu) => {
    const val = cpu.getIYL();
    const result = (val + 1) & 0xff;
    const overflow = val === 0x7f;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, (val & 0x0f) === 0x0f);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.setIYL(result);
    cpu.tstates += 8;
  }
};

// 0x2D: DEC IYL
fdInstructionTable[0x2d] = {
  execute: (cpu) => {
    const val = cpu.getIYL();
    const result = (val - 1) & 0xff;
    const overflow = val === 0x80;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, (val & 0x0f) === 0);
    cpu.setFlag(Z80CPU.FLAG_PV, overflow);
    cpu.setFlag(Z80CPU.FLAG_N, true);
    cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
    cpu.setIYL(result);
    cpu.tstates += 8;
  }
};

// 0x2E: LD IYL,n
fdInstructionTable[0x2e] = {
  execute: (cpu, decoder) => {
    cpu.setIYL(decoder.fetchByte());
    cpu.tstates += 11;
  }
};

// LD r,IYH instructions (0x44, 0x4C, 0x54, 0x5C, 0x7C)
fdInstructionTable[0x44] = { execute: (cpu) => { cpu.b = cpu.getIYH(); cpu.tstates += 8; } }; // LD B,IYH
fdInstructionTable[0x4c] = { execute: (cpu) => { cpu.c = cpu.getIYH(); cpu.tstates += 8; } }; // LD C,IYH
fdInstructionTable[0x54] = { execute: (cpu) => { cpu.d = cpu.getIYH(); cpu.tstates += 8; } }; // LD D,IYH
fdInstructionTable[0x5c] = { execute: (cpu) => { cpu.e = cpu.getIYH(); cpu.tstates += 8; } }; // LD E,IYH
fdInstructionTable[0x7c] = { execute: (cpu) => { cpu.a = cpu.getIYH(); cpu.tstates += 8; } }; // LD A,IYH

// LD r,IYL instructions (0x45, 0x4D, 0x55, 0x5D, 0x7D)
fdInstructionTable[0x45] = { execute: (cpu) => { cpu.b = cpu.getIYL(); cpu.tstates += 8; } }; // LD B,IYL
fdInstructionTable[0x4d] = { execute: (cpu) => { cpu.c = cpu.getIYL(); cpu.tstates += 8; } }; // LD C,IYL
fdInstructionTable[0x55] = { execute: (cpu) => { cpu.d = cpu.getIYL(); cpu.tstates += 8; } }; // LD D,IYL
fdInstructionTable[0x5d] = { execute: (cpu) => { cpu.e = cpu.getIYL(); cpu.tstates += 8; } }; // LD E,IYL
fdInstructionTable[0x7d] = { execute: (cpu) => { cpu.a = cpu.getIYL(); cpu.tstates += 8; } }; // LD A,IYL

// LD IYH,r instructions (0x60, 0x61, 0x62, 0x63, 0x64, 0x67)
fdInstructionTable[0x60] = { execute: (cpu) => { cpu.setIYH(cpu.b); cpu.tstates += 8; } }; // LD IYH,B
fdInstructionTable[0x61] = { execute: (cpu) => { cpu.setIYH(cpu.c); cpu.tstates += 8; } }; // LD IYH,C
fdInstructionTable[0x62] = { execute: (cpu) => { cpu.setIYH(cpu.d); cpu.tstates += 8; } }; // LD IYH,D
fdInstructionTable[0x63] = { execute: (cpu) => { cpu.setIYH(cpu.e); cpu.tstates += 8; } }; // LD IYH,E
fdInstructionTable[0x64] = { execute: (cpu) => { cpu.setIYH(cpu.getIYH()); cpu.tstates += 8; } }; // LD IYH,IYH
fdInstructionTable[0x65] = { execute: (cpu) => { cpu.setIYH(cpu.getIYL()); cpu.tstates += 8; } }; // LD IYH,IYL
fdInstructionTable[0x67] = { execute: (cpu) => { cpu.setIYH(cpu.a); cpu.tstates += 8; } }; // LD IYH,A

// LD IYL,r instructions (0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6F)
fdInstructionTable[0x68] = { execute: (cpu) => { cpu.setIYL(cpu.b); cpu.tstates += 8; } }; // LD IYL,B
fdInstructionTable[0x69] = { execute: (cpu) => { cpu.setIYL(cpu.c); cpu.tstates += 8; } }; // LD IYL,C
fdInstructionTable[0x6a] = { execute: (cpu) => { cpu.setIYL(cpu.d); cpu.tstates += 8; } }; // LD IYL,D
fdInstructionTable[0x6b] = { execute: (cpu) => { cpu.setIYL(cpu.e); cpu.tstates += 8; } }; // LD IYL,E
fdInstructionTable[0x6c] = { execute: (cpu) => { cpu.setIYL(cpu.getIYH()); cpu.tstates += 8; } }; // LD IYL,IYH
fdInstructionTable[0x6d] = { execute: (cpu) => { cpu.setIYL(cpu.getIYL()); cpu.tstates += 8; } }; // LD IYL,IYL
fdInstructionTable[0x6f] = { execute: (cpu) => { cpu.setIYL(cpu.a); cpu.tstates += 8; } }; // LD IYL,A

// ADD A,IYH / ADD A,IYL
fdInstructionTable[0x84] = {
  execute: (cpu) => {
    const value = cpu.getIYH();
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

fdInstructionTable[0x85] = {
  execute: (cpu) => {
    const value = cpu.getIYL();
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

// ADC A,IYH / ADC A,IYL
fdInstructionTable[0x8c] = {
  execute: (cpu) => {
    const value = cpu.getIYH();
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

fdInstructionTable[0x8d] = {
  execute: (cpu) => {
    const value = cpu.getIYL();
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

// SUB IYH / SUB IYL
fdInstructionTable[0x94] = {
  execute: (cpu) => {
    const value = cpu.getIYH();
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

fdInstructionTable[0x95] = {
  execute: (cpu) => {
    const value = cpu.getIYL();
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

// SBC A,IYH / SBC A,IYL
fdInstructionTable[0x9c] = {
  execute: (cpu) => {
    const value = cpu.getIYH();
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

fdInstructionTable[0x9d] = {
  execute: (cpu) => {
    const value = cpu.getIYL();
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

// AND IYH / AND IYL
fdInstructionTable[0xa4] = {
  execute: (cpu) => {
    cpu.a &= cpu.getIYH();
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

fdInstructionTable[0xa5] = {
  execute: (cpu) => {
    cpu.a &= cpu.getIYL();
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

// XOR IYH / XOR IYL
fdInstructionTable[0xac] = {
  execute: (cpu) => {
    cpu.a ^= cpu.getIYH();
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

fdInstructionTable[0xad] = {
  execute: (cpu) => {
    cpu.a ^= cpu.getIYL();
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

// OR IYH / OR IYL
fdInstructionTable[0xb4] = {
  execute: (cpu) => {
    cpu.a |= cpu.getIYH();
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

fdInstructionTable[0xb5] = {
  execute: (cpu) => {
    cpu.a |= cpu.getIYL();
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

// CP IYH / CP IYL
fdInstructionTable[0xbc] = {
  execute: (cpu) => {
    const value = cpu.getIYH();
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

fdInstructionTable[0xbd] = {
  execute: (cpu) => {
    const value = cpu.getIYL();
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
