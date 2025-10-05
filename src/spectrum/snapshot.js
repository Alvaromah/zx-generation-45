/**
 * ZX Spectrum snapshot system
 * Supports .Z80 format (versions 1, 2, 3)
 */
export class Snapshot {
  /**
   * Load Z80 snapshot
   */
  static loadZ80(data, cpu, memory) {
    if (data instanceof ArrayBuffer) {
      data = new Uint8Array(data);
    }

    // Read header
    cpu.a = data[0];
    cpu.f = data[1];
    cpu.c = data[2];
    cpu.b = data[3];
    cpu.l = data[4];
    cpu.h = data[5];
    let pc = data[6] | (data[7] << 8);
    cpu.sp = data[8] | (data[9] << 8);
    cpu.i = data[10];
    cpu.r = (data[11] & 0x7f) | ((data[12] & 0x01) << 7);

    const flags1 = data[12];
    const borderColor = (flags1 >> 1) & 0x07;

    cpu.e = data[13];
    cpu.d = data[14];
    cpu.c_ = data[15];
    cpu.b_ = data[16];
    cpu.e_ = data[17];
    cpu.d_ = data[18];
    cpu.l_ = data[19];
    cpu.h_ = data[20];
    cpu.a_ = data[21];
    cpu.f_ = data[22];
    cpu.iy = data[23] | (data[24] << 8);
    cpu.ix = data[25] | (data[26] << 8);

    cpu.iff1 = data[27] !== 0;
    cpu.iff2 = data[28] !== 0;

    const flags2 = data[29];
    cpu.im = flags2 & 0x03;

    // Check version
    const version = (pc === 0) ? this.getVersion(data) : 1;

    if (version === 1) {
      // Version 1: PC in header, compressed data follows
      pc = data[6] | (data[7] << 8);
      cpu.pc = pc;

      const compressed = (flags1 & 0x20) !== 0;
      const ramData = data.slice(30);

      if (compressed) {
        this.decompressV1(ramData, memory);
      } else {
        memory.setRAM(ramData.slice(0, 49152));
      }
    } else {
      // Version 2/3: Extended header
      const headerLength = data[30] | (data[31] << 8);
      const extHeaderStart = 32;
      pc = data[extHeaderStart] | (data[extHeaderStart + 1] << 8);
      cpu.pc = pc;

      const hwMode = data[extHeaderStart + 2];

      // Only support 48K mode
      if (hwMode !== 0 && hwMode !== 1 && hwMode !== 3) {
        throw new Error(`Unsupported hardware mode: ${hwMode}`);
      }

      // Load memory blocks
      let offset = extHeaderStart + headerLength;

      while (offset < data.length) {
        const blockLength = data[offset] | (data[offset + 1] << 8);
        const pageNum = data[offset + 2];
        offset += 3;

        if (blockLength === 0xffff) {
          // Uncompressed block (16KB)
          const blockData = data.slice(offset, offset + 16384);
          this.loadMemoryBlock(pageNum, blockData, memory, false);
          offset += 16384;
        } else {
          // Compressed block
          const blockData = data.slice(offset, offset + blockLength);
          this.loadMemoryBlock(pageNum, blockData, memory, true);
          offset += blockLength;
        }
      }
    }

    return { borderColor };
  }

  /**
   * Get Z80 version
   */
  static getVersion(data) {
    const headerLength = data[30] | (data[31] << 8);

    if (headerLength === 23) return 2;
    if (headerLength === 54 || headerLength === 55) return 3;

    return 1;
  }

  /**
   * Decompress version 1 data
   */
  static decompressV1(data, memory) {
    const ram = new Uint8Array(49152);
    let offset = 0;
    let pos = 0;

    while (offset < data.length && pos < 49152) {
      if (offset + 3 < data.length &&
          data[offset] === 0xed &&
          data[offset + 1] === 0xed) {
        // Compressed sequence
        const count = data[offset + 2];
        const value = data[offset + 3];

        for (let i = 0; i < count && pos < 49152; i++) {
          ram[pos++] = value;
        }

        offset += 4;
      } else {
        ram[pos++] = data[offset++];
      }
    }

    memory.setRAM(ram);
  }

  /**
   * Load memory block
   */
  static loadMemoryBlock(pageNum, data, memory, compressed) {
    let blockData;

    if (compressed) {
      blockData = this.decompressBlock(data);
    } else {
      blockData = data;
    }

    // Page mapping for 48K:
    // 4 = 0x8000-0xBFFF (RAM page 2)
    // 5 = 0xC000-0xFFFF (RAM page 3)
    // 8 = 0x4000-0x7FFF (RAM page 1)

    if (pageNum === 4) {
      memory.ram.set(blockData, 16384);
    } else if (pageNum === 5) {
      memory.ram.set(blockData, 32768);
    } else if (pageNum === 8) {
      memory.ram.set(blockData, 0);
    }
  }

  /**
   * Decompress memory block
   */
  static decompressBlock(data) {
    const result = new Uint8Array(16384);
    let offset = 0;
    let pos = 0;

    while (offset < data.length && pos < 16384) {
      if (offset + 3 < data.length &&
          data[offset] === 0xed &&
          data[offset + 1] === 0xed) {
        // Compressed sequence
        const count = data[offset + 2];
        const value = data[offset + 3];

        for (let i = 0; i < count && pos < 16384; i++) {
          result[pos++] = value;
        }

        offset += 4;
      } else {
        result[pos++] = data[offset++];
      }
    }

    return result;
  }

  /**
   * Save snapshot (simplified - version 1)
   */
  static saveZ80(cpu, memory) {
    const header = new Uint8Array(30);

    header[0] = cpu.a;
    header[1] = cpu.f;
    header[2] = cpu.c;
    header[3] = cpu.b;
    header[4] = cpu.l;
    header[5] = cpu.h;
    header[6] = cpu.pc & 0xff;
    header[7] = (cpu.pc >> 8) & 0xff;
    header[8] = cpu.sp & 0xff;
    header[9] = (cpu.sp >> 8) & 0xff;
    header[10] = cpu.i;
    header[11] = cpu.r & 0x7f;
    header[12] = ((cpu.r & 0x80) >> 7) | 0x20; // Set compression bit
    header[13] = cpu.e;
    header[14] = cpu.d;
    header[15] = cpu.c_;
    header[16] = cpu.b_;
    header[17] = cpu.e_;
    header[18] = cpu.d_;
    header[19] = cpu.l_;
    header[20] = cpu.h_;
    header[21] = cpu.a_;
    header[22] = cpu.f_;
    header[23] = cpu.iy & 0xff;
    header[24] = (cpu.iy >> 8) & 0xff;
    header[25] = cpu.ix & 0xff;
    header[26] = (cpu.ix >> 8) & 0xff;
    header[27] = cpu.iff1 ? 0xff : 0;
    header[28] = cpu.iff2 ? 0xff : 0;
    header[29] = cpu.im & 0x03;

    // Compress RAM
    const compressed = this.compressMemory(memory.ram);

    // Combine header and data
    const result = new Uint8Array(header.length + compressed.length);
    result.set(header);
    result.set(compressed, header.length);

    return result;
  }

  /**
   * Compress memory data
   */
  static compressMemory(data) {
    const compressed = [];

    let i = 0;
    while (i < data.length) {
      const value = data[i];
      let count = 1;

      while (i + count < data.length && data[i + count] === value && count < 255) {
        count++;
      }

      if (count >= 5 || value === 0xed) {
        compressed.push(0xed, 0xed, count, value);
        i += count;
      } else {
        for (let j = 0; j < count; j++) {
          compressed.push(value);
        }
        i += count;
      }
    }

    // Add end marker
    compressed.push(0x00, 0xed, 0xed, 0x00);

    return new Uint8Array(compressed);
  }
}
