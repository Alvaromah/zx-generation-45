/**
 * Touch keyboard for mobile devices
 * ZX Spectrum layout with Symbol Shift and Caps Shift
 */
export class TouchKeyboard {
  constructor(spectrum, container) {
    this.spectrum = spectrum;
    this.container = container;
    this.element = null;
    this.visible = false;

    this.keys = [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'ENTER'],
      ['SHIFT', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'SYM', 'SPACE']
    ];

    this.keyMap = {
      '1': 'Digit1', '2': 'Digit2', '3': 'Digit3', '4': 'Digit4', '5': 'Digit5',
      '6': 'Digit6', '7': 'Digit7', '8': 'Digit8', '9': 'Digit9', '0': 'Digit0',
      'Q': 'KeyQ', 'W': 'KeyW', 'E': 'KeyE', 'R': 'KeyR', 'T': 'KeyT',
      'Y': 'KeyY', 'U': 'KeyU', 'I': 'KeyI', 'O': 'KeyO', 'P': 'KeyP',
      'A': 'KeyA', 'S': 'KeyS', 'D': 'KeyD', 'F': 'KeyF', 'G': 'KeyG',
      'H': 'KeyH', 'J': 'KeyJ', 'K': 'KeyK', 'L': 'KeyL',
      'Z': 'KeyZ', 'X': 'KeyX', 'C': 'KeyC', 'V': 'KeyV', 'B': 'KeyB',
      'N': 'KeyN', 'M': 'KeyM',
      'ENTER': 'Enter',
      'SPACE': 'Space',
      'SHIFT': 'ShiftLeft',
      'SYM': 'ControlLeft'
    };
  }

  /**
   * Create keyboard UI
   */
  create() {
    this.element = document.createElement('div');
    this.element.className = 'zx-touch-keyboard';
    this.element.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #333;
      padding: 10px;
      display: none;
      z-index: 1000;
      touch-action: none;
    `;

    this.keys.forEach((row, rowIndex) => {
      const rowEl = document.createElement('div');
      rowEl.style.cssText = `
        display: flex;
        justify-content: center;
        margin-bottom: 5px;
      `;

      row.forEach(key => {
        const keyEl = document.createElement('button');
        keyEl.textContent = key;
        keyEl.dataset.key = key;

        let width = '30px';
        if (key === 'SPACE') width = '150px';
        if (key === 'ENTER') width = '60px';
        if (key === 'SHIFT' || key === 'SYM') width = '50px';

        keyEl.style.cssText = `
          width: ${width};
          height: 40px;
          margin: 2px;
          background: #666;
          color: #fff;
          border: 1px solid #888;
          border-radius: 3px;
          font-size: 12px;
          font-weight: bold;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
        `;

        // Touch events
        keyEl.addEventListener('touchstart', (e) => {
          e.preventDefault();
          this.handleKeyDown(key);
          keyEl.style.background = '#999';
        });

        keyEl.addEventListener('touchend', (e) => {
          e.preventDefault();
          this.handleKeyUp(key);
          keyEl.style.background = '#666';
        });

        // Mouse events (for testing on desktop)
        keyEl.addEventListener('mousedown', (e) => {
          e.preventDefault();
          this.handleKeyDown(key);
          keyEl.style.background = '#999';
        });

        keyEl.addEventListener('mouseup', (e) => {
          e.preventDefault();
          this.handleKeyUp(key);
          keyEl.style.background = '#666';
        });

        keyEl.addEventListener('mouseleave', (e) => {
          this.handleKeyUp(key);
          keyEl.style.background = '#666';
        });

        rowEl.appendChild(keyEl);
      });

      this.element.appendChild(rowEl);
    });

    if (this.container) {
      this.container.appendChild(this.element);
    } else {
      document.body.appendChild(this.element);
    }
  }

  /**
   * Handle key down
   */
  handleKeyDown(key) {
    const code = this.keyMap[key];
    if (code && this.spectrum) {
      this.spectrum.keyDown(code);
    }
  }

  /**
   * Handle key up
   */
  handleKeyUp(key) {
    const code = this.keyMap[key];
    if (code && this.spectrum) {
      this.spectrum.keyUp(code);
    }
  }

  /**
   * Show keyboard
   */
  show() {
    if (this.element) {
      this.element.style.display = 'block';
      this.visible = true;
    }
  }

  /**
   * Hide keyboard
   */
  hide() {
    if (this.element) {
      this.element.style.display = 'none';
      this.visible = false;
    }
  }

  /**
   * Toggle keyboard
   */
  toggle() {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Destroy keyboard
   */
  destroy() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}
