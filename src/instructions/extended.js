/**
 * ED-prefixed extended instructions
 */
import { Z80CPU } from '../core/cpu.js';

export const edInstructionTable = [];

const registers = ['b', 'c', 'd', 'e', 'h', 'l', null, 'a'];

// 0x40-0x7F: IN r,(C) and OUT (C),r
for (let r = 0; r < 8; r++) {
  const inOpcode = 0x40 + (r << 3);
  const outOpcode = 0x41 + (r << 3);

  edInstructionTable[inOpcode] = {
    execute: (cpu) => {
      const value = cpu.portIn(cpu.getBC());
      if (r !== 6) {
        cpu[registers[r]] = value;
      }
      cpu.setFlag(Z80CPU.FLAG_S, value & 0x80);
      cpu.setFlag(Z80CPU.FLAG_Z, value === 0);
      cpu.setFlag(Z80CPU.FLAG_H, false);
      cpu.setFlag(Z80CPU.FLAG_PV, cpu.getParity(value));
      cpu.setFlag(Z80CPU.FLAG_N, false);
      cpu.setFlag(Z80CPU.FLAG_Y, value & 0x20);
      cpu.setFlag(Z80CPU.FLAG_X, value & 0x08);
      cpu.tstates += 12;
    }
  };

  edInstructionTable[outOpcode] = {
    execute: (cpu) => {
      cpu.portOut(cpu.getBC(), r === 6 ? 0 : cpu[registers[r]]);
      cpu.tstates += 12;
    }
  };
}

// 0x42, 0x52, 0x62, 0x72: SBC HL,rp
const regPairs = ['bc', 'de', 'hl', 'sp'];
for (let rp = 0; rp < 4; rp++) {
  edInstructionTable[0x42 + (rp * 16)] = {
    execute: (cpu) => {
      const hl = cpu.getHL();
      const value = rp === 3 ? cpu.sp : (rp === 2 ? cpu.getHL() : (rp === 1 ? cpu.getDE() : cpu.getBC()));
      const carry = cpu.getFlag(Z80CPU.FLAG_C) ? 1 : 0;
      const result = hl - value - carry;

      const overflow = ((hl ^ value) & (hl ^ result) & 0x8000) !== 0;
      cpu.setFlag(Z80CPU.FLAG_S, result & 0x8000);
      cpu.setFlag(Z80CPU.FLAG_Z, (result & 0xffff) === 0);
      cpu.setFlag(Z80CPU.FLAG_H, ((hl & 0x0fff) - (value & 0x0fff) - carry) & 0x1000);
      cpu.setFlag(Z80CPU.FLAG_PV, overflow);
      cpu.setFlag(Z80CPU.FLAG_N, true);
      cpu.setFlag(Z80CPU.FLAG_C, (result & 0x10000) !== 0); // Borrow occurred
      cpu.setFlag(Z80CPU.FLAG_Y, (result >> 8) & 0x20);
      cpu.setFlag(Z80CPU.FLAG_X, (result >> 8) & 0x08);
      cpu.setHL(result & 0xffff);
      cpu.tstates += 15;
    }
  };

  // 0x4A, 0x5A, 0x6A, 0x7A: ADC HL,rp
  edInstructionTable[0x4a + (rp * 16)] = {
    execute: (cpu) => {
      const hl = cpu.getHL();
      const value = rp === 3 ? cpu.sp : (rp === 2 ? cpu.getHL() : (rp === 1 ? cpu.getDE() : cpu.getBC()));
      const carry = cpu.getFlag(Z80CPU.FLAG_C) ? 1 : 0;
      const result = hl + value + carry;

      const overflow = ((hl ^ result) & (value ^ result) & 0x8000) !== 0;
      cpu.setFlag(Z80CPU.FLAG_S, result & 0x8000);
      cpu.setFlag(Z80CPU.FLAG_Z, (result & 0xffff) === 0);
      cpu.setFlag(Z80CPU.FLAG_H, ((hl & 0x0fff) + (value & 0x0fff) + carry) & 0x1000);
      cpu.setFlag(Z80CPU.FLAG_PV, overflow);
      cpu.setFlag(Z80CPU.FLAG_N, false);
      cpu.setFlag(Z80CPU.FLAG_C, result & 0x10000);
      cpu.setFlag(Z80CPU.FLAG_Y, (result >> 8) & 0x20);
      cpu.setFlag(Z80CPU.FLAG_X, (result >> 8) & 0x08);
      cpu.setHL(result & 0xffff);
      cpu.tstates += 15;
    }
  };

  // 0x43, 0x53, 0x63, 0x73: LD (nn),rp
  edInstructionTable[0x43 + (rp * 16)] = {
    execute: (cpu, decoder) => {
      const addr = decoder.fetchWord();
      const value = rp === 3 ? cpu.sp : (rp === 2 ? cpu.getHL() : (rp === 1 ? cpu.getDE() : cpu.getBC()));
      cpu.writeMemWord(addr, value);
      cpu.tstates += 20;
    }
  };

  // 0x4B, 0x5B, 0x6B, 0x7B: LD rp,(nn)
  edInstructionTable[0x4b + (rp * 16)] = {
    execute: (cpu, decoder) => {
      const addr = decoder.fetchWord();
      const value = cpu.readMemWord(addr);
      if (rp === 3) cpu.sp = value;
      else if (rp === 2) cpu.setHL(value);
      else if (rp === 1) cpu.setDE(value);
      else cpu.setBC(value);
      cpu.tstates += 20;
    }
  };
}

// 0x44, 0x4C, 0x54, 0x5C, 0x64, 0x6C, 0x74, 0x7C: NEG
[0x44, 0x4c, 0x54, 0x5c, 0x64, 0x6c, 0x74, 0x7c].forEach(opcode => {
  edInstructionTable[opcode] = {
    execute: (cpu) => {
      const result = (0 - cpu.a) & 0xff;
      const overflow = cpu.a === 0x80;
      cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
      cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
      cpu.setFlag(Z80CPU.FLAG_H, (0 - (cpu.a & 0x0f)) & 0x10);
      cpu.setFlag(Z80CPU.FLAG_PV, overflow);
      cpu.setFlag(Z80CPU.FLAG_N, true);
      cpu.setFlag(Z80CPU.FLAG_C, cpu.a !== 0);
      cpu.setFlag(Z80CPU.FLAG_Y, result & 0x20);
      cpu.setFlag(Z80CPU.FLAG_X, result & 0x08);
      cpu.a = result;
      cpu.tstates += 8;
    }
  };
});

// 0x45, 0x55, 0x65, 0x75: RETN
[0x45, 0x55, 0x65, 0x75].forEach(opcode => {
  edInstructionTable[opcode] = {
    execute: (cpu) => {
      cpu.iff1 = cpu.iff2;
      cpu.pc = cpu.pop();
      cpu.tstates += 14;
    }
  };
});

// 0x4D, 0x5D, 0x6D, 0x7D: RETI
[0x4d, 0x5d, 0x6d, 0x7d].forEach(opcode => {
  edInstructionTable[opcode] = {
    execute: (cpu) => {
      cpu.iff1 = cpu.iff2;
      cpu.pc = cpu.pop();
      cpu.tstates += 14;
    }
  };
});

// 0x46, 0x4E, 0x66, 0x6E: IM 0/1/2
edInstructionTable[0x46] = edInstructionTable[0x4e] = edInstructionTable[0x66] = edInstructionTable[0x6e] = {
  execute: (cpu) => {
    cpu.im = 0;
    cpu.tstates += 8;
  }
};

edInstructionTable[0x56] = edInstructionTable[0x76] = {
  execute: (cpu) => {
    cpu.im = 1;
    cpu.tstates += 8;
  }
};

edInstructionTable[0x5e] = edInstructionTable[0x7e] = {
  execute: (cpu) => {
    cpu.im = 2;
    cpu.tstates += 8;
  }
};

// 0x47: LD I,A
edInstructionTable[0x47] = {
  execute: (cpu) => {
    cpu.i = cpu.a;
    cpu.tstates += 9;
  }
};

// 0x4F: LD R,A
edInstructionTable[0x4f] = {
  execute: (cpu) => {
    cpu.r = cpu.a;
    cpu.tstates += 9;
  }
};

// 0x57: LD A,I
edInstructionTable[0x57] = {
  execute: (cpu) => {
    cpu.a = cpu.i;
    cpu.setFlag(Z80CPU.FLAG_S, cpu.a & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, cpu.a === 0);
    cpu.setFlag(Z80CPU.FLAG_H, false);
    cpu.setFlag(Z80CPU.FLAG_PV, cpu.iff2);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.tstates += 9;
  }
};

// 0x5F: LD A,R
edInstructionTable[0x5f] = {
  execute: (cpu) => {
    cpu.a = cpu.r;
    cpu.setFlag(Z80CPU.FLAG_S, cpu.a & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, cpu.a === 0);
    cpu.setFlag(Z80CPU.FLAG_H, false);
    cpu.setFlag(Z80CPU.FLAG_PV, cpu.iff2);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.tstates += 9;
  }
};

// 0x67: RRD
edInstructionTable[0x67] = {
  execute: (cpu) => {
    const addr = cpu.getHL();
    const val = cpu.readMem(addr);
    const newVal = ((val >> 4) | (cpu.a << 4)) & 0xff;
    cpu.a = (cpu.a & 0xf0) | (val & 0x0f);
    cpu.writeMem(addr, newVal);
    cpu.setFlag(Z80CPU.FLAG_S, cpu.a & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, cpu.a === 0);
    cpu.setFlag(Z80CPU.FLAG_H, false);
    cpu.setFlag(Z80CPU.FLAG_PV, cpu.getParity(cpu.a));
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.tstates += 18;
  }
};

// 0x6F: RLD
edInstructionTable[0x6f] = {
  execute: (cpu) => {
    const addr = cpu.getHL();
    const val = cpu.readMem(addr);
    const newVal = ((val << 4) | (cpu.a & 0x0f)) & 0xff;
    cpu.a = (cpu.a & 0xf0) | (val >> 4);
    cpu.writeMem(addr, newVal);
    cpu.setFlag(Z80CPU.FLAG_S, cpu.a & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, cpu.a === 0);
    cpu.setFlag(Z80CPU.FLAG_H, false);
    cpu.setFlag(Z80CPU.FLAG_PV, cpu.getParity(cpu.a));
    cpu.setFlag(Z80CPU.FLAG_N, false);
    cpu.setFlag(Z80CPU.FLAG_Y, cpu.a & 0x20);
    cpu.setFlag(Z80CPU.FLAG_X, cpu.a & 0x08);
    cpu.tstates += 18;
  }
};

// Block instructions
edInstructionTable[0xa0] = { // LDI
  execute: (cpu) => {
    const val = cpu.readMem(cpu.getHL());
    cpu.writeMem(cpu.getDE(), val);
    cpu.setHL((cpu.getHL() + 1) & 0xffff);
    cpu.setDE((cpu.getDE() + 1) & 0xffff);
    cpu.setBC((cpu.getBC() - 1) & 0xffff);
    cpu.setFlag(Z80CPU.FLAG_H, false);
    cpu.setFlag(Z80CPU.FLAG_PV, cpu.getBC() !== 0);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    const n = val + cpu.a;
    cpu.setFlag(Z80CPU.FLAG_Y, n & 0x02);
    cpu.setFlag(Z80CPU.FLAG_X, n & 0x08);
    cpu.tstates += 16;
  }
};

edInstructionTable[0xb0] = { // LDIR
  execute: (cpu) => {
    const val = cpu.readMem(cpu.getHL());
    cpu.writeMem(cpu.getDE(), val);
    cpu.setHL((cpu.getHL() + 1) & 0xffff);
    cpu.setDE((cpu.getDE() + 1) & 0xffff);
    cpu.setBC((cpu.getBC() - 1) & 0xffff);

    if (cpu.getBC() !== 0) {
      cpu.pc = (cpu.pc - 2) & 0xffff;
      cpu.tstates += 21;
    } else {
      cpu.tstates += 16;
    }

    cpu.setFlag(Z80CPU.FLAG_H, false);
    cpu.setFlag(Z80CPU.FLAG_PV, false);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    const n = val + cpu.a;
    cpu.setFlag(Z80CPU.FLAG_Y, n & 0x02);
    cpu.setFlag(Z80CPU.FLAG_X, n & 0x08);
  }
};

edInstructionTable[0xa1] = { // CPI
  execute: (cpu) => {
    const val = cpu.readMem(cpu.getHL());
    const result = (cpu.a - val) & 0xff;
    cpu.setHL((cpu.getHL() + 1) & 0xffff);
    cpu.setBC((cpu.getBC() - 1) & 0xffff);

    const h = ((cpu.a & 0x0f) - (val & 0x0f)) & 0x10;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, h);
    cpu.setFlag(Z80CPU.FLAG_PV, cpu.getBC() !== 0);
    cpu.setFlag(Z80CPU.FLAG_N, true);
    const n = result - (h ? 1 : 0);
    cpu.setFlag(Z80CPU.FLAG_Y, n & 0x02);
    cpu.setFlag(Z80CPU.FLAG_X, n & 0x08);
    cpu.tstates += 16;
  }
};

edInstructionTable[0xb1] = { // CPIR
  execute: (cpu) => {
    const val = cpu.readMem(cpu.getHL());
    const result = (cpu.a - val) & 0xff;
    cpu.setHL((cpu.getHL() + 1) & 0xffff);
    cpu.setBC((cpu.getBC() - 1) & 0xffff);

    if (cpu.getBC() !== 0 && result !== 0) {
      cpu.pc = (cpu.pc - 2) & 0xffff;
      cpu.tstates += 21;
    } else {
      cpu.tstates += 16;
    }

    const h = ((cpu.a & 0x0f) - (val & 0x0f)) & 0x10;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, h);
    cpu.setFlag(Z80CPU.FLAG_PV, cpu.getBC() !== 0);
    cpu.setFlag(Z80CPU.FLAG_N, true);
    const n = result - (h ? 1 : 0);
    cpu.setFlag(Z80CPU.FLAG_Y, n & 0x02);
    cpu.setFlag(Z80CPU.FLAG_X, n & 0x08);
  }
};

edInstructionTable[0xa8] = { // LDD
  execute: (cpu) => {
    const val = cpu.readMem(cpu.getHL());
    cpu.writeMem(cpu.getDE(), val);
    cpu.setHL((cpu.getHL() - 1) & 0xffff);
    cpu.setDE((cpu.getDE() - 1) & 0xffff);
    cpu.setBC((cpu.getBC() - 1) & 0xffff);
    cpu.setFlag(Z80CPU.FLAG_H, false);
    cpu.setFlag(Z80CPU.FLAG_PV, cpu.getBC() !== 0);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    const n = val + cpu.a;
    cpu.setFlag(Z80CPU.FLAG_Y, n & 0x02);
    cpu.setFlag(Z80CPU.FLAG_X, n & 0x08);
    cpu.tstates += 16;
  }
};

edInstructionTable[0xb8] = { // LDDR
  execute: (cpu) => {
    const val = cpu.readMem(cpu.getHL());
    cpu.writeMem(cpu.getDE(), val);
    cpu.setHL((cpu.getHL() - 1) & 0xffff);
    cpu.setDE((cpu.getDE() - 1) & 0xffff);
    cpu.setBC((cpu.getBC() - 1) & 0xffff);

    if (cpu.getBC() !== 0) {
      cpu.pc = (cpu.pc - 2) & 0xffff;
      cpu.tstates += 21;
    } else {
      cpu.tstates += 16;
    }

    cpu.setFlag(Z80CPU.FLAG_H, false);
    cpu.setFlag(Z80CPU.FLAG_PV, false);
    cpu.setFlag(Z80CPU.FLAG_N, false);
    const n = val + cpu.a;
    cpu.setFlag(Z80CPU.FLAG_Y, n & 0x02);
    cpu.setFlag(Z80CPU.FLAG_X, n & 0x08);
  }
};

edInstructionTable[0xa9] = { // CPD
  execute: (cpu) => {
    const val = cpu.readMem(cpu.getHL());
    const result = (cpu.a - val) & 0xff;
    cpu.setHL((cpu.getHL() - 1) & 0xffff);
    cpu.setBC((cpu.getBC() - 1) & 0xffff);

    const h = ((cpu.a & 0x0f) - (val & 0x0f)) & 0x10;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, h);
    cpu.setFlag(Z80CPU.FLAG_PV, cpu.getBC() !== 0);
    cpu.setFlag(Z80CPU.FLAG_N, true);
    const n = result - (h ? 1 : 0);
    cpu.setFlag(Z80CPU.FLAG_Y, n & 0x02);
    cpu.setFlag(Z80CPU.FLAG_X, n & 0x08);
    cpu.tstates += 16;
  }
};

edInstructionTable[0xb9] = { // CPDR
  execute: (cpu) => {
    const val = cpu.readMem(cpu.getHL());
    const result = (cpu.a - val) & 0xff;
    cpu.setHL((cpu.getHL() - 1) & 0xffff);
    cpu.setBC((cpu.getBC() - 1) & 0xffff);

    if (cpu.getBC() !== 0 && result !== 0) {
      cpu.pc = (cpu.pc - 2) & 0xffff;
      cpu.tstates += 21;
    } else {
      cpu.tstates += 16;
    }

    const h = ((cpu.a & 0x0f) - (val & 0x0f)) & 0x10;
    cpu.setFlag(Z80CPU.FLAG_S, result & 0x80);
    cpu.setFlag(Z80CPU.FLAG_Z, result === 0);
    cpu.setFlag(Z80CPU.FLAG_H, h);
    cpu.setFlag(Z80CPU.FLAG_PV, cpu.getBC() !== 0);
    cpu.setFlag(Z80CPU.FLAG_N, true);
    const n = result - (h ? 1 : 0);
    cpu.setFlag(Z80CPU.FLAG_Y, n & 0x02);
    cpu.setFlag(Z80CPU.FLAG_X, n & 0x08);
  }
};

// I/O block instructions
edInstructionTable[0xa2] = { // INI
  execute: (cpu) => {
    const val = cpu.portIn(cpu.getBC());
    cpu.writeMem(cpu.getHL(), val);
    cpu.b = (cpu.b - 1) & 0xff;
    cpu.setHL((cpu.getHL() + 1) & 0xffff);
    cpu.setFlag(Z80CPU.FLAG_Z, cpu.b === 0);
    cpu.setFlag(Z80CPU.FLAG_N, true);
    cpu.tstates += 16;
  }
};

edInstructionTable[0xb2] = { // INIR
  execute: (cpu) => {
    const val = cpu.portIn(cpu.getBC());
    cpu.writeMem(cpu.getHL(), val);
    cpu.b = (cpu.b - 1) & 0xff;
    cpu.setHL((cpu.getHL() + 1) & 0xffff);

    if (cpu.b !== 0) {
      cpu.pc = (cpu.pc - 2) & 0xffff;
      cpu.tstates += 21;
    } else {
      cpu.tstates += 16;
    }

    cpu.setFlag(Z80CPU.FLAG_Z, true);
    cpu.setFlag(Z80CPU.FLAG_N, true);
  }
};

edInstructionTable[0xa3] = { // OUTI
  execute: (cpu) => {
    const val = cpu.readMem(cpu.getHL());
    cpu.b = (cpu.b - 1) & 0xff;
    cpu.portOut(cpu.getBC(), val);
    cpu.setHL((cpu.getHL() + 1) & 0xffff);
    cpu.setFlag(Z80CPU.FLAG_Z, cpu.b === 0);
    cpu.setFlag(Z80CPU.FLAG_N, true);
    cpu.tstates += 16;
  }
};

edInstructionTable[0xb3] = { // OTIR
  execute: (cpu) => {
    const val = cpu.readMem(cpu.getHL());
    cpu.b = (cpu.b - 1) & 0xff;
    cpu.portOut(cpu.getBC(), val);
    cpu.setHL((cpu.getHL() + 1) & 0xffff);

    if (cpu.b !== 0) {
      cpu.pc = (cpu.pc - 2) & 0xffff;
      cpu.tstates += 21;
    } else {
      cpu.tstates += 16;
    }

    cpu.setFlag(Z80CPU.FLAG_Z, true);
    cpu.setFlag(Z80CPU.FLAG_N, true);
  }
};

edInstructionTable[0xaa] = { // IND
  execute: (cpu) => {
    const val = cpu.portIn(cpu.getBC());
    cpu.writeMem(cpu.getHL(), val);
    cpu.b = (cpu.b - 1) & 0xff;
    cpu.setHL((cpu.getHL() - 1) & 0xffff);
    cpu.setFlag(Z80CPU.FLAG_Z, cpu.b === 0);
    cpu.setFlag(Z80CPU.FLAG_N, true);
    cpu.tstates += 16;
  }
};

edInstructionTable[0xba] = { // INDR
  execute: (cpu) => {
    const val = cpu.portIn(cpu.getBC());
    cpu.writeMem(cpu.getHL(), val);
    cpu.b = (cpu.b - 1) & 0xff;
    cpu.setHL((cpu.getHL() - 1) & 0xffff);

    if (cpu.b !== 0) {
      cpu.pc = (cpu.pc - 2) & 0xffff;
      cpu.tstates += 21;
    } else {
      cpu.tstates += 16;
    }

    cpu.setFlag(Z80CPU.FLAG_Z, true);
    cpu.setFlag(Z80CPU.FLAG_N, true);
  }
};

edInstructionTable[0xab] = { // OUTD
  execute: (cpu) => {
    const val = cpu.readMem(cpu.getHL());
    cpu.b = (cpu.b - 1) & 0xff;
    cpu.portOut(cpu.getBC(), val);
    cpu.setHL((cpu.getHL() - 1) & 0xffff);
    cpu.setFlag(Z80CPU.FLAG_Z, cpu.b === 0);
    cpu.setFlag(Z80CPU.FLAG_N, true);
    cpu.tstates += 16;
  }
};

edInstructionTable[0xbb] = { // OTDR
  execute: (cpu) => {
    const val = cpu.readMem(cpu.getHL());
    cpu.b = (cpu.b - 1) & 0xff;
    cpu.portOut(cpu.getBC(), val);
    cpu.setHL((cpu.getHL() - 1) & 0xffff);

    if (cpu.b !== 0) {
      cpu.pc = (cpu.pc - 2) & 0xffff;
      cpu.tstates += 21;
    } else {
      cpu.tstates += 16;
    }

    cpu.setFlag(Z80CPU.FLAG_Z, true);
    cpu.setFlag(Z80CPU.FLAG_N, true);
  }
};
