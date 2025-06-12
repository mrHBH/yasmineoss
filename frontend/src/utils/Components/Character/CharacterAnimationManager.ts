import * as THREE from "three";
import { createMachine, interpret } from "xstate";

export class CharacterAnimationManager {
  public _mixer: THREE.AnimationMixer;
  private _model: THREE.Object3D;
  public animations_: { [key: string]: THREE.AnimationClip };
  private AnimationFSM_: any;
  public AnimationFSMService_: any;
  public state: string = "Ideling";

  constructor(model: THREE.Object3D, animations: { [key: string]: THREE.AnimationClip }) {
    this._model = model;
    this.animations_ = animations;
    this._mixer = new THREE.AnimationMixer(this._model);
    
    // Start with default animation
    const keys = Object.keys(this.animations_);
    const defaultAnimation = this.animations_["Ideling"] || this.animations_[keys[0]];
    if (defaultAnimation) {
      this._mixer.clipAction(defaultAnimation).play();
    }

    this.createFSM();
  }

  private createFSM() {
    this.AnimationFSM_ = createMachine(
      {
        context: {
          initialDelayer: {},
          lastplayedanimation: "",
          targetanimation: "",
          targetRestoreAnimation: "",
          cb: () => {},
          playonce: false,
        },
        id: "character",
        initial: "Ideling",
        states: {
          Falling: {
            entry: "StartFalling",
            on: {
              LAND: {
                target: "Landing",
              },
            },
          },
          Pain: {
            entry: "StartPain",
            on: {
              STAND: {
                target: "Ideling",
              },
            },
          },
          Landing: {
            entry: "StartLanding",
            on: {
              LAND: {
                target: "Ideling",
              },
            },
          },
          Mounting: {
            entry: "StartMounting",
            on: {
              MOUNTED: {
                target: "Driving",
              },
            },
          },
          Unmounting: {
            entry: "StartUnmounting",
            on: {
              UNMOUNTED: {
                target: "Ideling",
              },
            },
          },
          Driving: {
            entry: "StartDriving",
            on: {
              STOPDRIVING: {
                target: "Unmounting",
              },
            },
          },
          Executing: {
            entry: "StartExecuting",
            on: {
              KICK: {
                target: "Kicking",
              },
              KICKED: {
                target: "Kicked",
              },
              DONE: {
                target: "EndExecuting",
              },
              STOP: {
                target: "EndExecuting",
              },
            },
          },
          EndExecuting: {
            entry: "StartEndExecuting",
            on: {
              DONE: {
                target: "Ideling",
              },
              STOP: {
                target: "Ideling",
              },
            },
          },
          Ideling: {
            entry: "StartIdeling",
            on: {
              FALL: {
                target: "Falling",
              },
              WALK: {
                cond: "canWalk",
                target: "Walking",
              },
              SLOWWALK: {
                cond: "canWalk",
                target: "SlowWalking",
              },
              BACKWARDWALK: {
                target: "BackwardWalking",
              },
              TURNRIGHT: {
                target: "TurningRight",
              },
              TURNLEFT: {
                target: "TurningLeft",
              },
              PUSH: {
                target: "Pushing",
              },
              JUMP: {
                target: "JumpingFromStill",
              },
              EXECUTE: {
                target: "Executing",
              },
              KICK: {
                target: "Kicking",
              },
              KICKED: {
                target: "Kicked",
              },
              DRIVE: {
                target: "Mounting",
              },
            },
            after: {
              BOREDOM_DELAY: {
                target: "Executing",
                actions: function (context, _event) {
                  context.targetanimation =
                    Math.random() > 0.5 ? "DyingForward" : "DyingForward2";
                  context.targetRestoreAnimation = "UndyingForward";
                },
              },
            },
          },
          Kicking: {
            entry: "StartKicking",
            on: {
              ENDKICK: {
                target: "Ideling",
              },
              KICKED: {
                target: "Kicked",
              },
            },
          },
          Pushing: {
            entry: "StartPushing",
            on: {
              STOP: {
                target: "Ideling",
              },
              STAND: {
                target: "Ideling",
              },
              WALK: {
                cond: "canWalk",
                target: "Walking",
              },
            },
          },
          TurningRight: {
            entry: "StartTurningRight",
            on: {
              STOP: {
                target: "Ideling",
              },
            },
          },
          TurningLeft: {
            entry: "StartTurningLeft",
            on: {
              STOP: {
                target: "Ideling",
              },
            },
          },
          Kicked: {
            entry: "StartKicked",
            on: {
              RECOVER: {
                target: "Recovering",
              },
              SUFFER: {
                target: "Pain",
              },
            },
          },
          Recovering: {
            entry: "StartRecovering",
            on: {
              STAND: {
                target: "Ideling",
              },
            },
          },
          Walking: {
            entry: "StartWalking",
            on: {
              FALL: {
                target: "Falling",
              },
              STOP: {
                target: "Ideling",
              },
              RUN: {
                target: "Running",
              },
              JUMP: {
                target: "JumpingFromWalk",
              },
            },
          },
          BackwardWalking: {
            entry: "StartBackwardWalking",
            on: {
              STOP: {
                target: "Ideling",
              },
            },
          },
          Running: {
            entry: "StartRunning",
            on: {
              WALK: {
                cond: "canWalk",
                target: "Walking",
              },
              STOP: {
                target: "StoppingRunning",
              },
              JUMP: {
                target: "JumpingFromRun",
              },
            },
          },
          SlowWalking: {
            entry: "StartSlowWalking",
            on: {
              STOP: {
                target: "Ideling",
              },
              WALK: {
                cond: "canWalk",
                target: "Walking",
              },
            },
          },
          StoppingRunning: {
            entry: "StartStoppingRunning",
            on: {
              RUNNINGSTOPPED: {
                target: "Ideling",
              },
            },
          },
          JumpingFromStill: {
            entry: "StartJumping",
            on: {
              LAND: {
                target: "Ideling",
              },
            },
          },
          JumpingFromWalk: {
            entry: "StartJumping2",
            on: {
              LAND: {
                target: "Ideling",
              },
            },
          },
          JumpingFromRun: {
            entry: "StartJumping",
            on: {
              LAND: {
                target: "Walking",
              },
            },
          },
        },
      },
      {
        actions: this.createAnimationActions(),
        guards: {
          IsWalking: (_context, _event) => {
            return true;
          },
          canWalk: (_context, _event) => {
            // This will be injected by the character component
            return this.canWalkCallback ? this.canWalkCallback() : true;
          },
        },
        delays: {
          BOREDOM_DELAY: (_context, _event) => {
            return 30000;
          },
          ANIMATION_DELAY: (context, _event) => {
            const curAction = this.animations_[context.targetanimation];
            if (curAction !== undefined) {
              return curAction.duration * 1000;
            }
            return 99999;
          },
        },
      }
    );

    this.AnimationFSMService_ = interpret(this.AnimationFSM_).start();
    this.AnimationFSMService_.onTransition((state) => {
      this.state = state.value;
    });

    // Ensure initial state is set
    if (this.AnimationFSMService_.state) {
      this.state = this.AnimationFSMService_.state.value;
    }
  }

  private canWalkCallback: () => boolean;

  setCanWalkCallback(callback: () => boolean) {
    this.canWalkCallback = callback;
  }

  private getCurrentAnimation(): THREE.AnimationClip | null {
    if (!this.AnimationFSMService_ || !this.AnimationFSMService_.state) {
      return null;
    }
    return this.animations_[this.AnimationFSMService_.state.value] || null;
  }

  private getPreviousAnimation(): THREE.AnimationClip | null {
    if (!this.AnimationFSMService_ || !this.AnimationFSMService_._state || !this.AnimationFSMService_._state.history) {
      return null;
    }
    return this.animations_[this.AnimationFSMService_._state.history.value] || null;
  }

  private createAnimationActions() {
    return {
      StartFalling: (_context, _event) => {
        const ac1 = this.getCurrentAnimation();
        const ac2 = this.getPreviousAnimation();

        if (!ac1 || !ac2) return;

        const curAction = this._mixer.clipAction(ac1);
        const prevAction = this._mixer.clipAction(ac2);

        curAction.time = 0.0;
        curAction.enabled = true;
        curAction.setEffectiveTimeScale(1.0);
        curAction.setEffectiveWeight(1.0);
        curAction.crossFadeFrom(prevAction, 0.25, true);
        curAction.play();
      },

      StartLanding: (_context, _event) => {
        const ac1 = this.animations_[this.AnimationFSMService_.state.value];
        const ac2 = this.animations_[this.AnimationFSMService_._state.history.value];

        const curAction = this._mixer.clipAction(ac1);
        const prevAction = this._mixer.clipAction(ac2);

        curAction.time = 0.0;
        curAction.enabled = true;
        curAction.setEffectiveTimeScale(1.0);
        curAction.setEffectiveWeight(1.0);
        curAction.crossFadeFrom(prevAction, 0.1, true);
        curAction.play();

        // Landing animation with forward movement
        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(this._model.quaternion);
        forward.normalize();

        let interval;
        setTimeout(() => {
          this.AnimationFSMService_.send("LAND");
          interval = setInterval(() => {
            if (this.onMoveForward) {
              this.onMoveForward(forward.clone().multiplyScalar(1.05));
            }
          }, 10);
        }, curAction.getClip().duration * 1000 - 250);

        setTimeout(() => {
          clearInterval(interval);
        }, curAction.getClip().duration * 1000);
      },

      StartWalking: (_context, _event) => {
        const ac1 = this.animations_[this.AnimationFSMService_.state.value];
        const ac2 = this.animations_[this.AnimationFSMService_._state.history.value];

        const curAction = this._mixer.clipAction(ac1);
        const prevAction = this._mixer.clipAction(ac2);

        curAction.time = 0.0;
        curAction.enabled = true;
        curAction.setEffectiveTimeScale(1.0);
        curAction.setEffectiveWeight(1.0);
        curAction.crossFadeFrom(prevAction, 0.25, true);
        curAction.play();
      },

      StartJumping: (_context, _event) => {
        const ac1 = this.animations_[this.AnimationFSMService_.state.value];
        const ac2 = this.animations_[this.AnimationFSMService_._state.history.value];

        const curAction = this._mixer.clipAction(ac1);
        const prevAction = this._mixer.clipAction(ac2);

        curAction.time = 0.0;
        curAction.enabled = true;
        curAction.setEffectiveTimeScale(1.0);
        curAction.setEffectiveWeight(1.0);
        curAction.crossFadeFrom(prevAction, 0.25, true);
        curAction.play();

        setTimeout(() => {
          curAction.crossFadeFrom(prevAction, 0.25, true);
          this.AnimationFSMService_.send("LAND");
        }, (curAction.getClip().duration * 1000) / 1);
      },

      StartJumping2: (_context, _event) => {
        const ac1 = this.animations_[this.AnimationFSMService_.state.value];
        const ac2 = this.animations_[this.AnimationFSMService_._state.history.value];

        const curAction = this._mixer.clipAction(ac1);
        const prevAction = this._mixer.clipAction(ac2);

        curAction.time = 0.0;
        curAction.enabled = true;
        curAction.setEffectiveTimeScale(1.0);
        curAction.setEffectiveWeight(1.0);
        curAction.crossFadeFrom(prevAction, 0.25, true);
        curAction.play();

        this.AnimationFSMService_.send("LAND");
      },

      StartSlowWalking: (_context, _event) => {
        const ac1 = this.animations_[this.AnimationFSMService_.state.value];
        const ac2 = this.animations_[this.AnimationFSMService_._state.history.value];

        const curAction = this._mixer.clipAction(ac1);
        const prevAction = this._mixer.clipAction(ac2);

        curAction.time = 0.0;
        curAction.enabled = true;
        curAction.setEffectiveTimeScale(1.0);
        curAction.setEffectiveWeight(1.0);
        curAction.crossFadeFrom(prevAction, 0.25, true);
        curAction.play();
      },

      StartBackwardWalking: (_context, _event) => {
        const ac1 = this.animations_[this.AnimationFSMService_.state.value];
        const ac2 = this.animations_[this.AnimationFSMService_._state.history.value];

        const curAction = this._mixer.clipAction(ac1);
        const prevAction = this._mixer.clipAction(ac2);

        curAction.time = 0.0;
        curAction.enabled = true;
        curAction.setEffectiveTimeScale(1.0);
        curAction.setEffectiveWeight(1.0);
        curAction.crossFadeFrom(prevAction, 0.25, true);
        curAction.play();
      },

      StartRunning: (_context, _event) => {
        const previousState = this.AnimationFSMService_._state.history.value;
        const ac1 = this.animations_[this.AnimationFSMService_.state.value];
        const ac2 = this.animations_[this.AnimationFSMService_._state.history.value];

        const curAction = this._mixer.clipAction(ac1);
        const prevAction = this._mixer.clipAction(ac2);

        curAction.enabled = true;

        if (previousState == "Walking") {
          const ratio = curAction.getClip().duration / prevAction.getClip().duration;
          curAction.time = prevAction.time * ratio;
        } else {
          curAction.time = 0.0;
          curAction.setEffectiveTimeScale(-1.6);
          curAction.setEffectiveWeight(1.0);
        }

        curAction.crossFadeFrom(prevAction, 0.1, true);
        curAction.play();
      },

      StartStoppingRunning: (_context, _event) => {
        const ac1 = this.animations_[this.AnimationFSMService_.state.value];
        const ac2 = this.animations_[this.AnimationFSMService_._state.history.value];

        const curAction = this._mixer.clipAction(ac1);
        const prevAction = this._mixer.clipAction(ac2);

        curAction.enabled = true;
        curAction.setEffectiveWeight(1.0);
        curAction.setEffectiveTimeScale(1);

        curAction.reset();
        curAction.setLoop(THREE.LoopOnce, 1);
        curAction.clampWhenFinished = true;
        curAction.crossFadeFrom(prevAction, 0.1, true);
        curAction.play();

        setTimeout(() => {
          this.AnimationFSMService_.send("RUNNINGSTOPPED");
        }, (curAction.getClip().duration * 1000) / 1);
      },

      StartIdeling: (context, _event) => {
        if (this.AnimationFSMService_ !== undefined) {
          const ac1 = this.animations_[this.AnimationFSMService_.state.value];
          const ac2 = this.animations_[this.AnimationFSMService_._state.history.value];
          const ac3 = this.animations_[context.targetRestoreAnimation];

          const curAction = this._mixer.clipAction(ac1);
          const prevAction = ac3 ? this._mixer.clipAction(ac3) : this._mixer.clipAction(ac2);
          context.targetRestoreAnimation = "";

          if (prevAction !== undefined) {
            curAction.time = 0.0;
            curAction.enabled = true;
            curAction.setEffectiveTimeScale(1.0);
            curAction.setEffectiveWeight(1.0);
            curAction.crossFadeFrom(prevAction, 0.35, false);
            curAction.play();
          } else {
            const actionprev = this._mixer.clipAction(this.animations_[context.lastplayedanimation]);
            curAction.time = 0.0;
            curAction.enabled = true;
            curAction.setEffectiveTimeScale(1.0);
            curAction.setEffectiveWeight(1.0);
            curAction.crossFadeFrom(actionprev, 0.35, false);
            curAction.play();
          }
        }
      },

      StartTurningRight: (_context, _event) => {
        const ac1 = this.animations_[this.AnimationFSMService_.state.value];
        const ac2 = this.animations_[this.AnimationFSMService_._state.history.value];

        const curAction = this._mixer.clipAction(ac1);
        const prevAction = this._mixer.clipAction(ac2);

        curAction.time = 0.0;
        curAction.enabled = true;
        curAction.setEffectiveTimeScale(1.5);
        curAction.setEffectiveWeight(1.0);
        curAction.crossFadeFrom(prevAction, 0.65, true);
        curAction.play();
      },

      StartExecuting: (context, _event) => {
        const ac1 = this.animations_[context.targetanimation];
        const ac2 = this.animations_[this.AnimationFSMService_._state.history.value];

        const curAction = this._mixer.clipAction(ac1);
        const prevAction = this._mixer.clipAction(ac2);

        let playonece = context.playonce;

        curAction.time = 0.0;
        curAction.enabled = true;
        curAction.setEffectiveTimeScale(1.0);
        curAction.setEffectiveWeight(1.0);
        curAction.crossFadeFrom(prevAction, 0.65, true);

        context.lastplayedanimation = context.targetanimation;

        if (!playonece) {
          curAction.reset();
          curAction.clampWhenFinished = true;
          curAction.setLoop(THREE.LoopOnce, 1);
          curAction.play();
        } else {
          curAction.reset();
          curAction.clampWhenFinished = true;
          curAction.play();
        }
      },

      StartEndExecuting: (context, _event) => {
        if (context.targetRestoreAnimation !== "") {
          const ac1 = this.animations_[context.targetRestoreAnimation];
          const ac2 = this.animations_[context.targetanimation];

          const curAction = this._mixer.clipAction(ac1);
          const prevAction = this._mixer.clipAction(ac2);
          curAction.reset();
          curAction.time = 0.0;
          curAction.enabled = true;
          curAction.setEffectiveTimeScale(1.0);
          curAction.setEffectiveWeight(1.0);
          curAction.crossFadeFrom(prevAction, 0.65, true);
          curAction.setLoop(THREE.LoopOnce, 1);
          curAction.clampWhenFinished = true;
          curAction.play();

          setTimeout(() => {
            this.AnimationFSMService_.send("DONE");
          }, curAction.getClip().duration * 1000);
        }
      },

      StartPushing: (_context, _event) => {
        const ac1 = this.animations_[this.AnimationFSMService_.state.value];
        const ac2 = this.animations_[this.AnimationFSMService_._state.history.value];

        const curAction = this._mixer.clipAction(ac1);
        const prevAction = this._mixer.clipAction(ac2);

        curAction.time = 0.0;
        curAction.enabled = true;
        curAction.setEffectiveTimeScale(1.0);
        curAction.setEffectiveWeight(1.0);
        curAction.crossFadeFrom(prevAction, 0.65, true);
        curAction.play();
      },

      StartTurningLeft: (_context, _event) => {
        const ac1 = this.animations_[this.AnimationFSMService_.state.value];
        const ac2 = this.animations_[this.AnimationFSMService_._state.history.value];

        const curAction = this._mixer.clipAction(ac1);
        const prevAction = this._mixer.clipAction(ac2);

        curAction.time = 0.0;
        curAction.enabled = true;
        curAction.setEffectiveTimeScale(1.0);
        curAction.setEffectiveWeight(1.0);
        curAction.crossFadeFrom(prevAction, 0.65, true);
        curAction.play();
      },

      StartMounting: (_context, _event) => {
        if (this.onMounting) {
          this.onMounting();
        }

        let ac1 = this.animations_[this.AnimationFSMService_.state.value];
        let ac2 = this.animations_[this.AnimationFSMService_._state.history.value];
        
        const curAction = this._mixer.clipAction(ac1);
        const prevAction = this._mixer.clipAction(ac2);
    
        curAction.reset();
        curAction.setLoop(THREE.LoopOnce, 1);
        curAction.clampWhenFinished = true;
        curAction.time = 0.0;
        curAction.enabled = true;
        curAction.setEffectiveWeight(1.0);
        curAction.crossFadeFrom(prevAction, 0.25, true);
        curAction.play();
    
        setTimeout(() => {
          this.AnimationFSMService_.send("MOUNTED");
        }, curAction.getClip().duration * 1000);
      },

      StartDriving: (_context, _event) => {
        let ac1 = this.animations_[this.AnimationFSMService_.state.value];
        let ac2 = this.animations_[this.AnimationFSMService_._state.history.value];
         
        const curAction = this._mixer.clipAction(ac1);
        const prevAction = this._mixer.clipAction(ac2);

        curAction.time = 0.0;
        curAction.enabled = true;
        curAction.clampWhenFinished = true;
        curAction.setEffectiveTimeScale(1.0);
        curAction.setEffectiveWeight(1.0);
        curAction.crossFadeFrom(prevAction, 0.25, true);
        curAction.play();
      },

      StartUnmounting: (_context, _event) => {
        const ac1 = this.animations_[this.AnimationFSMService_.state.value];
        const ac2 = this.animations_[this.AnimationFSMService_._state.history.value];

        const curAction = this._mixer.clipAction(ac1);
        const prevAction = this._mixer.clipAction(ac2);

        curAction.reset();
        curAction.setLoop(THREE.LoopOnce, 1);
        curAction.clampWhenFinished = true;
        curAction.time = 0.0;
        curAction.enabled = true;
        curAction.setEffectiveWeight(1.0);
        curAction.crossFadeFrom(prevAction, 0.25, true);
        curAction.play();

        setTimeout(() => {
          if (this.onUnmounting) {
            this.onUnmounting();
          }
          this.AnimationFSMService_.send("UNMOUNTED");
        }, curAction.getClip().duration * 1000);
      },

      StartKicking: (_context, _event) => {
        // Implementation for kicking animation
      },

      StartKicked: (_context, _event) => {
        // Implementation for kicked animation
      },

      StartRecovering: (_context, _event) => {
        // Implementation for recovering animation
      },

      StartPain: (_context, _event) => {
        // Implementation for pain animation
      },
    };
  }

  // Callback hooks for external systems
  public onMoveForward: (direction: THREE.Vector3) => void;
  public onMounting: () => void;
  public onUnmounting: () => void;

  sendEvent(event: string) {
    if (this.AnimationFSMService_ && this.AnimationFSMService_.send) {
      this.AnimationFSMService_.send(event);
    }
  }

  update(deltaTime: number) {
    this._mixer.update(deltaTime);
  }

  getCurrentState(): string {
    return this.state;
  }

  getCurrentClipDuration(): number {
    if (!this.AnimationFSMService_ || !this.AnimationFSMService_.state) {
      return 0;
    }
    const currentState = this.AnimationFSMService_.state.value;
    const clip = this.animations_[currentState];
    return clip ? clip.duration * 1000 : 0;
  }

  getAcceleration(state: string): number {
    switch (state) {
      case "Ideling":
        return 0;
      case "Walking":
        return 4;
      case "Running":
        return 9;
      case "BackwardWalking":
        return 1.45;
      case "SlowWalking":
        return 1.35;
      case "Landing":
        return 2;
      case "JumpingFromWalk":
        return 2;
      case "JumpingFromRun":
        return 15;
      case "Pushing":
        return 3.5;
      case "Falling":
        return 3;
      default:
        return 0;
    }
  }

  destroy() {
    if (this._mixer) {
      this._mixer.stopAllAction();
      this._mixer.uncacheRoot(this._model);
      this._mixer = null;
    }
    
    if (this.AnimationFSMService_) {
      this.AnimationFSMService_.stop();
      this.AnimationFSMService_ = null;
    }
    
    this.animations_ = null;
  }
}
