// Zentrales Input-Modul: Tastatur + Maus (Pointer-Lock, wie in jedem modernen 3D-Spiel üblich –
// Maus steuert die Kamera immer, ohne Taste gedrückt halten zu müssen). Touch/Gamepad später
// über dieselbe Schnittstelle erweiterbar.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheelDelta = 0;
    this.justPressed = new Set();
    this.locked = false;

    window.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) this.justPressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.locked) {
        this.mouseDX += e.movementX || 0;
        this.mouseDY += e.movementY || 0;
      }
    });
    canvas.addEventListener('wheel', (e) => { this.wheelDelta += e.deltaY; }, { passive: true });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  requestLock() {
    this.canvas.requestPointerLock?.();
  }

  pressed(code) { return this.keys.has(code); }

  // Verbraucht das "gerade erst gedrückt"-Ereignis, damit eine einzelne Taste
  // (z. B. E) pro Tastendruck genau einmal auslöst, egal wann im Frame geprüft wird.
  wasJustPressed(code) {
    const hit = this.justPressed.has(code);
    if (hit) this.justPressed.delete(code);
    return hit;
  }

  consumeFrame() {
    const dx = this.mouseDX, dy = this.mouseDY, wheel = this.wheelDelta;
    this.mouseDX = 0; this.mouseDY = 0; this.wheelDelta = 0;
    return { dx, dy, wheel };
  }
}
