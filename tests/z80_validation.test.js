/**
 * Z80 CPU Validation Tests
 * Tests critical Z80 instructions against known behavior
 */
import { Z80CPU } from '../src/core/cpu.js';
import { InstructionDecoder } from '../src/decoder/decoder.js';

describe('Z80 Instruction Validation', () => {
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

  describe('Relative Jumps', () => {
    test('JR offset calculation', () => {
      // JR label (forward jump)
      memory.data[0x4000] = 0x18; // JR
      memory.data[0x4001] = 0x05; // offset +5
      cpu.pc = 0x4000;

      decoder.executeInstruction();
      // After fetching: PC = 0x4002
      // PC + offset = 0x4002 + 5 = 0x4007
      expect(cpu.pc).toBe(0x4007);
    });

    test('JR with negative offset', () => {
      // JR label (backward jump)
      memory.data[0x4000] = 0x18; // JR
      memory.data[0x4001] = 0xFE; // offset -2
      cpu.pc = 0x4000;

      decoder.executeInstruction();
      // After fetching: PC = 0x4002
      // PC + offset = 0x4002 + (-2) = 0x4000
      expect(cpu.pc).toBe(0x4000);
    });

    test('DJNZ offset calculation', () => {
      memory.data[0x4000] = 0x10; // DJNZ
      memory.data[0x4001] = 0xFE; // offset -2
      cpu.pc = 0x4000;
      cpu.b = 2;

      decoder.executeInstruction();
      expect(cpu.b).toBe(1);
      // PC + offset = 0x4002 + (-2) = 0x4000
      expect(cpu.pc).toBe(0x4000);
    });
  });

  describe('Flag Behavior', () => {
    test('ADD sets carry on overflow', () => {
      cpu.a = 0xFF;
      cpu.b = 0x01;
      memory.data[0] = 0x80; // ADD A,B

      decoder.executeInstruction();
      expect(cpu.a).toBe(0x00);
      expect(cpu.getFlag(Z80CPU.FLAG_C)).toBe(true);
      expect(cpu.getFlag(Z80CPU.FLAG_Z)).toBe(true);
      expect(cpu.getFlag(Z80CPU.FLAG_S)).toBe(false);
    });

    test('ADD sets overflow flag correctly', () => {
      cpu.a = 0x7F; // +127
      cpu.b = 0x01; // +1
      memory.data[0] = 0x80; // ADD A,B

      decoder.executeInstruction();
      expect(cpu.a).toBe(0x80);
      expect(cpu.getFlag(Z80CPU.FLAG_PV)).toBe(true); // overflow
      expect(cpu.getFlag(Z80CPU.FLAG_S)).toBe(true); // negative result
    });

    test('SUB sets flags correctly', () => {
      cpu.a = 0x00;
      cpu.b = 0x01;
      memory.data[0] = 0x90; // SUB B

      decoder.executeInstruction();
      expect(cpu.a).toBe(0xFF);
      expect(cpu.getFlag(Z80CPU.FLAG_C)).toBe(true); // borrow
      expect(cpu.getFlag(Z80CPU.FLAG_N)).toBe(true); // subtract
      expect(cpu.getFlag(Z80CPU.FLAG_S)).toBe(true); // negative
    });

    test('INC does not affect carry', () => {
      cpu.setFlag(Z80CPU.FLAG_C, true);
      cpu.a = 0xFF;
      memory.data[0] = 0x3C; // INC A

      decoder.executeInstruction();
      expect(cpu.a).toBe(0x00);
      expect(cpu.getFlag(Z80CPU.FLAG_C)).toBe(true); // unchanged
      expect(cpu.getFlag(Z80CPU.FLAG_Z)).toBe(true);
    });

    test('DEC does not affect carry', () => {
      cpu.setFlag(Z80CPU.FLAG_C, true);
      cpu.a = 0x01;
      memory.data[0] = 0x3D; // DEC A

      decoder.executeInstruction();
      expect(cpu.a).toBe(0x00);
      expect(cpu.getFlag(Z80CPU.FLAG_C)).toBe(true); // unchanged
      expect(cpu.getFlag(Z80CPU.FLAG_Z)).toBe(true);
    });
  });

  describe('16-bit Operations', () => {
    test('ADD HL,BC sets flags correctly', () => {
      cpu.setHL(0xFFFF);
      cpu.setBC(0x0001);
      memory.data[0] = 0x09; // ADD HL,BC

      decoder.executeInstruction();
      expect(cpu.getHL()).toBe(0x0000);
      expect(cpu.getFlag(Z80CPU.FLAG_C)).toBe(true);
      expect(cpu.getFlag(Z80CPU.FLAG_N)).toBe(false);
    });

    test('INC BC wraps correctly', () => {
      cpu.setBC(0xFFFF);
      memory.data[0] = 0x03; // INC BC

      decoder.executeInstruction();
      expect(cpu.getBC()).toBe(0x0000);
    });
  });

  describe('Logical Operations', () => {
    test('AND sets parity flag', () => {
      cpu.a = 0xFF;
      cpu.b = 0x0F;
      memory.data[0] = 0xA0; // AND B

      decoder.executeInstruction();
      expect(cpu.a).toBe(0x0F);
      expect(cpu.getFlag(Z80CPU.FLAG_PV)).toBe(true); // even parity
      expect(cpu.getFlag(Z80CPU.FLAG_H)).toBe(true); // always set for AND
      expect(cpu.getFlag(Z80CPU.FLAG_C)).toBe(false);
    });

    test('XOR clears all flags except parity', () => {
      cpu.a = 0xFF;
      cpu.b = 0xFF;
      memory.data[0] = 0xA8; // XOR B

      decoder.executeInstruction();
      expect(cpu.a).toBe(0x00);
      expect(cpu.getFlag(Z80CPU.FLAG_Z)).toBe(true);
      expect(cpu.getFlag(Z80CPU.FLAG_C)).toBe(false);
      expect(cpu.getFlag(Z80CPU.FLAG_N)).toBe(false);
      expect(cpu.getFlag(Z80CPU.FLAG_H)).toBe(false);
    });
  });

  describe('Rotate and Shift', () => {
    test('RLCA rotates through carry', () => {
      cpu.a = 0x80;
      memory.data[0] = 0x07; // RLCA

      decoder.executeInstruction();
      expect(cpu.a).toBe(0x01);
      expect(cpu.getFlag(Z80CPU.FLAG_C)).toBe(true);
    });

    test('RRCA rotates right through carry', () => {
      cpu.a = 0x01;
      memory.data[0] = 0x0F; // RRCA

      decoder.executeInstruction();
      expect(cpu.a).toBe(0x80);
      expect(cpu.getFlag(Z80CPU.FLAG_C)).toBe(true);
    });

    test('RLA uses carry flag', () => {
      cpu.a = 0x80;
      cpu.setFlag(Z80CPU.FLAG_C, true);
      memory.data[0] = 0x17; // RLA

      decoder.executeInstruction();
      expect(cpu.a).toBe(0x01);
      expect(cpu.getFlag(Z80CPU.FLAG_C)).toBe(true);
    });
  });

  describe('Stack Operations', () => {
    test('PUSH decrements SP by 2', () => {
      cpu.sp = 0x8000;
      cpu.setBC(0x1234);
      memory.data[0] = 0xC5; // PUSH BC

      decoder.executeInstruction();
      expect(cpu.sp).toBe(0x7FFE);
      expect(memory.data[0x7FFE]).toBe(0x34); // low byte
      expect(memory.data[0x7FFF]).toBe(0x12); // high byte
    });

    test('POP increments SP by 2', () => {
      cpu.sp = 0x7FFE;
      memory.data[0x7FFE] = 0x34;
      memory.data[0x7FFF] = 0x12;
      memory.data[0] = 0xC1; // POP BC

      decoder.executeInstruction();
      expect(cpu.sp).toBe(0x8000);
      expect(cpu.getBC()).toBe(0x1234);
    });
  });

  describe('T-State Timing', () => {
    test('NOP takes 4 T-states', () => {
      memory.data[0] = 0x00; // NOP
      cpu.tstates = 0;

      decoder.executeInstruction();
      expect(cpu.tstates).toBe(4);
    });

    test('LD A,n takes 7 T-states', () => {
      memory.data[0] = 0x3E; // LD A,n
      memory.data[1] = 0x42;
      cpu.tstates = 0;

      decoder.executeInstruction();
      expect(cpu.tstates).toBe(7);
    });

    test('conditional jump taken vs not taken', () => {
      // JR NZ,offset - not taken (Z flag set)
      memory.data[0] = 0x20;
      memory.data[1] = 0x00;
      cpu.setFlag(Z80CPU.FLAG_Z, true);
      cpu.tstates = 0;

      decoder.executeInstruction();
      expect(cpu.tstates).toBe(7); // not taken

      // JR NZ,offset - taken (Z flag clear)
      cpu.pc = 0;
      cpu.setFlag(Z80CPU.FLAG_Z, false);
      cpu.tstates = 0;

      decoder.executeInstruction();
      expect(cpu.tstates).toBe(12); // taken
    });
  });

  describe('Memory Indirect Operations', () => {
    test('LD (HL),n writes to memory', () => {
      cpu.setHL(0x8000);
      memory.data[0] = 0x36; // LD (HL),n
      memory.data[1] = 0x42;

      decoder.executeInstruction();
      expect(memory.data[0x8000]).toBe(0x42);
    });

    test('INC (HL) increments memory', () => {
      cpu.setHL(0x8000);
      memory.data[0x8000] = 0x7F;
      memory.data[0] = 0x34; // INC (HL)

      decoder.executeInstruction();
      expect(memory.data[0x8000]).toBe(0x80);
      expect(cpu.getFlag(Z80CPU.FLAG_PV)).toBe(true); // overflow
      expect(cpu.getFlag(Z80CPU.FLAG_S)).toBe(true); // negative
    });
  });

  describe('Register Refresh', () => {
    test('R register increments on instruction fetch', () => {
      cpu.r = 0;
      memory.data[0] = 0x00; // NOP

      decoder.executeInstruction();
      expect(cpu.r).toBe(1);

      decoder.executeInstruction();
      expect(cpu.r).toBe(2);
    });

    test('R register bit 7 preserved', () => {
      cpu.r = 0xFF;
      memory.data[0] = 0x00; // NOP

      decoder.executeInstruction();
      expect(cpu.r).toBe(0x80); // bit 7 set, lower 7 bits = 0
    });
  });
});
