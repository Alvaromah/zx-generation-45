/**
 * Integration tests for basic emulation
 */
import { Z80CPU } from '../../src/core/cpu.js';
import { InstructionDecoder } from '../../src/decoder/decoder.js';
import { Memory } from '../../src/spectrum/memory.js';

describe('Basic Integration Tests', () => {
  let cpu, decoder, memory;

  beforeEach(() => {
    cpu = new Z80CPU();
    memory = new Memory();
    cpu.memory = memory;
    cpu.io = { read: () => 0xff, write: () => {} };
    decoder = new InstructionDecoder(cpu);

    // Load minimal ROM
    const rom = new Uint8Array(16384);
    rom.fill(0);
    memory.loadROM(rom);

    cpu.reset();
  });

  test('should execute simple program', () => {
    // LD A,42
    // LD B,A
    // HALT
    memory.ram.set([0x3E, 0x42, 0x47, 0x76], 0);
    cpu.pc = 0x4000;

    decoder.executeInstruction(); // LD A,42
    expect(cpu.a).toBe(0x42);

    decoder.executeInstruction(); // LD B,A
    expect(cpu.b).toBe(0x42);

    decoder.executeInstruction(); // HALT
    expect(cpu.halted).toBe(true);
  });

  test('should handle loop correctly', () => {
    // LD B,5      @ 0x4000
    // DEC B       @ 0x4002
    // JR NZ,-3    @ 0x4003  (offset 0xFD = -3, jumps back to 0x4002)
    // HALT        @ 0x4005
    memory.ram.set([0x06, 0x05, 0x05, 0x20, 0xFD, 0x76], 0);
    cpu.pc = 0x4000;

    decoder.executeInstruction(); // LD B,5
    expect(cpu.b).toBe(5);
    expect(cpu.pc).toBe(0x4002);

    // Loop iterations
    for (let i = 0; i < 5; i++) {
      decoder.executeInstruction(); // DEC B
      expect(cpu.b).toBe(4 - i);

      if (i < 4) {
        decoder.executeInstruction(); // JR NZ (taken)
        expect(cpu.pc).toBe(0x4002); // jumped back to DEC B
      }
    }

    // After last DEC B, B=0, Z flag set
    decoder.executeInstruction(); // JR NZ (not taken because Z=1)
    expect(cpu.pc).toBe(0x4005);

    decoder.executeInstruction(); // HALT
    expect(cpu.halted).toBe(true);
  });

  test('should handle stack operations', () => {
    // LD BC,1234h
    // PUSH BC
    // POP HL
    // HALT
    memory.ram.set([0x01, 0x34, 0x12, 0xC5, 0xE1, 0x76], 0);
    cpu.pc = 0x4000;
    cpu.sp = 0xFFFE;

    decoder.executeInstruction(); // LD BC,1234h
    expect(cpu.getBC()).toBe(0x1234);

    decoder.executeInstruction(); // PUSH BC
    expect(cpu.sp).toBe(0xFFFC);

    decoder.executeInstruction(); // POP HL
    expect(cpu.getHL()).toBe(0x1234);
    expect(cpu.sp).toBe(0xFFFE);
  });

  test('should execute arithmetic correctly', () => {
    // LD A,10
    // LD B,5
    // ADD A,B
    // SUB 3
    // HALT
    memory.ram.set([0x3E, 0x0A, 0x06, 0x05, 0x80, 0xD6, 0x03, 0x76], 0);
    cpu.pc = 0x4000;

    decoder.executeInstruction(); // LD A,10
    expect(cpu.a).toBe(10);

    decoder.executeInstruction(); // LD B,5
    expect(cpu.b).toBe(5);

    decoder.executeInstruction(); // ADD A,B
    expect(cpu.a).toBe(15);

    decoder.executeInstruction(); // SUB 3
    expect(cpu.a).toBe(12);
  });
});
