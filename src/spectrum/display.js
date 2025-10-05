/**
 * ZX Spectrum display system
 * Pixel-perfect 256x192 screen with 32-column border
 * Total display: 320x240
 */
export class Display {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });

    // Display dimensions per ZX Spectrum specification
    this.screenWidth = 256;
    this.screenHeight = 192;
    this.borderLeft = 48;
    this.borderRight = 48;
    this.borderTop = 48;
    this.borderBottom = 56;
    this.totalWidth = 352;  // 48 + 256 + 48
    this.totalHeight = 296; // 48 + 192 + 56

    // Set canvas size
    this.canvas.width = this.totalWidth;
    this.canvas.height = this.totalHeight;

    // Image data for rendering
    this.imageData = this.ctx.createImageData(this.totalWidth, this.totalHeight);
    this.pixels = new Uint32Array(this.imageData.data.buffer);

    // ZX Spectrum color palette (RGBA in little-endian format: 0xAABBGGRR)
    // Normal colors use 0xD8 (85% voltage, hardware-accurate)
    this.palette = new Uint32Array([
      0xff000000, // 0: Black
      0xffd80000, // 1: Blue (R=0, G=0, B=216)
      0xff0000d8, // 2: Red (R=216, G=0, B=0)
      0xffd800d8, // 3: Magenta (R=216, G=0, B=216)
      0xff00d800, // 4: Green (R=0, G=216, B=0)
      0xffd8d800, // 5: Cyan (R=0, G=216, B=216)
      0xff00d8d8, // 6: Yellow (R=216, G=216, B=0)
      0xffd8d8d8, // 7: White (R=216, G=216, B=216)
    ]);

    this.paletteBright = new Uint32Array([
      0xff000000, // 0: Black
      0xffff0000, // 1: Bright Blue (R=0, G=0, B=255)
      0xff0000ff, // 2: Bright Red (R=255, G=0, B=0)
      0xffff00ff, // 3: Bright Magenta (R=255, G=0, B=255)
      0xff00ff00, // 4: Bright Green (R=0, G=255, B=0)
      0xffffff00, // 5: Bright Cyan (R=0, G=255, B=255)
      0xff00ffff, // 6: Bright Yellow (R=255, G=255, B=0)
      0xffffffff, // 7: Bright White (R=255, G=255, B=255)
    ]);

    this.flashCounter = 0;
    this.flashState = false;
  }

  /**
   * Render the screen
   */
  render(memory, ula) {
    const pixels = memory.getScreenPixels();
    const attrs = memory.getScreenAttributes();
    const borderColor = ula.getBorderColor();
    const borderHistory = ula.getBorderHistory();
    const frameStartBorderColor = ula.getFrameStartBorderColor();

    // Render border (with history for accurate SAVE stripes)
    this.renderBorder(borderColor, borderHistory, frameStartBorderColor);

    // Render screen area
    for (let y = 0; y < 192; y++) {
      for (let x = 0; x < 256; x += 8) {
        const pixelAddr = this.getPixelAddress(x, y);
        const attrAddr = this.getAttributeAddress(x, y);

        const pixelByte = pixels[pixelAddr];
        const attr = attrs[attrAddr];

        const ink = attr & 0x07;
        const paper = (attr >> 3) & 0x07;
        const bright = (attr & 0x40) !== 0;
        const flash = (attr & 0x80) !== 0;

        const palette = bright ? this.paletteBright : this.palette;

        let inkColor = palette[ink];
        let paperColor = palette[paper];

        // Handle flash
        if (flash && this.flashState) {
          [inkColor, paperColor] = [paperColor, inkColor];
        }

        // Render 8 pixels
        for (let bit = 0; bit < 8; bit++) {
          const pixel = (pixelByte >> (7 - bit)) & 1;
          const color = pixel ? inkColor : paperColor;

          const displayX = this.borderLeft + x + bit;
          const displayY = this.borderTop + y;
          const offset = displayY * this.totalWidth + displayX;

          this.pixels[offset] = color;
        }
      }
    }

    // Update flash counter (32 frames = ~0.64 seconds per spec)
    this.flashCounter++;
    if (this.flashCounter >= 32) {
      this.flashCounter = 0;
      this.flashState = !this.flashState;
    }

    // Draw to canvas
    this.ctx.putImageData(this.imageData, 0, 0);
  }

  /**
   * Render border with CRT-accurate scanline timing
   */
  renderBorder(color, borderHistory = [], frameStartColor = null) {
    if (frameStartColor === null) {
      frameStartColor = color;
    }
    // ZX Spectrum timing:
    // Total frame: 69888 T-states
    // Per scanline: 224 T-states
    // Total scanlines: 312 (64 top border + 192 screen + 56 bottom border)
    const TSTATES_PER_LINE = 224;
    const TOP_BORDER_LINES = 64;
    const BOTTOM_BORDER_START = TOP_BORDER_LINES + 192;

    // If no history, render solid border (old behavior)
    if (borderHistory.length === 0) {
      const borderColor = this.palette[color];

      // Top border
      for (let y = 0; y < this.borderTop; y++) {
        for (let x = 0; x < this.totalWidth; x++) {
          this.pixels[y * this.totalWidth + x] = borderColor;
        }
      }

      // Bottom border
      for (let y = this.borderTop + this.screenHeight; y < this.totalHeight; y++) {
        for (let x = 0; x < this.totalWidth; x++) {
          this.pixels[y * this.totalWidth + x] = borderColor;
        }
      }

      // Left and right borders
      for (let y = this.borderTop; y < this.borderTop + this.screenHeight; y++) {
        for (let x = 0; x < this.borderLeft; x++) {
          this.pixels[y * this.totalWidth + x] = borderColor;
        }
        for (let x = this.borderLeft + this.screenWidth; x < this.totalWidth; x++) {
          this.pixels[y * this.totalWidth + x] = borderColor;
        }
      }
      return;
    }

    // Render border with scanline-accurate color changes
    // Build array of changes: start with frame start color at T-state 0
    const changes = [{tstate: 0, color: frameStartColor}];

    // Add all border changes from history
    for (const change of borderHistory) {
      changes.push({tstate: change.tstate, color: change.color});
    }

    // Pre-calculate scanline colors for performance
    const scanlineColors = new Uint32Array(312);

    for (let scanline = 0; scanline < 312; scanline++) {
      const lineTState = scanline * TSTATES_PER_LINE;

      // Find the active color at this scanline's start
      let activeColor = frameStartColor;
      for (let i = changes.length - 1; i >= 0; i--) {
        if (changes[i].tstate <= lineTState) {
          activeColor = changes[i].color;
          break;
        }
      }

      scanlineColors[scanline] = this.palette[activeColor];
    }

    // Render all border lines with pre-calculated colors
    for (let scanline = 0; scanline < 312; scanline++) {
      const borderColorValue = scanlineColors[scanline];

      // Map scanline to display Y coordinate
      let displayY = -1;

      if (scanline < TOP_BORDER_LINES) {
        // Top border area (scale 64 lines to 48 pixels)
        displayY = Math.floor(scanline * this.borderTop / TOP_BORDER_LINES);
      } else if (scanline >= BOTTOM_BORDER_START) {
        // Bottom border area (56 scanlines to 56 pixels)
        const bottomLine = scanline - BOTTOM_BORDER_START;
        displayY = this.borderTop + this.screenHeight + bottomLine;
      } else {
        // Screen area - render left/right borders
        displayY = this.borderTop + (scanline - TOP_BORDER_LINES);

        // Left border
        for (let x = 0; x < this.borderLeft; x++) {
          this.pixels[displayY * this.totalWidth + x] = borderColorValue;
        }
        // Right border
        for (let x = this.borderLeft + this.screenWidth; x < this.totalWidth; x++) {
          this.pixels[displayY * this.totalWidth + x] = borderColorValue;
        }
        continue;
      }

      if (displayY >= 0 && displayY < this.totalHeight) {
        for (let x = 0; x < this.totalWidth; x++) {
          this.pixels[displayY * this.totalWidth + x] = borderColorValue;
        }
      }
    }
  }

  /**
   * Calculate pixel address from coordinates
   * ZX Spectrum uses a non-linear screen layout
   */
  getPixelAddress(x, y) {
    const col = x >> 3; // x / 8

    // ZX Spectrum screen layout:
    // Address = 010T TSSS LLCC CCCC
    // T = third (0-2), S = scan line (0-7),
    // L = line within third (0-7), C = column (0-31)
    // Formula: 2048*INT(y/64) + 256*(y%8) + 32*(INT(y/8)%8) + col

    const third = y >> 6;           // y / 64 (0-2)
    const scan = y & 0x07;          // y % 8 (0-7)
    const line = (y >> 3) & 0x07;   // (y / 8) % 8 (0-7)

    return (third << 11) | (scan << 8) | (line << 5) | col;
  }

  /**
   * Calculate attribute address from coordinates
   */
  getAttributeAddress(x, y) {
    const col = x >> 3;
    const row = y >> 3;
    return (row << 5) | col;
  }

  /**
   * Set display scale
   */
  setScale(scale) {
    if (scale === 'auto') {
      this.canvas.style.width = '';
      this.canvas.style.height = '';
      this.canvas.style.imageRendering = 'pixelated';
    } else {
      const width = this.totalWidth * scale;
      const height = this.totalHeight * scale;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      this.canvas.style.imageRendering = 'pixelated';
    }
  }

  /**
   * Clear display
   */
  clear() {
    this.pixels.fill(0xff000000); // Black
    this.ctx.putImageData(this.imageData, 0, 0);
  }
}
