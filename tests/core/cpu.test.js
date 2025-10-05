/**
 * Z80 CPU tests
 */
import { Z80CPU } from '../../src/core/cpu.js';

describe('Z80CPU', () => {
  let cpu;

  beforeEach(() => {
    cpu = new Z80CPU();
    cpu.memory = {
      read: jest.fn(() => 0),
      write: jest.fn()
    };
    cpu.io = {
      read: jest.fn(() => 0xff),
      write: jest.fn()
    };
  });

  describe('Initialization', () => {
    test('should initialize with default values', () => {
      expect(cpu.a).toBe(0);
      expect(cpu.f).toBe(0);
      expect(cpu.pc).toBe(0);
      expect(cpu.sp).toBe(0);
      expect(cpu.tstates).toBe(0);
    });

    test('should reset to initial state', () => {
      cpu.a = 0xff;
      cpu.pc = 0x1234;
      cpu.sp = 0x5678;
      cpu.tstates = 1000;

      cpu.reset();

      expect(cpu.a).toBe(0);
      expect(cpu.pc).toBe(0);
      expect(cpu.sp).toBe(0xffff);
      expect(cpu.tstates).toBe(0);
    });
  });

  describe('Register pairs', () => {
    test('should get and set AF register', () => {
      cpu.a = 0x12;
      cpu.f = 0x34;
      expect(cpu.getAF()).toBe(0x1234);

      cpu.setAF(0x5678);
      expect(cpu.a).toBe(0x56);
      expect(cpu.f).toBe(0x78);
    });

    test('should get and set BC register', () => {
      cpu.b = 0xAB;
      cpu.c = 0xCD;
      expect(cpu.getBC()).toBe(0xABCD);

      cpu.setBC(0x1122);
      expect(cpu.b).toBe(0x11);
      expect(cpu.c).toBe(0x22);
    });

    test('should get and set HL register', () => {
      cpu.h = 0xDE;
      cpu.l = 0xAD;
      expect(cpu.getHL()).toBe(0xDEAD);

      cpu.setHL(0xBEEF);
      expect(cpu.h).toBe(0xBE);
      expect(cpu.l).toBe(0xEF);
    });
  });

  describe('Flags', () => {
    test('should set and get carry flag', () => {
      cpu.setFlag(Z80CPU.FLAG_C, true);
      expect(cpu.getFlag(Z80CPU.FLAG_C)).toBe(true);

      cpu.setFlag(Z80CPU.FLAG_C, false);
      expect(cpu.getFlag(Z80CPU.FLAG_C)).toBe(false);
    });

    test('should set and get zero flag', () => {
      cpu.setFlag(Z80CPU.FLAG_Z, true);
      expect(cpu.getFlag(Z80CPU.FLAG_Z)).toBe(true);

      cpu.setFlag(Z80CPU.FLAG_Z, false);
      expect(cpu.getFlag(Z80CPU.FLAG_Z)).toBe(false);
    });

    test('should set arithmetic flags correctly', () => {
      cpu.setArithmeticFlags(0x00, 0x100, false);
      expect(cpu.getFlag(Z80CPU.FLAG_Z)).toBe(true);
      expect(cpu.getFlag(Z80CPU.FLAG_C)).toBe(true);
    });
  });

  describe('Stack operations', () => {
    test('should push and pop values', () => {
      cpu.sp = 0xfffe;

      cpu.push(0x1234);
      expect(cpu.sp).toBe(0xfffc);
      expect(cpu.memory.write).toHaveBeenCalledWith(0xfffd, 0x12);
      expect(cpu.memory.write).toHaveBeenCalledWith(0xfffc, 0x34);

      cpu.memory.read = jest.fn()
        .mockReturnValueOnce(0x34)
        .mockReturnValueOnce(0x12);

      const value = cpu.pop();
      expect(value).toBe(0x1234);
      expect(cpu.sp).toBe(0xfffe);
    });

    test('should wrap stack pointer correctly', () => {
      cpu.sp = 0x0001;
      cpu.push(0xABCD);
      expect(cpu.sp).toBe(0xFFFF);
    });
  });

  describe('Memory access', () => {
    test('should read and write memory', () => {
      cpu.writeMem(0x8000, 0x42);
      expect(cpu.memory.write).toHaveBeenCalledWith(0x8000, 0x42);

      cpu.memory.read = jest.fn(() => 0x42);
      expect(cpu.readMem(0x8000)).toBe(0x42);
    });

    test('should read and write memory words', () => {
      cpu.writeMemWord(0x4000, 0x1234);
      expect(cpu.memory.write).toHaveBeenCalledWith(0x4000, 0x34);
      expect(cpu.memory.write).toHaveBeenCalledWith(0x4001, 0x12);
    });
  });

  describe('Parity calculation', () => {
    test('should calculate parity correctly', () => {
      expect(cpu.getParity(0b00000000)).toBe(true);  // Even
      expect(cpu.getParity(0b00000001)).toBe(false); // Odd
      expect(cpu.getParity(0b00000011)).toBe(true);  // Even
      expect(cpu.getParity(0b11111111)).toBe(true);  // Even
    });
  });

  describe('Interrupts', () => {
    test('should execute interrupt in mode 1', () => {
      cpu.pc = 0x1234;
      cpu.sp = 0xfffe;
      cpu.im = 1;
      cpu.iff1 = true;

      cpu.interrupt();

      expect(cpu.pc).toBe(0x0038);
      expect(cpu.iff1).toBe(false);
      expect(cpu.iff2).toBe(false);
    });

    test('should not execute interrupt if disabled', () => {
      cpu.pc = 0x1234;
      cpu.iff1 = false;

      cpu.interrupt();

      expect(cpu.pc).toBe(0x1234);
    });
  });
});
