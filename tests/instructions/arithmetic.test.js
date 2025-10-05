/**
 * Arithmetic instruction tests
 */
import { Z80CPU } from '../../src/core/cpu.js';
import { InstructionDecoder } from '../../src/decoder/decoder.js';

describe('Arithmetic Instructions', () => {
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

  describe('ADD A,r', () => {
    test('ADD A,B should add B to A', () => {
      cpu.a = 0x10;
      cpu.b = 0x05;
      memory.data[0] = 0x80; // ADD A,B
      decoder.executeInstruction();

      expect(cpu.a).toBe(0x15);
      expect(cpu.getFlag(Z80CPU.FLAG_Z)).toBe(false);
      expect(cpu.getFlag(Z80CPU.FLAG_C)).toBe(false);
    });

    test('ADD A,A should double A', () => {
      cpu.a = 0x80;
      memory.data[0] = 0x87; // ADD A,A
      decoder.executeInstruction();

      expect(cpu.a).toBe(0x00);
      expect(cpu.getFlag(Z80CPU.FLAG_Z)).toBe(true);
      expect(cpu.getFlag(Z80CPU.FLAG_C)).toBe(true);
    });

    test('should set carry flag on overflow', () => {
      cpu.a = 0xFF;
      cpu.b = 0x01;
      memory.data[0] = 0x80; // ADD A,B
      decoder.executeInstruction();

      expect(cpu.a).toBe(0x00);
      expect(cpu.getFlag(Z80CPU.FLAG_C)).toBe(true);
      expect(cpu.getFlag(Z80CPU.FLAG_Z)).toBe(true);
    });
  });

  describe('SUB r', () => {
    test('SUB B should subtract B from A', () => {
      cpu.a = 0x10;
      cpu.b = 0x05;
      memory.data[0] = 0x90; // SUB B
      decoder.executeInstruction();

      expect(cpu.a).toBe(0x0B);
      expect(cpu.getFlag(Z80CPU.FLAG_Z)).toBe(false);
      expect(cpu.getFlag(Z80CPU.FLAG_N)).toBe(true);
    });

    test('should set zero flag when result is zero', () => {
      cpu.a = 0x05;
      cpu.b = 0x05;
      memory.data[0] = 0x90; // SUB B
      decoder.executeInstruction();

      expect(cpu.a).toBe(0x00);
      expect(cpu.getFlag(Z80CPU.FLAG_Z)).toBe(true);
    });
  });

  describe('INC r', () => {
    test('INC B should increment B', () => {
      cpu.b = 0x10;
      memory.data[0] = 0x04; // INC B
      decoder.executeInstruction();

      expect(cpu.b).toBe(0x11);
      expect(cpu.getFlag(Z80CPU.FLAG_Z)).toBe(false);
    });

    test('should set zero flag when incrementing 0xFF', () => {
      cpu.b = 0xFF;
      memory.data[0] = 0x04; // INC B
      decoder.executeInstruction();

      expect(cpu.b).toBe(0x00);
      expect(cpu.getFlag(Z80CPU.FLAG_Z)).toBe(true);
    });
  });

  describe('DEC r', () => {
    test('DEC C should decrement C', () => {
      cpu.c = 0x10;
      memory.data[0] = 0x0D; // DEC C
      decoder.executeInstruction();

      expect(cpu.c).toBe(0x0F);
      expect(cpu.getFlag(Z80CPU.FLAG_Z)).toBe(false);
    });

    test('should set zero flag when decrementing 1', () => {
      cpu.c = 0x01;
      memory.data[0] = 0x0D; // DEC C
      decoder.executeInstruction();

      expect(cpu.c).toBe(0x00);
      expect(cpu.getFlag(Z80CPU.FLAG_Z)).toBe(true);
    });
  });

  describe('CP r', () => {
    test('CP B should compare A with B', () => {
      cpu.a = 0x10;
      cpu.b = 0x05;
      memory.data[0] = 0xB8; // CP B
      decoder.executeInstruction();

      expect(cpu.a).toBe(0x10); // A unchanged
      expect(cpu.getFlag(Z80CPU.FLAG_Z)).toBe(false);
      expect(cpu.getFlag(Z80CPU.FLAG_C)).toBe(false);
    });

    test('should set zero flag when values are equal', () => {
      cpu.a = 0x42;
      cpu.b = 0x42;
      memory.data[0] = 0xB8; // CP B
      decoder.executeInstruction();

      expect(cpu.getFlag(Z80CPU.FLAG_Z)).toBe(true);
    });
  });
});
