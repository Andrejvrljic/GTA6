// Zentrales Input-Modul: Tastatur + Maus jetzt, Touch/Gamepad später über dieselbe Schnittstelle erweiterbar.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouseDown = false;
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheelDelta = 0;
    this.justPressed = new Set();

    window.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) this.justPressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    canvas.addEventListener('mousedown', () => { this.mouseDown = true; });
    window.addEventListener('mouseup', () => { this.mouseDown = false; });
    window.addEventListener('mousemove', (e) => {
      if (this.mouseDown) {
        this.mouseDX += e.movementX || 0;
        this.mouseDY += e.movementY || 0;
      }
    });
    canvas.addEventListener('wheel', (e) => { this.wheelDelta += e.deltaY; }, { passive: true });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
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
