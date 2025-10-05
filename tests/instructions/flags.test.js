/**
 * Flag behavior tests - specifically H flag for SUB/SBC/CP and DAA
 */
import { Z80CPU } from '../../src/core/cpu.js';
import { InstructionDecoder } from '../../src/decoder/decoder.js';

describe('Flag Behavior Tests', () => {
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

  describe('SUB H flag (half borrow)', () => {
    test('SUB with half borrow: 0x10 - 0x01', () => {
      cpu.a = 0x10;
      cpu.b = 0x01;
      memory.data[0] = 0x90; // SUB B
      decoder.executeInstruction();

      expect(cpu.a).toBe(0x0F);
      expect(cpu.getFlag(Z80CPU.FLAG_H)).toBe(true); // (0 < 1) = borrow from bit 4
    });

    test('SUB with half borrow: 0x10 - 0x0F', () => {
      cpu.a = 0x10;
      cpu.b = 0x0F;
      memory.data[0] = 0x90; // SUB B
      decoder.executeInstruction();

      expect(cpu.a).toBe(0x01);
      expect(cpu.getFlag(Z80CPU.FLAG_H)).toBe(true); // Borrow from bit 4
    });

    test('SUB with half borrow: 0x20 - 0x01', () => {
      cpu.a = 0x20;
      cpu.b = 0x01;
      memory.data[0] = 0x90; // SUB B
      decoder.executeInstruction();

      expect(cpu.a).toBe(0x1F);
      expect(cpu.getFlag(Z80CPU.FLAG_H)).toBe(true); // Borrow from bit 4
    });
  });

  describe('SBC H flag (half borrow with carry)', () => {
    test('SBC with carry and half borrow', () => {
      cpu.a = 0x10;
      cpu.b = 0x01;
      cpu.setFlag(Z80CPU.FLAG_C, true); // Set carry
      memory.data[0] = 0x98; // SBC A,B
      decoder.executeInstruction();

      expect(cpu.a).toBe(0x0E);
      expect(cpu.getFlag(Z80CPU.FLAG_H)).toBe(true); // (0 < 1+1) = borrow
    });

    test('SBC with half borrow from carry', () => {
      cpu.a = 0x10;
      cpu.b = 0x00;
      cpu.setFlag(Z80CPU.FLAG_C, true); // Set carry
      memory.data[0] = 0x98; // SBC A,B
      decoder.executeInstruction();

      expect(cpu.a).toBe(0x0F);
      expect(cpu.getFlag(Z80CPU.FLAG_H)).toBe(true); // (0 < 0+1) = borrow
    });
  });

  describe('CP H flag (half borrow)', () => {
    test('CP with half borrow: 0x10 - 0x01', () => {
      cpu.a = 0x10;
      cpu.b = 0x01;
      memory.data[0] = 0xB8; // CP B
      decoder.executeInstruction();

      expect(cpu.a).toBe(0x10); // A unchanged
      expect(cpu.getFlag(Z80CPU.FLAG_H)).toBe(true); // (0 < 1) = borrow from bit 4
    });

    test('CP with half borrow: 0x10 - 0x0F', () => {
      cpu.a = 0x10;
      cpu.b = 0x0F;
      memory.data[0] = 0xB8; // CP B
      decoder.executeInstruction();

      expect(cpu.a).toBe(0x10); // A unchanged
      expect(cpu.getFlag(Z80CPU.FLAG_H)).toBe(true); // Borrow from bit 4
    });

    test('CP without half borrow: 0x3F - 0x0F', () => {
      cpu.a = 0x3F;
      cpu.b = 0x0F;
      memory.data[0] = 0xB8; // CP B
      decoder.executeInstruction();

      expect(cpu.a).toBe(0x3F); // A unchanged
      expect(cpu.getFlag(Z80CPU.FLAG_H)).toBe(false); // (F >= F) = no borrow
    });
  });

  describe('DAA H flag', () => {
    test('DAA after addition with lower nibble > 9', () => {
      cpu.a = 0x1A; // Lower nibble = 0xA (10)
      cpu.setFlag(Z80CPU.FLAG_N, false); // Addition mode
      memory.data[0] = 0x27; // DAA
      decoder.executeInstruction();

      expect(cpu.a).toBe(0x20); // 0x1A + 0x06 = 0x20
      expect(cpu.getFlag(Z80CPU.FLAG_H)).toBe(true); // Half carry occurred
    });

    test('DAA after addition with lower nibble <= 9', () => {
      cpu.a = 0x19;
      cpu.setFlag(Z80CPU.FLAG_N, false); // Addition mode
      memory.data[0] = 0x27; // DAA
      decoder.executeInstruction();

      expect(cpu.a).toBe(0x19); // No adjustment
      expect(cpu.getFlag(Z80CPU.FLAG_H)).toBe(false); // No half carry
    });

    test('DAA after subtraction with H flag set', () => {
      cpu.a = 0x05;
      cpu.setFlag(Z80CPU.FLAG_N, true); // Subtraction mode
      cpu.setFlag(Z80CPU.FLAG_H, true); // H flag set
      memory.data[0] = 0x27; // DAA
      decoder.executeInstruction();

      expect(cpu.a).toBe(0xFF); // 0x05 - 0x06 = 0xFF (wraps)
      expect(cpu.getFlag(Z80CPU.FLAG_H)).toBe(true); // (5 < 6) = true
    });
  });

  describe('SBC HL,rp carry flag', () => {
    test('SBC HL,BC with borrow', () => {
      cpu.setHL(0x1000);
      cpu.setBC(0x2000);
      cpu.setFlag(Z80CPU.FLAG_C, false);
      memory.data[0] = 0xED;
      memory.data[1] = 0x42; // SBC HL,BC
      decoder.executeInstruction();

      expect(cpu.getHL()).toBe(0xF000); // 0x1000 - 0x2000 = 0xF000 (with borrow)
      expect(cpu.getFlag(Z80CPU.FLAG_C)).toBe(true); // Borrow occurred
    });

    test('SBC HL,BC without borrow', () => {
      cpu.setHL(0x2000);
      cpu.setBC(0x1000);
      cpu.setFlag(Z80CPU.FLAG_C, false);
      memory.data[0] = 0xED;
      memory.data[1] = 0x42; // SBC HL,BC
      decoder.executeInstruction();

      expect(cpu.getHL()).toBe(0x1000); // 0x2000 - 0x1000 = 0x1000
      expect(cpu.getFlag(Z80CPU.FLAG_C)).toBe(false); // No borrow
    });
  });
});
