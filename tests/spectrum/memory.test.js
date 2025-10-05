/**
 * Memory system tests
 */
import { Memory } from '../../src/spectrum/memory.js';

describe('Memory', () => {
  let memory;

  beforeEach(() => {
    memory = new Memory();
  });

  test('should initialize with correct sizes', () => {
    expect(memory.rom.length).toBe(16384);
    expect(memory.ram.length).toBe(49152);
  });

  test('should load ROM correctly', () => {
    const romData = new Uint8Array(16384);
    romData[0] = 0xF3; // DI instruction
    romData[1] = 0xC3; // JP instruction

    memory.loadROM(romData);

    expect(memory.rom[0]).toBe(0xF3);
    expect(memory.rom[1]).toBe(0xC3);
    expect(memory.romLoaded).toBe(true);
  });

  test('should reject invalid ROM size', () => {
    const invalidRom = new Uint8Array(1024);

    expect(() => {
      memory.loadROM(invalidRom);
    }).toThrow('Invalid ROM size');
  });

  test('should read from ROM', () => {
    const romData = new Uint8Array(16384);
    romData[0x100] = 0x42;
    memory.loadROM(romData);

    expect(memory.read(0x100)).toBe(0x42);
  });

  test('should read from RAM', () => {
    memory.ram[0] = 0x55; // 0x4000 in address space

    expect(memory.read(0x4000)).toBe(0x55);
  });

  test('should write to RAM', () => {
    memory.write(0x4000, 0xAA);

    expect(memory.ram[0]).toBe(0xAA);
  });

  test('should ignore writes to ROM', () => {
    const romData = new Uint8Array(16384);
    romData[0] = 0xFF;
    memory.loadROM(romData);

    memory.write(0x0000, 0x00);

    expect(memory.rom[0]).toBe(0xFF);
  });

  test('should get screen pixels correctly', () => {
    memory.ram[0] = 0x81; // First byte of screen memory

    const pixels = memory.getScreenPixels();

    expect(pixels.length).toBe(6144);
    expect(pixels[0]).toBe(0x81);
  });

  test('should get screen attributes correctly', () => {
    memory.ram[6144] = 0x38; // First attribute byte

    const attrs = memory.getScreenAttributes();

    expect(attrs.length).toBe(768);
    expect(attrs[0]).toBe(0x38);
  });

  test('should reset RAM', () => {
    memory.ram[100] = 0xFF;

    memory.reset();

    expect(memory.ram[100]).toBe(0);
  });
});
