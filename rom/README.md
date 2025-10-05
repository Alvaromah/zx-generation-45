# ZX Spectrum ROM

This directory should contain the ZX Spectrum 48K ROM file.

## ROM File

**Filename:** `48k.rom`
**Size:** 16,384 bytes (16KB)
**MD5:** TBD

## Copyright Notice

The ZX Spectrum ROM is copyrighted by Amstrad plc. Amstrad has granted permission for the redistribution of their copyrighted material in emulators, provided that:

1. The ROM is distributed with the emulator
2. The ROM is used only for emulation purposes
3. The emulator is distributed free of charge

Source: [Amstrad's ROM licensing statement](http://www.worldofspectrum.org/permits/amstrad-roms.txt)

## Obtaining the ROM

If you need to obtain the ROM file, you can:

1. Download it from [World of Spectrum](http://www.worldofspectrum.org/pub/sinclair/rom-images/)
2. Extract it from an original ZX Spectrum machine
3. Use online ROM archives (ensure you comply with copyright)

## Alternative ROMs

You can also use alternative ROMs such as:

- **OpenSE BASIC ROM** - An open-source replacement
- **SE BASIC IV ROM** - Enhanced BASIC interpreter
- **Custom ROMs** - Any 16KB ROM compatible with ZX Spectrum 48K

Simply replace `48k.rom` with your chosen ROM file.

## Usage in the Emulator

The emulator loads the ROM automatically on initialization. You can specify a different ROM location in the constructor:

```javascript
const spectrum = new ZXSpectrum(canvas, {
    rom: 'path/to/your/rom.bin'
});
```

Or load from a URL:

```javascript
const spectrum = new ZXSpectrum(canvas, {
    rom: 'https://example.com/48k.rom'
});
```
