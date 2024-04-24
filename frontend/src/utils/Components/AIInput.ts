import { Component } from "../Component";
import { Entity } from "../Entity";

class AIInput extends Component {

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

  constructor() {
    super();


  }

  async InitComponent(entity: Entity): Promise<void> {
    this._entity = entity;
    this.Init_();
    // setInterval(() => {
    //   //randomly change the keys
    //   this._keys.forward = Math.random() > 0.5;
    //   this._keys.backward = Math.random() > 0.5;
    //   this._keys.left = Math.random() > 0.5;
    //   this._keys.right = Math.random() > 0.5;
    //  } , 5000);
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


  }

  Update(deltaTime: number): void {
  }
}
export { AIInput };