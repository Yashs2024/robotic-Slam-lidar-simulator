export class JoystickManager {
  constructor(keysObj) {
    this.keys = keysObj;
    this.leftJoystick = null;
    this.rightJoystick = null;
  }

  init() {
    if (typeof nipplejs === 'undefined') {
      console.warn("nipplejs not found. Virtual joysticks disabled.");
      return;
    }

    const leftZone = document.getElementById('joystickLeft');
    const rightZone = document.getElementById('joystickRight');

    if (!leftZone || !rightZone) return;

    try {
      // Left Joystick: Forward/Backward (W/S)
    this.leftJoystick = nipplejs.create({
      zone: leftZone,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: '#3b82f6',
      size: 100
    });

    // Right Joystick: Rotation/Strafe (A/D)
    this.rightJoystick = nipplejs.create({
      zone: rightZone,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: '#ef4444',
      size: 100
    });

    this.setupListeners();
    } catch (e) {
      console.warn("Could not initialize joysticks: ", e);
    }
  }

  setupListeners() {
    if (this.leftJoystick) {
      this.leftJoystick.on('move', (evt, data) => {
        const vy = data.vector.y; // Positive is UP
        
        if (vy > 0.2) {
          this.keys.w = true;
          this.keys.s = false;
        } else if (vy < -0.2) {
          this.keys.w = false;
          this.keys.s = true;
        } else {
          this.keys.w = false;
          this.keys.s = false;
        }
      });

      this.leftJoystick.on('end', () => {
        this.keys.w = false;
        this.keys.s = false;
      });
    }

    if (this.rightJoystick) {
      this.rightJoystick.on('move', (evt, data) => {
        const vx = data.vector.x; // Positive is RIGHT
        
        if (vx > 0.2) {
          this.keys.d = true;
          this.keys.a = false;
        } else if (vx < -0.2) {
          this.keys.d = false;
          this.keys.a = true;
        } else {
          this.keys.a = false;
          this.keys.d = false;
        }
      });

      this.rightJoystick.on('end', () => {
        this.keys.a = false;
        this.keys.d = false;
      });
    }
  }
}
