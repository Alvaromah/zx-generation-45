/**
 * Undocumented Z80 instructions test suite
 * Tests IXH/IXL/IYH/IYL split register access
 * Critical for games like Manic Miner
 */
import { Z80CPU } from '../../src/core/cpu.js';
import { InstructionDecoder } from '../../src/decoder/decoder.js';

describe('Undocumented Z80 Instructions', () => {
  let cpu, decoder, memory;

  beforeEach(() => {
    cpu = new Z80CPU();
    memory = {
      data: new Uint8Array(65536),
      read: function(addr) { return this.data[addr & 0xffff]; },
      write: function(addr, val) { this.data[addr & 0xffff] = val & 0xff; }
    };
    cpu.memory = memory;
    cpu.io = { read: () => 0xff, write: () => {} };
    decoder = new InstructionDecoder(cpu);
  });

  describe('IX Split Register Access (IXH/IXL)', () => {
    test('should access IXH and IXL separately', () => {
      cpu.ix = 0x1234;
      expect(cpu.getIXH()).toBe(0x12);
      expect(cpu.getIXL()).toBe(0x34);
    });

    test('should set IXH without affecting IXL', () => {
      cpu.ix = 0x1234;
      cpu.setIXH(0xAB);
      expect(cpu.ix).toBe(0xAB34);
      expect(cpu.getIXH()).toBe(0xAB);
      expect(cpu.getIXL()).toBe(0x34);
    });

    test('should set IXL without affecting IXH', () => {
      cpu.ix = 0x1234;
      cpu.setIXL(0xCD);
      expect(cpu.ix).toBe(0x12CD);
      expect(cpu.getIXH()).toBe(0x12);
      expect(cpu.getIXL()).toBe(0xCD);
    });

    test('DD 7C: LD A,IXH', () => {
      cpu.ix = 0x5678;
      memory.data[0] = 0xDD;
      memory.data[1] = 0x7C;
      decoder.executeInstruction();

      expect(cpu.a).toBe(0x56);
      expect(cpu.tstates).toBe(8); // DD instructions include prefix timing
    });

    test('DD 7D: LD A,IXL', () => {
      cpu.ix = 0x5678;
      memory.data[0] = 0xDD;
      memory.data[1] = 0x7D;
      decoder.executeInstruction();

      expect(cpu.a).toBe(0x78);
    });

    test('DD 67: LD IXH,A', () => {
      cpu.ix = 0x1234;
      cpu.a = 0xAB;
      memory.data[0] = 0xDD;
      memory.data[1] = 0x67;
      decoder.executeInstruction();

      expect(cpu.ix).toBe(0xAB34);
    });

    test('DD 6F: LD IXL,A', () => {
      cpu.ix = 0x1234;
      cpu.a = 0xCD;
      memory.data[0] = 0xDD;
      memory.data[1] = 0x6F;
      decoder.executeInstruction();

      expect(cpu.ix).toBe(0x12CD);
    });

    test('DD 26 nn: LD IXH,n', () => {
      cpu.ix = 0x1234;
      memory.data[0] = 0xDD;
      memory.data[1] = 0x26;
      memory.data[2] = 0x99;
      decoder.executeInstruction();

      expect(cpu.ix).toBe(0x9934);
    });

    test('DD 2E nn: LD IXL,n', () => {
      cpu.ix = 0x1234;
      memory.data[0] = 0xDD;
      memory.data[1] = 0x2E;
      memory.data[2] = 0x88;
      decoder.executeInstruction();

      expect(cpu.ix).toBe(0x1288);
    });

    test('DD 24: INC IXH', () => {
      cpu.ix = 0x12FF;
      memory.data[0] = 0xDD;
      memory.data[1] = 0x24;
      decoder.executeInstruction();

      expect(cpu.ix).toBe(0x13FF);
      expect(cpu.getFlag(Z80CPU.FLAG_Z)).toBe(false);
    });

    test('DD 25: DEC IXH', () => {
      cpu.ix = 0x0134;
      memory.data[0] = 0xDD;
      memory.data[1] = 0x25;
      decoder.executeInstruction();

      expect(cpu.ix).toBe(0x0034);
      expect(cpu.getFlag(Z80CPU.FLAG_Z)).toBe(true);
    });

    test('DD 2C: INC IXL', () => {
      cpu.ix = 0x12FF;
      memory.data[0] = 0xDD;
      memory.data[1] = 0x2C;
      decoder.executeInstruction();

      expect(cpu.ix).toBe(0x1200);
      expect(cpu.getFlag(Z80CPU.FLAG_Z)).toBe(true);
    });

    test('DD 2D: DEC IXL', () => {
      cpu.ix = 0x1201;
      memory.data[0] = 0xDD;
      memory.data[1] = 0x2D;
      decoder.executeInstruction();

      expect(cpu.ix).toBe(0x1200);
      expect(cpu.getFlag(Z80CPU.FLAG_Z)).toBe(true);
    });

    test('DD 84: ADD A,IXH', () => {
      cpu.ix = 0x2000;
      cpu.a = 0x30;
      memory.data[0] = 0xDD;
      memory.data[1] = 0x84;
      decoder.executeInstruction();

      expect(cpu.a).toBe(0x50);
      expect(cpu.getFlag(Z80CPU.FLAG_Z)).toBe(false);
      expect(cpu.getFlag(Z80CPU.FLAG_C)).toBe(false);
    });

    test('DD 94: SUB IXH', () => {
      cpu.ix = 0x1500;
      cpu.a = 0x30;
      memory.data[0] = 0xDD;
      memory.data[1] = 0x94;
      decoder.executeInstruction();

      expect(cpu.a).toBe(0x1B); // 0x30 - 0x15 = 0x1B
      expect(cpu.getFlag(Z80CPU.FLAG_N)).toBe(true);
    });

    test('DD A4: AND IXH', () => {
      cpu.ix = 0xF000;
      cpu.a = 0xFF;
      memory.data[0] = 0xDD;
      memory.data[1] = 0xA4;
      decoder.executeInstruction();

      expect(cpu.a).toBe(0xF0);
      expect(cpu.getFlag(Z80CPU.FLAG_H)).toBe(true);
    });

    test('DD BC: CP IXH', () => {
      cpu.ix = 0x2000;
      cpu.a = 0x20;
      memory.data[0] = 0xDD;
      memory.data[1] = 0xBC;
      decoder.executeInstruction();

      expect(cpu.a).toBe(0x20); // A unchanged
      expect(cpu.getFlag(Z80CPU.FLAG_Z)).toBe(true);
    });

    test('DD 44: LD B,IXH and DD 60: LD IXH,B (round trip)', () => {
      cpu.ix = 0xAB00;

      // LD B,IXH
      memory.data[0] = 0xDD;
      memory.data[1] = 0x44;
      decoder.executeInstruction();
      expect(cpu.b).toBe(0xAB);

      // Change IX
      cpu.ix = 0x0000;
      cpu.pc = 0;

      // LD IXH,B
      memory.data[0] = 0xDD;
      memory.data[1] = 0x60;
      decoder.executeInstruction();
      expect(cpu.ix).toBe(0xAB00);
    });
  });

  describe('IY Split Register Access (IYH/IYL)', () => {
    test('should access IYH and IYL separately', () => {
      cpu.iy = 0xABCD;
      expect(cpu.getIYH()).toBe(0xAB);
      expect(cpu.getIYL()).toBe(0xCD);
    });

    test('FD 7C: LD A,IYH', () => {
      cpu.iy = 0x9876;
      memory.data[0] = 0xFD;
      memory.data[1] = 0x7C;
      decoder.executeInstruction();

      expect(cpu.a).toBe(0x98);
    });

    test('FD 7D: LD A,IYL', () => {
      cpu.iy = 0x9876;
      memory.data[0] = 0xFD;
      memory.data[1] = 0x7D;
      decoder.executeInstruction();

      expect(cpu.a).toBe(0x76);
    });

    test('FD 67: LD IYH,A', () => {
      cpu.iy = 0x0000;
      cpu.a = 0xDE;
      memory.data[0] = 0xFD;
      memory.data[1] = 0x67;
      decoder.executeInstruction();

      expect(cpu.iy).toBe(0xDE00);
    });

    test('FD 24: INC IYH with overflow flag', () => {
      cpu.iy = 0x7F00;
      memory.data[0] = 0xFD;
      memory.data[1] = 0x24;
      decoder.executeInstruction();

      expect(cpu.iy).toBe(0x8000);
      expect(cpu.getFlag(Z80CPU.FLAG_PV)).toBe(true); // Overflow
      expect(cpu.getFlag(Z80CPU.FLAG_S)).toBe(true); // Sign
    });

    test('FD 2D: DEC IYL with overflow flag', () => {
      cpu.iy = 0x0080;
      memory.data[0] = 0xFD;
      memory.data[1] = 0x2D;
      decoder.executeInstruction();

      expect(cpu.iy).toBe(0x007F);
      expect(cpu.getFlag(Z80CPU.FLAG_PV)).toBe(true); // Overflow
    });

    test('FD 85: ADD A,IYL', () => {
      cpu.iy = 0x0042;
      cpu.a = 0x10;
      memory.data[0] = 0xFD;
      memory.data[1] = 0x85;
      decoder.executeInstruction();

      expect(cpu.a).toBe(0x52);
    });

    test('FD AC: XOR IYH', () => {
      cpu.iy = 0xAA00;
      cpu.a = 0xFF;
      memory.data[0] = 0xFD;
      memory.data[1] = 0xAC;
      decoder.executeInstruction();

      expect(cpu.a).toBe(0x55); // 0xFF XOR 0xAA = 0x55
      expect(cpu.getFlag(Z80CPU.FLAG_H)).toBe(false);
    });
  });

  describe('Complex Undocumented Operations', () => {
    test('IXL to IYH transfer via A', () => {
      cpu.ix = 0x0042;
      cpu.iy = 0x0000;

      // LD A,IXL
      memory.data[0] = 0xDD;
      memory.data[1] = 0x7D;
      decoder.executeInstruction();
      expect(cpu.a).toBe(0x42);

      cpu.pc = 0;

      // LD IYH,A
      memory.data[0] = 0xFD;
      memory.data[1] = 0x67;
      decoder.executeInstruction();
      expect(cpu.iy).toBe(0x4200);
    });

    test('INC IXH affects flags correctly', () => {
      cpu.ix = 0xFF00;
      memory.data[0] = 0xDD;
      memory.data[1] = 0x24;
      decoder.executeInstruction();

      expect(cpu.ix).toBe(0x0000);
      expect(cpu.getFlag(Z80CPU.FLAG_Z)).toBe(true);
      expect(cpu.getFlag(Z80CPU.FLAG_H)).toBe(true); // Half-carry from 0x0F to 0x10
      expect(cpu.getFlag(Z80CPU.FLAG_S)).toBe(false); // Positive
    });

    test('SUB with IXL sets half-carry correctly', () => {
      cpu.ix = 0x000F;
      cpu.a = 0x10;
      memory.data[0] = 0xDD;
      memory.data[1] = 0x95; // SUB IXL
      decoder.executeInstruction();

      expect(cpu.a).toBe(0x01);
      expect(cpu.getFlag(Z80CPU.FLAG_H)).toBe(true); // Borrow from bit 4
    });

    test('AND with IYH sets parity correctly', () => {
      cpu.iy = 0x0F00;
      cpu.a = 0xFF;
      memory.data[0] = 0xFD;
      memory.data[1] = 0xA4; // AND IYH
      decoder.executeInstruction();

      expect(cpu.a).toBe(0x0F);
      expect(cpu.getFlag(Z80CPU.FLAG_PV)).toBe(true); // Even parity (4 bits set)
    });
  });

  describe('Manic Miner Compatibility Tests', () => {
    test('Common pattern: LD A,IXH / ADD A,n', () => {
      cpu.ix = 0x4000; // Common screen address pattern
      cpu.a = 0;

      // LD A,IXH
      memory.data[0] = 0xDD;
      memory.data[1] = 0x7C;
      decoder.executeInstruction();
      expect(cpu.a).toBe(0x40);

      cpu.pc = 0;

      // ADD A,0x18
      memory.data[0] = 0xC6;
      memory.data[1] = 0x18;
      decoder.executeInstruction();
      expect(cpu.a).toBe(0x58); // 0x40 + 0x18 = 0x5800 (attribute memory)
    });

    test('Register shuffling pattern', () => {
      cpu.ix = 0x1234;

      // LD B,IXH
      memory.data[0] = 0xDD;
      memory.data[1] = 0x44;
      decoder.executeInstruction();

      cpu.pc = 0;

      // LD C,IXL
      memory.data[0] = 0xDD;
      memory.data[1] = 0x4D;
      decoder.executeInstruction();

      expect(cpu.b).toBe(0x12);
      expect(cpu.c).toBe(0x34);
      expect(cpu.getBC()).toBe(0x1234);
    });
  });
});
