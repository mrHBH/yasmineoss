import { Component } from "../Component";
import { Entity } from "../Entity";
import nipplejs from 'nipplejs';

class KeyboardInput extends Component {
  params_: any;
  noUpdate: boolean;
  _keys: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    space: boolean;
    shift: boolean;
    backspace: boolean;
    attack1: boolean;
    attack2: boolean;
    action: boolean;
  };
  
  // Analog input values for joystick
  _analog: {
    force: number;
    angle: number;
    direction: { x: number; y: number };
    isActive: boolean;
    // Analog rotation values
    rotationIntensity: number; // How much rotation (0-1)
    rotationDirection: number; // -1 for left, +1 for right, 0 for none
  };
  keyMap: { [key: string]: string; };
  HandleKeyDown: (event: KeyboardEvent) => void;
  HandleKeyUp: (event: KeyboardEvent) => void;
  
  // Joystick properties
  joystickManager: any;
  joystickZone: HTMLElement;
  private joystickActive: boolean = false;

  constructor(params?: { input: any; }) {
    super();
    this.params_ = params;
    this.noUpdate = false;
    //  this.Init_();
  }

  async InitComponent(entity: Entity): Promise<void> {
    this._entity = entity;
    this.Init_();
  }

  async InitEntity(): Promise<void> {
    //broadcast event input initialized
    this._entity.Broadcast({
      topic: "inputinitialized",
      data: { input: this },
    });
  }
  Init_() {
    this._keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      space: false,
      shift: false,
      backspace: false,
      attack1: false,
      attack2: false,
      action: false,
    };

    this._analog = {
      force: 0,
      angle: 0,
      direction: { x: 0, y: 0 },
      isActive: false,
      rotationIntensity: 0,
      rotationDirection: 0,
    };

    this.initKeyMap();
    this.initJoystick();

    this.HandleKeyDown = this.handleKeyDown.bind(this);
    this.HandleKeyUp = this.handleKeyUp.bind(this);

    document.addEventListener("keydown", this.HandleKeyDown);
    document.addEventListener("keyup", this.HandleKeyUp);
  }

  initKeyMap() {
    const navigator = window.navigator;
    const language = navigator.language || (navigator as any).userLanguage;
    
    const keyMaps = {
      "en-US": {
        z: "forward",
        s: "backward",
        q: "left",
        d: "right",
        " ": "space",
        shift: "shift",
        e: "action",
        x: "attack1",
        c: "attack2",
      },
      "fr-FR": {
        a: "forward",
        q: "backward",
        w: "left",
        d: "right",
        " ": "space",
        shift: "shift",
        e: "action",
        x: "attack1",
        c: "attack2",
      },
    };

    if (keyMaps[language]) {
      this.keyMap = keyMaps[language];
    } else if (keyMaps["en-US"]) {
      this.keyMap = keyMaps["en-US"];
    } else {
      this.keyMap = keyMaps["en-US"];
      console.error("Unsupported keyboard layout, defaulting to en-US");
    }
  }

  initJoystick() {
    // Create joystick zone if it doesn't exist
    this.joystickZone = document.getElementById('joystick-zone') as HTMLElement;
    if (!this.joystickZone) {
      this.joystickZone = document.createElement('div');
      this.joystickZone.id = 'joystick-zone';
      this.joystickZone.style.position = 'fixed';
      this.joystickZone.style.bottom = '20px';
      this.joystickZone.style.left = '20px';
      this.joystickZone.style.width = '150px';
      this.joystickZone.style.height = '150px';
      this.joystickZone.style.zIndex = '1000';
      this.joystickZone.style.pointerEvents = 'auto';
      document.body.appendChild(this.joystickZone);
    }

    // Configure joystick options with progressive movement
    const joystickOptions = {
      zone: this.joystickZone,
      color: '#ffffff',
      size: 120,
      threshold: 0.1,
      fadeTime: 200,
      multitouch: false,
      maxNumberOfNipples: 1,
      dataOnly: false,
      mode: 'static' as const,
      position: { bottom: '75px', left: '75px' },
      restJoystick: true,
      restOpacity: 0.5,
      lockX: false,
      lockY: false,
      shape: 'circle' as const,
      dynamicPage: false,
      follow: false
    };

    // Create joystick manager
    this.joystickManager = nipplejs.create(joystickOptions);

    // Handle joystick events
    this.joystickManager.on('start', () => {
      this.joystickActive = true;
    });

    this.joystickManager.on('move', (_evt: any, data: any) => {
      this.handleJoystickMove(data);
    });

    this.joystickManager.on('end', () => {
      this.joystickActive = false;
      this.resetJoystickKeys();
    });
  }

  handleJoystickMove(data: any) {
    // Update analog values
    this._analog.force = Math.min(data.force, 1.0);
    this._analog.angle = data.angle.degree;
    this._analog.direction.x = data.vector?.x || 0;
    this._analog.direction.y = data.vector?.y || 0;
    this._analog.isActive = true;

    // Calculate analog rotation values
    const force = this._analog.force;
    const angle = this._analog.angle;
    const movementDeadzone = 8; // Smaller threshold for rotation while moving forward/backward
    const pureRotationDeadzone = 20; // Larger threshold for pure left/right movement

    // Reset rotation values
    this._analog.rotationIntensity = 0;
    this._analog.rotationDirection = 0;

    // Reset only the movement keys first (not analog values)
    this._keys.forward = false;
    this._keys.backward = false;
    this._keys.left = false;
    this._keys.right = false;
    this._keys.shift = false;

    // Progressive movement based on distance from center
    // 0-0.3: no movement (dead zone)
    // 0.3-0.6: slow walking
    // 0.6-0.8: normal walking  
    // 0.8-1.0: running (shift)

    if (force < 0.3) {
      // Dead zone - no movement
      return;
    }

    // Forward movement with analog rotation
    if (angle > 45 && angle < 135) {
      this._keys.forward = true;
      
      // Calculate analog rotation intensity based on distance from center (90 degrees)
      const angleFromCenter = Math.abs(angle - 90);
      if (angleFromCenter > movementDeadzone) {
        this._analog.rotationIntensity = Math.min((angleFromCenter - movementDeadzone) / (45 - movementDeadzone), 1.0);
        this._analog.rotationDirection = angle < 90 ? 1 : -1; // Right = 1, Left = -1
        
        // Set boolean keys for backward compatibility
        if (angle < 90 - movementDeadzone) {
          this._keys.right = true;
        } else if (angle > 90 + movementDeadzone) {
          this._keys.left = true;
        }
      }
    }

    // Backward movement with analog rotation
    if (angle > 225 && angle < 315) {
      this._keys.backward = true;
      
      // Calculate analog rotation intensity based on distance from center (270 degrees)
      const angleFromCenter = Math.abs(angle - 270);
      if (angleFromCenter > movementDeadzone) {
        this._analog.rotationIntensity = Math.min((angleFromCenter - movementDeadzone) / (45 - movementDeadzone), 1.0);
        this._analog.rotationDirection = angle < 270 ? -1 : 1; // Left = -1, Right = 1
        
        // Set boolean keys for backward compatibility
        if (angle < 270 - movementDeadzone) {
          this._keys.left = true;
        } else if (angle > 270 + movementDeadzone) {
          this._keys.right = true;
        }
      }
    }

    // Pure Left/Right movement with analog rotation
    if (angle >= 135 && angle <= 225) {
      this._keys.left = true;
      this._analog.rotationIntensity = force; // Use full force for pure rotation
      this._analog.rotationDirection = -1;
    }
    if (angle >= 315 || angle <= 45) {
      this._keys.right = true;
      this._analog.rotationIntensity = force; // Use full force for pure rotation
      this._analog.rotationDirection = 1;
    }

    // Set shift for running based on force
    if (force >= 0.8) {
      this._keys.shift = true;
    }
  }

  resetJoystickKeys() {
    // Only reset movement keys, preserve other inputs
    this._keys.forward = false;
    this._keys.backward = false;
    this._keys.left = false;
    this._keys.right = false;
    this._keys.shift = false;
    
    // Reset analog values when joystick is released
    this._analog.force = 0;
    this._analog.angle = 0;
    this._analog.direction.x = 0;
    this._analog.direction.y = 0;
    this._analog.isActive = false;
    this._analog.rotationIntensity = 0;
    this._analog.rotationDirection = 0;
  }

  handleKeyDown(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    const action = this.keyMap[key];
    if (action) {
      this._keys[action] = true;
    }
  }

  handleKeyUp(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    const action = this.keyMap[key];
    if (action) {
      this._keys[action] = false;
    }
  }

  async Destroy(): Promise<void> {
    document.removeEventListener("keydown", this.HandleKeyDown);
    document.removeEventListener("keyup", this.HandleKeyUp);

    // Cleanup joystick
    if (this.joystickManager) {
      this.joystickManager.destroy();
      this.joystickManager = null;
    }

    // Remove joystick zone from DOM
    if (this.joystickZone && this.joystickZone.parentNode) {
      this.joystickZone.parentNode.removeChild(this.joystickZone);
    }

    //broadcast event input destroyed
    this._entity.Broadcast({ topic: "inputdestroyed", data: null });
  }
}

export { KeyboardInput };
