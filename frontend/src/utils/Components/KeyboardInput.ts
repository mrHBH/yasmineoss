import { Component } from "../Component";
import { Entity } from "../Entity";

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
  keyMap: { [key: string]: string; };
  HandleKeyDown: (event: KeyboardEvent) => void;
  HandleKeyUp: (event: KeyboardEvent) => void;

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

    this.initKeyMap();

    this.HandleKeyDown = this.handleKeyDown.bind(this);
    this.HandleKeyUp = this.handleKeyUp.bind(this);

    document.addEventListener("keydown", this.HandleKeyDown);
    document.addEventListener("keyup", this.HandleKeyUp);
  }

  initKeyMap() {
    const navigator = window.navigator;
    const language = navigator.language || navigator.userLanguage;
    const platform = navigator.platform;
     this.keyMap = {
      "en-US": {
        z: "forward",
        s: "backward",
        q: "left",
        d: "right",
        " ": "space",
        shift: "shift",
        e: "action",
        x: "attack1",
        r: "attack2",
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
        r: "attack2",
      },
    };

    if (this.keyMap[language]) {
      this.keyMap = this.keyMap[language];
    } else if (this.keyMap["en-US"]) {
      this.keyMap = this.keyMap["en-US"];
    } else {
      console.error("Unsupported keyboard layout");
    }
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

    //broadcast event input destroyed
    this._entity.Broadcast({ topic: "inputdestroyed", data: null });
  }
}

export { KeyboardInput };
