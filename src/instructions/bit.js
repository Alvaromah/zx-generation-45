/**
 * CB-prefixed bit manipulation instructions
 */
import { Z80CPU } from '../core/cpu.js';

export const cbInstructionTable = [];

const registers = ['b', 'c', 'd', 'e', 'h', 'l', null, 'a'];

// Rotate/shift operations
const rotateOps = {
  rlc: (cpu, value) => {
    const carry = value & 0x80;
    const result = ((value << 1) | (carry >> 7)) & 0xff;
    cpu.setLogicalFlags(result);
    cpu.setFlag(Z80CPU.FLAG_C, carry);
    return result;
  },
  rrc: (cpu, value) => {
    const carry = value & 0x01;
    const result = ((value >> 1) | (carry << 7)) & 0xff;
    cpu.setLogicalFlags(result);
    cpu.setFlag(Z80CPU.FLAG_C, carry);
    return result;
  },
  rl: (cpu, value) => {
    const oldCarry = cpu.getFlag(Z80CPU.FLAG_C) ? 1 : 0;
    const newCarry = value & 0x80;
    const result = ((value << 1) | oldCarry) & 0xff;
    cpu.setLogicalFlags(result);
    cpu.setFlag(Z80CPU.FLAG_C, newCarry);
    return result;
  },
  rr: (cpu, value) => {
    const oldCarry = cpu.getFlag(Z80CPU.FLAG_C) ? 0x80 : 0;
    const newCarry = value & 0x01;
    const result = ((value >> 1) | oldCarry) & 0xff;
    cpu.setLogicalFlags(result);
    cpu.setFlag(Z80CPU.FLAG_C, newCarry);
    return result;
  },
  sla: (cpu, value) => {
    const carry = value & 0x80;
    const result = (value << 1) & 0xff;
    cpu.setLogicalFlags(result);
    cpu.setFlag(Z80CPU.FLAG_C, carry);
    return result;
  },
  sra: (cpu, value) => {
    const carry = value & 0x01;
    const result = ((value >> 1) | (value & 0x80)) & 0xff;
    cpu.setLogicalFlags(result);
    cpu.setFlag(Z80CPU.FLAG_C, carry);
    return result;
  },
  sll: (cpu, value) => {
    const carry = value & 0x80;
    const result = ((value << 1) | 0x01) & 0xff;
    cpu.setLogicalFlags(result);
    cpu.setFlag(Z80CPU.FLAG_C, carry);
    return result;
  },
  srl: (cpu, value) => {
    const carry = value & 0x01;
    const result = (value >> 1) & 0xff;
    cpu.setLogicalFlags(result);
    cpu.setFlag(Z80CPU.FLAG_C, carry);
    return result;
  }
};

// 0x00-0x3F: Rotate/shift operations
const rotateNames = ['rlc', 'rrc', 'rl', 'rr', 'sla', 'sra', 'sll', 'srl'];
for (let op = 0; op < 8; op++) {
  for (let reg = 0; reg < 8; reg++) {
    const opcode = (op * 8) + reg;
    const operation = rotateNames[op];

    cbInstructionTable[opcode] = {
      execute: (cpu) => {
        if (reg === 6) {
          const addr = cpu.getHL();
          const value = cpu.readMem(addr);
          const result = rotateOps[operation](cpu, value);
          cpu.writeMem(addr, result);
          cpu.tstates += 15;
        } else {
          cpu[registers[reg]] = rotateOps[operation](cpu, cpu[registers[reg]]);
          cpu.tstates += 8;
        }
      }
    };
  }
}

// 0x40-0x7F: BIT b,r
for (let bit = 0; bit < 8; bit++) {
  for (let reg = 0; reg < 8; reg++) {
    const opcode = 0x40 + (bit * 8) + reg;

    cbInstructionTable[opcode] = {
      execute: (cpu) => {
        let value;
        if (reg === 6) {
          value = cpu.readMem(cpu.getHL());
          cpu.tstates += 12;
        } else {
          value = cpu[registers[reg]];
          cpu.tstates += 8;
        }

        const bitValue = (value >> bit) & 1;
        cpu.setFlag(Z80CPU.FLAG_Z, bitValue === 0);
        cpu.setFlag(Z80CPU.FLAG_PV, bitValue === 0);
        cpu.setFlag(Z80CPU.FLAG_H, true);
        cpu.setFlag(Z80CPU.FLAG_N, false);
        cpu.setFlag(Z80CPU.FLAG_S, bit === 7 && bitValue === 1);

        if (reg === 6) {
          const addr = cpu.getHL();
          cpu.setFlag(Z80CPU.FLAG_Y, (addr >> 8) & 0x20);
          cpu.setFlag(Z80CPU.FLAG_X, (addr >> 8) & 0x08);
        } else {
          cpu.setFlag(Z80CPU.FLAG_Y, value & 0x20);
          cpu.setFlag(Z80CPU.FLAG_X, value & 0x08);
        }
      }
    };
  }
}

// 0x80-0xBF: RES b,r
for (let bit = 0; bit < 8; bit++) {
  for (let reg = 0; reg < 8; reg++) {
    const opcode = 0x80 + (bit * 8) + reg;
    const mask = ~(1 << bit);

    cbInstructionTable[opcode] = {
      execute: (cpu) => {
        if (reg === 6) {
          const addr = cpu.getHL();
          const value = cpu.readMem(addr);
          cpu.writeMem(addr, value & mask);
          cpu.tstates += 15;
        } else {
          cpu[registers[reg]] &= mask;
          cpu.tstates += 8;
        }
      }
    };
  }
}

// 0xC0-0xFF: SET b,r
for (let bit = 0; bit < 8; bit++) {
  for (let reg = 0; reg < 8; reg++) {
    const opcode = 0xc0 + (bit * 8) + reg;
    const mask = 1 << bit;

    cbInstructionTable[opcode] = {
      execute: (cpu) => {
        if (reg === 6) {
          const addr = cpu.getHL();
          const value = cpu.readMem(addr);
          cpu.writeMem(addr, value | mask);
          cpu.tstates += 15;
        } else {
          cpu[registers[reg]] |= mask;
          cpu.tstates += 8;
        }
      }
    };
  }
}
