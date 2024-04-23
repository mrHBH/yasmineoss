import { Component } from "../Component";
import * as THREE from "three";
import { Entity } from "../Entity";
import { LoadingManager } from "../LoadingManager";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { MeshBVHHelper } from "three-mesh-bvh";
import { createMachine, interpret , assign } from "xstate";
import * as CANNON from "cannon-es";
import { cursorTo } from "readline";
import { cp } from "fs";
import { MainController } from "../MainController";
import { ITask } from "../TaskManager";
 
 

class CharacterComponent extends Component {
  private _model: THREE.Object3D;
  private _modelpath: string;

  private _animationspathslist: { url: string; shiftTracks: boolean }[];
  private _animation: THREE.AnimationClip;
  private _scene: THREE.Scene;
  private _mixer: THREE.AnimationMixer;
  private _pointCloud: THREE.Points;
  private _webgpugroup: THREE.Group;
  private _css2dgroup: THREE.Group;
  private _css3dgroup: THREE.Group;
  private _titlebar: HTMLElement;
  private _AnimationFSM: any;
  private _actor: any;
    animations_: { string: THREE.AnimationClip };
  private _physicsbodies: CANNON.Body[] = [];
  body: CANNON.Body;
  private _characterFSM: any;
  private _characterActor: any;
  AnimationFSMService_: any;
  AnimationFSM_: any;
  canJump: boolean;
  isColliding_: boolean;
   acceleration_: any;
  decceleration_: THREE.Vector3;
  velocity_: THREE.Vector3;
  BehaviourFSM_: any;
  BehaviourFSM_Service_: any;
  AIinputkeys_: any;
  taskintervals: any;
   Input: any;
  htmlcontainer: HTMLDivElement;
  state : string;

  constructor({ modelpath, animationspathslist }) {
    super();
    this._componentname = "CharacterComponent";
    this._modelpath = modelpath;
    this._animationspathslist = animationspathslist;
    this.canJump = true;
    this.isColliding_ = false;

    this._webgpugroup = new THREE.Group();
    this._css2dgroup = new THREE.Group();
  }

  
  async InitComponent(entity: Entity): Promise<void> {
    this._entity = entity;
    this._model = await LoadingManager.loadGLTF(this._modelpath);

    this.decceleration_ = new THREE.Vector3(-0.005, -0.001, -7.0);
    this.acceleration_ = new THREE.Vector3(1, 0.125, 5.0);
    this.velocity_ = new THREE.Vector3(0, 0, 0);

    // this._animation = await LoadingManager.loadGLTFAnimation(
    //   "animations/gltf/ybot2@walking.glb"
    // );
    this.animations_ = await LoadingManager.loadGLTFFirstAnimations(
      this._animationspathslist
    );
    //pick a random animation
    const keys = Object.keys(this.animations_);
    const randomIndex = Math.floor(Math.random() * keys.length);
    const randomKey = keys[randomIndex];
    console.log(this.animations_);
    this._animation = this.animations_["Ideling"];

    this._model.userData.entity = this._entity;
    this._webgpugroup.add(this._model);

    this._mixer = new THREE.AnimationMixer(this._model);
    //this._mixer.clipAction(this._animations[ 7]).play();

    this._mixer.clipAction(this._animation).play();
    this._model.traverse(
      function (child: any) {
        if (child.isMesh) {
          child.userData.component = this;
          //hide the mesh
          //  child.visible = false;
          // const materialPoints = new PointsNodeMaterial({ size: 0.05, color: new THREE.Color(0x0011ff) });
          // child.updateMatrixWorld(true); // Force update matrix and children
          //create a skinning node
          //    const animatedskinning =  skinning( child ) ;
          //   materialPoints.positionNode = animatedskinning;
          // child.geometry.computeBoundsTree();
          // let boundsViz = new MeshBVHHelper( child );
          //this._group.attach(boundsViz);

          //set scale and rotation of the points

          //adjust scale and rotation of the points
          //materialPoints.positionNode = uniform( child.scale );

          //materialPoints.positionNode = skinning( child );
          // materialPoints.positionNode = uniform( child.position );

          // //   child.updateMatrixWorld(true); // Force update matrix and children
          // this._pointCloud = new THREE.Points(child.geometry, materialPoints);

          // this._webgpugroup.add(this._pointCloud);
        }
      }.bind(this)
    );
    const colliderShape = new CANNON.Sphere(0.24);
    const colliderShapeTop = new CANNON.Cylinder(0.1, 0.1, 0.9, 8);

    this.body = new CANNON.Body({
      mass: 50,
      allowSleep: false,
      material: new CANNON.Material({ friction: 336.0, restitution: 0.0 }),
    });
    this.body.addShape(colliderShape, new CANNON.Vec3(0, 0.24, 0.2));
    this.body.addShape(colliderShapeTop, new CANNON.Vec3(0, 1.2, 0));
    //set initial position
    this.body.position.set(
      this._entity.Position.x,
      this._entity.Position.y,
      this._entity.Position.z
    );
    this.body.quaternion.setFromEuler(
      this._entity.Quaternion.x,
      this._entity.Quaternion.y,
      this._entity.Quaternion.z
    );

    this.body.linearDamping = 0.9;
    this.body.angularFactor.set(0, 1, 0);
    this.body.fixedRotation = true;
    this.taskintervals = [];
    this.CreateFSM_();

     
   // this.walktopos( new THREE.Vector3( Math.random() * 150, 0, Math.random() * 190));
 
  }

  transitionToAnimation(
    _,
    params: { animation1: string; animation2: string; playonce: boolean }
  ) {
    console.log(`Initial rating: ${params.animation1} to ${params.animation2}`);
    console.log(this.animations_);
    //console.log("start executing + " + context.targetanimation);
    const ac1 = this.animations_[params.animation2];
    const ac2 = this.animations_[params.animation1];

    console.log(ac1);
    console.log(ac2);

    let curAction = this._mixer.clipAction(ac1);
    let prevAction = this._mixer.clipAction(ac2);

    let playonece = params.playonce;

    curAction.time = 0.0;
    curAction.enabled = true;
    curAction.setEffectiveTimeScale(1.0);
    curAction.setEffectiveWeight(1.0);
    curAction.crossFadeFrom(prevAction, 0.65, true);
    if (!playonece) {
      curAction.reset();
      curAction.clampWhenFinished = true;
      curAction.setLoop(THREE.LoopOnce, 1);
      curAction.play();

      // setTimeout(() => {
      //   this._characterActor.send({ type: "done" });

      // }, curAction.getClip().duration * 1000);
    } else {
      //animation stops after one loop
      curAction.reset();
      curAction.clampWhenFinished = true;
      curAction.play();
    }
  }

  transition(context, event, params) {
    console.log(`Transitioning from ${context._state} to ${event.type}`);
    console.log(params);
    const {
      crossFadeDuration = 0.25,
      timeScale = 1.0,
      weight = 1.0,
      onFinish,
      loop = THREE.LoopRepeat,
    } = params;
    const curAction = this.animations_[this.AnimationFSMService_.state.value];
    const prevAction =
      this.animations_[this.AnimationFSMService_._state.history.value];

    curAction.reset();
    curAction.setLoop(loop, Infinity);
    curAction.clampWhenFinished = loop === THREE.LoopOnce;
    curAction.time = 0.0;
    curAction.enabled = true;
    curAction.setEffectiveTimeScale(timeScale);
    curAction.setEffectiveWeight(weight);
    curAction.crossFadeFrom(prevAction, crossFadeDuration, true);
    curAction.play();

    if (onFinish) {
      setTimeout(() => {
        onFinish();
      }, curAction.getClip().duration * 1000);
    }
  }

  CreateFSM_() {
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

            // after: {
            // 	ANIMATION_DELAY: {
            // 		target: "Ideling",
            // 		// actions: function (context, event) {
            // 		// 	context.targetanimation = "Sleeping";
            // 		// 	console.log("BOREDOM_DELAY");
            // 		// },

            // 	},
            // },
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
                actions: function (context, event) {
                  //DyingForward2 or 1
                  context.targetanimation =
                    Math.random() > 0.5 ? "DyingForward" : "DyingForward2";
                  context.targetRestoreAnimation = "UndyingForward";
                  //	console.log("BOREDOM_DELAY");
                },
              },
            },
          },
          Kicking: {
            entry: "StartKicking",
            on: {
              // STOP: {
              // 	target: "Ideling",
              // },
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
            entry: "StartJumping",
            on: {
              LAND: {
                target: "StoppingRunning",
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
        actions: {
          StartFalling: (context, event) => {
            const ac1 = this.animations_[this.AnimationFSMService_.state.value];

            const ac2 =
              this.animations_[this.AnimationFSMService_._state.history.value];

            const curAction = this._mixer.clipAction(ac1);
            const prevAction = this._mixer.clipAction(ac2);

            curAction.time = 0.0;
            curAction.enabled = true;
            curAction.setEffectiveTimeScale(1.0);
            curAction.setEffectiveWeight(1.0);
            curAction.crossFadeFrom(prevAction, 0.25, true);
            curAction.play();
          },

          StartLanding: (context, event) => {
            const ac1 = this.animations_[this.AnimationFSMService_.state.value];

            const ac2 =
              this.animations_[this.AnimationFSMService_._state.history.value];

            const curAction = this._mixer.clipAction(ac1);
            const prevAction = this._mixer.clipAction(ac2);

            curAction.time = 0.0;
            curAction.time = 0.0;
            curAction.enabled = true;
            curAction.setEffectiveTimeScale(1.0);
            curAction.setEffectiveWeight(1.0);
            curAction.crossFadeFrom(prevAction, 0.1, true);
            curAction.play();

            //get forward vector
            const forward = new THREE.Vector3(0, 0, 1);
            forward.applyQuaternion(this._webgpugroup.quaternion);
            forward.normalize();
            //apply a force to the body

            //set timeout to land
            setTimeout(() => {
              this.AnimationFSMService_.send("LAND");
              //this.Parent.SetPosition(controlObject);
              //	this.body.position.copy(new CANNON.Vec3(controlObject.x, controlObject.y, controlObject.z));
            }, curAction.getClip().duration * 1000 - 250);
          },
          StartWalking: (context, event) => {
            console.log(this.animations_);
            console.log(this.AnimationFSMService_.state.value);
            console.log(this.AnimationFSMService_._state.history.value);
            const ac1 = this.animations_[this.AnimationFSMService_.state.value];

            const ac2 =
              this.animations_[this.AnimationFSMService_._state.history.value];

            const curAction = this._mixer.clipAction(ac1);
            const prevAction = this._mixer.clipAction(ac2);

            curAction.time = 0.0;
            curAction.enabled = true;
            curAction.setEffectiveTimeScale(1.0);
            curAction.setEffectiveWeight(1.0);
            curAction.crossFadeFrom(prevAction, 0.25, true);
            curAction.play();
          },
          StartJumping: (context, event) => {
            const ac1 = this.animations_[this.AnimationFSMService_.state.value];

            const ac2 =
              this.animations_[this.AnimationFSMService_._state.history.value];

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

          StartSlowWalking: (context, event) => {
            const ac1 = this.animations_[this.AnimationFSMService_.state.value];

            const ac2 =
              this.animations_[this.AnimationFSMService_._state.history.value];

            const curAction = this._mixer.clipAction(ac1);
            const prevAction = this._mixer.clipAction(ac2);

            curAction.time = 0.0;
            curAction.enabled = true;
            curAction.setEffectiveTimeScale(1.0);
            curAction.setEffectiveWeight(1.0);
            curAction.crossFadeFrom(prevAction, 0.25, true);
            curAction.play();
          },
          StartBackwardWalking: (context, event) => {
            console.log("backward walking");
            console.log(this.animations_);
            console.log(this.AnimationFSMService_.state.value);
            console.log(this.AnimationFSMService_._state.history.value);
            const ac1 = this.animations_[this.AnimationFSMService_.state.value];

            const ac2 =
              this.animations_[this.AnimationFSMService_._state.history.value];

            const curAction = this._mixer.clipAction(ac1);
            const prevAction = this._mixer.clipAction(ac2);

            curAction.time = 0.0;
            curAction.enabled = true;
            curAction.setEffectiveTimeScale(1.0);
            curAction.setEffectiveWeight(1.0);
            curAction.crossFadeFrom(prevAction, 0.25, true);
            curAction.play();
          },
          StartRunning: (context, event) => {
            const previousState =
              this.AnimationFSMService_._state.history.value;
            const ac1 = this.animations_[this.AnimationFSMService_.state.value];

            const ac2 =
              this.animations_[this.AnimationFSMService_._state.history.value];

            const curAction = this._mixer.clipAction(ac1);
            const prevAction = this._mixer.clipAction(ac2);

            curAction.enabled = true;

            if (previousState == "Walking") {
              const ratio =
                curAction.getClip().duration / prevAction.getClip().duration;
              curAction.time = prevAction.time * ratio;
            } else {
              curAction.time = 0.0;
              curAction.setEffectiveTimeScale(-1.6);
              curAction.setEffectiveWeight(1.0);
            }

            curAction.crossFadeFrom(prevAction, 0.1, true);
            curAction.play();
          },
          StartStoppingRunning: (context, event) => {
            const ac1 = this.animations_[this.AnimationFSMService_.state.value];

            const ac2 =
              this.animations_[this.AnimationFSMService_._state.history.value];

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
          StartIdeling: (context, event) => {
            if (this.AnimationFSMService_ !== undefined) {
              const ac1 =
                this.animations_[this.AnimationFSMService_.state.value];

              const ac2 =
                this.animations_[
                  this.AnimationFSMService_._state.history.value
                ];
              const ac3 = this.animations_[context.targetRestoreAnimation];

              const curAction = this._mixer.clipAction(ac1);
              const prevAction = ac3
                ? this._mixer.clipAction(ac3)
                : this._mixer.clipAction(ac2);
              context.targetRestoreAnimation = "";
              //create new mixer
              //this._mixer = new THREE.AnimationMixer(this._model);

              if (prevAction !== undefined) {
                curAction.time = 0.0;
                curAction.enabled = true;
                curAction.setEffectiveTimeScale(1.0);
                curAction.setEffectiveWeight(1.0);
                curAction.crossFadeFrom(prevAction, 0.25, false);
                curAction.play();
              } else {
                const actionprev =
                  this.animations_[context.lastplayedanimation];

                curAction.time = 0.0;
                curAction.enabled = true;
                curAction.setEffectiveTimeScale(1.0);
                curAction.setEffectiveWeight(1.0);
                curAction.crossFadeFrom(actionprev, 0.25, false);
                curAction.play();
              }
            }
          },

          StartTurningRight: (context, event) => {
            const ac1 = this.animations_[this.AnimationFSMService_.state.value];

            const ac2 =
              this.animations_[this.AnimationFSMService_._state.history.value];

            const curAction = this._mixer.clipAction(ac1);
            const prevAction = this._mixer.clipAction(ac2);

            curAction.time = 0.0;
            curAction.enabled = true;
            curAction.setEffectiveTimeScale(1.5);
            curAction.setEffectiveWeight(1.0);
            curAction.crossFadeFrom(prevAction, 0.65, true);
            curAction.play();
          },
          StartExecuting: (context, event) => {
            //console.log("start executing + " + context.targetanimation);

            const ac1 = this.animations_[context.targetanimation];

            const ac2 =
              this.animations_[this.AnimationFSMService_._state.history.value];

            const curAction = this._mixer.clipAction(ac1);
            const prevAction = this._mixer.clipAction(ac2);

            let playonece = context.playonce;
            let cb = context.cb;

            let loop = this.AnimationFSMService_.machine.config.context.loop;

            curAction.time = 0.0;
            curAction.enabled = true;
            curAction.setEffectiveTimeScale(1.0);
            curAction.setEffectiveWeight(1.0);
            curAction.crossFadeFrom(prevAction, 0.65, true);

            context.lastplayedanimation = context.targetanimation;
            //		console.log(context.lastplayedanimation);
            if (!playonece) {
              curAction.reset();
              curAction.clampWhenFinished = true;
              curAction.setLoop(THREE.LoopOnce, 1);
              curAction.play();
              setTimeout(() => {
                //  this.AnimationFSMService_.send("DONE");
              }, curAction.getClip().duration * 1000);
            } else {
              //animation stops after one loop
              curAction.reset();
              curAction.clampWhenFinished = true;
              curAction.play();
            }
          },
          StartEndExecuting: (context, event) => {
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

          StartTurningLeft: (context, event) => {
            const ac1 = this.animations_[this.AnimationFSMService_.state.value];

            const ac2 =
              this.animations_[this.AnimationFSMService_._state.history.value];

            const curAction = this._mixer.clipAction(ac1);
            const prevAction = this._mixer.clipAction(ac2);

            curAction.time = 0.0;
            curAction.enabled = true;
            curAction.setEffectiveTimeScale(1.0);
            curAction.setEffectiveWeight(1.0);
            curAction.crossFadeFrom(prevAction, 0.65, true);
            curAction.play();
          },
        },
        guards: {
          IsWalking: (context, event) => {
            return true;
          },

          canWalk: (context, event) => {
            return !this.isColliding_;
          },
        },
        delays: {
          BOREDOM_DELAY: (context, event) => {
            return 30000;
          },
          ANIMATION_DELAY: (context, event) => {
            const curAction = this.animations_[context.targetanimation];
            if (curAction !== undefined) {
              return curAction.getClip().duration * 1000;
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
  } 
  UpdateFSM(input: any) {
    if (!input._keys) {
      return;
    }

    if (
      input._keys.space &&
      this.AnimationFSMService_.state.value == "Ideling" &&
      this.canJump
    ) {
      this.AnimationFSMService_.send("JUMP");
      this.canJump = false;
      setTimeout(() => {
        this.body.velocity.y = 5;
      }, 750);
    }

    if (
      input._keys.space &&
      (this.AnimationFSMService_.state.value == "Walking" ||
        this.AnimationFSMService_.state.value == "SlowWalking") &&
      this.canJump
    ) {
      this.AnimationFSMService_.send("JUMP");
      this.canJump = false;
       setTimeout(() => {
        this.body.velocity.y += 5;
    
      }, 150);
    }

    if (
      input._keys.space &&
      this.AnimationFSMService_.state.value == "Running"
    ) {
      this.AnimationFSMService_.send("JUMP");
      this.canJump = false;
      setTimeout(() => {
        this.body.velocity.y += 25;
      }, 150);
    }

    if (input._keys.forward && this.isColliding_) {
      this.AnimationFSMService_.send("PUSH");
    }
    if (input._keys.left) {
      this.AnimationFSMService_.send("TURNLEFT");
    }
    if (input._keys.right) {
      this.AnimationFSMService_.send("TURNRIGHT");
    }
    if (
      !input._keys.left &&
      !input._keys.right &&
      (this.AnimationFSMService_.state.value == "TurningLeft" ||
        this.AnimationFSMService_.state.value == "TurningRight")
    ) {
      this.AnimationFSMService_.send("STOP");
    }

    if (
      input._keys.forward &&
      input._keys.shift &&
      this.AnimationFSMService_.state.value == "Walking"
    ) {
      this.AnimationFSMService_.send("RUN");
    }
    if (
      input._keys.forward &&
      input._keys.shift &&
      this.AnimationFSMService_.state.value == "Ideling"
    ) {
      this.AnimationFSMService_.send("SLOWWALK");
    }
    if (
      input._keys.forward &&
      (this.AnimationFSMService_.state.value == "Ideling" ||
        this.AnimationFSMService_.state.value == "SlowWalking" ||
        this.AnimationFSMService_.state.value == "Pushing" ||
        this.AnimationFSMService_.state.value == "Executing") &&
      !input._keys.shift
    ) {
      this.AnimationFSMService_.send("WALK");
    }
    if (
      input._keys.forward &&
      this.AnimationFSMService_.state.value == "Pushing" &&
      input._keys.shift
    ) {
      this.AnimationFSMService_.send("WALK");
    }

    if (
      input._keys.forward &&
      this.AnimationFSMService_.state.value == "Running" &&
      !input._keys.shift
    ) {
      this.AnimationFSMService_.send("WALK");
    }
    if (
      !input._keys.forward &&
      (this.AnimationFSMService_.state.value == "Walking" ||
        this.AnimationFSMService_.state.value == "Running" ||
        this.AnimationFSMService_.state.value == "SlowWalking" ||
        this.AnimationFSMService_.state.value == "Pushing")
    ) {
      this.AnimationFSMService_.send("STOP");
    }
    if (input._keys.backward) {
      this.AnimationFSMService_.send("BACKWARDWALK");
    }
    if (
      !input._keys.backward &&
      this.AnimationFSMService_.state.value == "BackwardWalking"
    ) {
      this.AnimationFSMService_.send("STOP");
    }
    if (
      input._keys.forward &&
      this.AnimationFSMService_.state.value == "Executing"
    ) {
      this.AnimationFSMService_.send("STOP");
    }
  }


  walktopos(locationposition : THREE.Vector3) {

    // if (!this.Input) {
    //   console.log("Input not initialized");
    //   return;
    // }
      if (this.taskintervals){ 

        for (let i = 0; i < this.taskintervals.length; i++) {
          clearInterval(this.taskintervals[i]);
        }
      }
 
   let interval= setInterval(() => {
      //console.log(	this.Input._keys)
      //clear existing intervals
  
     
      

      const controlObject = new THREE.Object3D();
				controlObject.position.copy(this._entity.Position );
				controlObject.quaternion.copy( this._entity.Quaternion);
				controlObject.lookAt( locationposition);
				const distance = controlObject.position.distanceTo( locationposition);
                //rotation 
                const targetDirection = new THREE.Vector3()
                .subVectors(
                  locationposition,
                  this._entity.Position
                )
                .normalize();
              const currentDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(
                this._entity.Quaternion
              );
              const crossProduct = new THREE.Vector3().crossVectors(
                currentDirection,
                targetDirection
              );
              const deadZone = 0.05; // Change this value according to required dead zone size.
        
               
        //  console.log(distance);
 				if (distance > 2) {
          console.log("walking");
					try {
						if (
							this.AnimationFSMService_.state.value ==
								"Walking" ||
							this.AnimationFSMService_.state.value == "Running"
						) {
							//shift
              if (distance >8) {
                this.Input._keys.shift = true;
              }
						} else {
							this.Input._keys.shift =false;
						}
					} catch (error) {
						console.log(error);
					}

  
          if (crossProduct.y < -deadZone) {
            // Needs to turn right
            this.Input._keys.right = true;
            this.Input._keys.left = false;
          } else if (crossProduct.y > deadZone) {
            // Needs to turn left
            this.Input._keys.right = false;
            this.Input._keys.left = true;
          } else {
            // Within the dead zone, maintain current direction
            //we might be facing the wrong direction , so we need to check the deviation of the target position from the current position and press either left or right
            const deviation = controlObject.quaternion.angleTo(
              this._entity.Quaternion
            );
            if (Math.abs(deviation) > 1) {
              this.Input._keys.left = true;
              this.Input._keys.right = false;
            } else {
              this.Input._keys.left = false;
              this.Input._keys.right = false;
            }
         
            this.Input._keys.forward = true;
          
          const targetDirection = new THREE.Vector3()
            .subVectors(
              locationposition,
              controlObject.position 
            )
            .normalize();
          const currentDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(
            this._entity.Quaternion
          );
          const crossProduct = new THREE.Vector3().crossVectors(
            currentDirection,
            targetDirection
          );
          const deadZone = 0.05; // Change this value according to required dead zone size.
  
          try {
            if (crossProduct.y < -deadZone) {
              // Needs to turn right
              this.Input._keys.right = true;
              this.Input._keys.left = false;
            } else if (crossProduct.y > deadZone) {
              // Needs to turn left
              this.Input._keys.right = false;
              this.Input._keys.left = true;
            } else {
              // Within the dead zone, maintain current direction
              //we might be facing the wrong direction , so we need to check the deviation of the target position from the current position and press either left or right
              const deviation = controlObject.quaternion.angleTo(
                this._entity.Quaternion
              );
              if (Math.abs(deviation) > 1) {
                this.Input._keys.left = true;
                this.Input._keys.right = false;
              } else {
                this.Input._keys.left = false;
                this.Input._keys.right = false;
              }
            }
            this.Input._keys.forward = true;
          } catch (error) {
            console.log(error);
          }}
				} else {
					try {
            this.Input._keys.shift =false;
            this.Input._keys.forward = false;
            this.Input._keys.left = false;
            this.Input._keys.right = false;
            clearInterval(interval);
            return;
					} catch (error) {
						//console.log(error);
					}
				}

   
      
      } , 50);

      this.taskintervals.push(interval);


					 
			 
    // this.BehaviourFSM_ = createMachine(
    //   {
    //     context: {
    //       actcb: () => {},
    //     },
    //     id: "behaviour",
    //     initial: "Ideling",
    //     states: {
    //       Ideling: {
    //         on: {
    //           ACT: {
    //             target: "Acting",
    //           },
    //         },
    //       },
    //       Acting: {
    //         entry: "StartActing",

    //         on: {
    //           DONE: {
    //             target: "Ideling",
    //           },
    //           STOP: {
    //             target: "Ideling",
    //           },
    //           AGAIN: {
    //             target: "Acting",
    //           },
    //         },
    //       },
    //     },
    //   },
    //   {
    //     actions: {
    //       StartActing: (context, event) => {
    //          let res = context.actcb() as  any;
             
    //           if(res?.done){
    //             this.BehaviourFSM_Service_.send("DONE");
    //           }
    //           else{
    //             //this.BehaviourFSM_Service_.send("AGAIN");
    //           }
            
    //       },
    //     },
    //   }
    // );

    // this.BehaviourFSM_Service_ = interpret(this.BehaviourFSM_).start();
    // this.BehaviourFSM_Service_.onTransition((state) => {
    //   console.log(`state: ${state.value}`);
    // });
    // this.BehaviourFSM_Service_.send("ACT");

    
    

  }
  showui() {
       //create a ui card and add it to the css2dgroup
       // 
       if (this.htmlcontainer == null) {
       this.htmlcontainer = document.createElement("div");
       let html = /*html*/ `<div class="uk-card uk
        -card-default uk-card-body"> <h3 class="uk-card-title">Title</h3> <p>Content</p> </div>`;
        let div = document.createElement("div");
        div.innerHTML = html;
        div.style.transition = "opacity 0.5s";
        const label = new CSS2DObject(div);

        label.position.set(0, 2, 0);
        this._css2dgroup.add(label);
       }
       else{
         this.htmlcontainer.style.opacity = "1";
         this.htmlcontainer.style.display = "block";
         
       }


   }

   hideui() {
    if (this.htmlcontainer) {
      this.htmlcontainer.style.opacity = "0";
      this.htmlcontainer.style.display = "none";
    }
  }

  async InitEntity(): Promise<void> {

  //   <div class="uk-width-expand">
  //   <h4 class="uk-comment-title uk-margin-remove"><a class="uk-link-reset" href="#">Hamza Ben Hassen</a></h4>
  //   <ul class="uk-comment-meta uk-subnav uk-subnav-divider uk-margin-remove-top">
  //     <li><a href="#">Electrical Engineer</a></li>

  //   </ul>

  //   <button class="uk-button" id="contactbutton">Contact </button>
  // </div>
    console.log("InitEntity CharacterComponent");
    
    const nameTag = document.createElement('div');
    nameTag.className = 'name-tag';
 
    const namet = document.createElement('div');
    namet.className = 'name';
    namet.style.fontSize = '16px';
    namet.style.fontWeight = 'bold';
    namet.style.color = '#333';
    namet.textContent =  this._entity.name;
    namet.id = "name";
    //clickable on hover 
    namet.style.cursor = "pointer";

    
    const status = document.createElement('div');
    status.className = 'status';
    status.style.fontSize = '12px';
    status.style.fontWeight = 'regular';
    status.style.color = '#666';
    status.style.marginTop = '-2px';
    status.textContent = 'Online';
    
    nameTag.appendChild(namet);
    nameTag.appendChild(status);

    //when name is clicked , toggle the visibility of the ui card
   
    this._titlebar = document.createElement("div");
    this._titlebar.appendChild( nameTag);
    this._titlebar.style.transition = "opacity 0.5s";
    const label = new CSS2DObject(this._titlebar);
    label.position.set(0, 2, 0);
    this._css2dgroup.add(label);

    this._entity._entityManager._mc.webgpuscene.add(this._webgpugroup);
    this._entity._entityManager._mc.annoationsScene.add(this._css2dgroup);
    this._entity._entityManager._mc.physicsmanager.world.addBody(this.body);

    let name = this._titlebar.querySelector("#name");
    if ( name){
     name.addEventListener("click", () => {
      console.log("clicked");
      if  (! this.htmlcontainer  || this.htmlcontainer.style.display == "none") {
        this.showui();
      }
      else {
      this.hideui();
      }
    });
    this._entity._RegisterHandler("zoom", async () => {
      await this.zoom();
    });
    this._entity._RegisterHandler("panaround", async () => {
      await this.panaround();
    });
  }
     //register handler for     this._entity.Broadcast({ topic: "inputinitialized", data: {input : this} });
     this._entity._RegisterHandler(
      "walk",
      (data: { position: any }) => {
          this.walktopos(data.position);
          
      }
    );

    //register handler for     this._entity.Broadcast({ topic: "inputinitialized", data: {input : this} });
    this._entity._RegisterHandler(
      "inputinitialized",
      (data: { input: any }) => {
        this.Input = data.input;
        if ( this.Input) { 
          console.log("input initialized");
        }
      }
    );

    this._entity._RegisterHandler("inputdestroyed", (data: any) => {
      this.Input = null;
      console.log("input destroyed");
    });

    this._entity._RegisterHandler("position", (data: any) => {
      let p = data as THREE.Vector3;

      this._webgpugroup?.position.set(p.x, p.y, p.z);

      this._css2dgroup?.position.set(p.x, p.y, p.z);

      this._css3dgroup?.position.set(p.x, p.y, p.z);
    });

    this._entity._RegisterHandler("quaternion", (data: any) => {
      let q = data as THREE.Quaternion;

      this._css3dgroup?.quaternion.set(q.x, q.y, q.z, q.w);
      this._webgpugroup?.quaternion.set(q.x, q.y, q.z, q.w);

      this._css2dgroup?.quaternion.set(q.x, q.y, q.z, q.w);
    });
  }

  async zoom(radius = 5) {
    let p = this._entity.position.clone(); // Make sure to clone so you don't accidentally modify the original position
    let quat = this._entity.quaternion.clone();
    quat.x += -0.9 + Math.random() * 0.6;
    quat.y += -2.9 + Math.random() * 9.6;
    quat.z += -0.9 + Math.random() * 3.6;

    this._entity._entityManager._mc.zoomTo(p, radius, quat);
  }

  async panaround() {
    this._entity._entityManager._mc.panAround();
  }

  async Update(deltaTime: number): Promise<void> {

    //update state name in the title bar
    this._titlebar.querySelector(".status").textContent = this.state;
    
    this._mixer.update(deltaTime);

    const controlObject = this._webgpugroup;
    const velocity = this.velocity_;
    const frameDecceleration = new THREE.Vector3(
      velocity.x * this.decceleration_.x,
      velocity.y * this.decceleration_.y,
      velocity.z * this.decceleration_.z
    );
    frameDecceleration.multiplyScalar(deltaTime);
    frameDecceleration.z =
      Math.sign(frameDecceleration.z) *
      Math.min(Math.abs(frameDecceleration.z), Math.abs(velocity.z));

    velocity.add(frameDecceleration);

    const _Q = new THREE.Quaternion();
    const _A = new THREE.Vector3();
    const _R = controlObject.quaternion.clone();

    const acc = this.acceleration_.clone();
    this.body.quaternion.set(
      this._webgpugroup.quaternion.x,
      this._webgpugroup.quaternion.y,
      this._webgpugroup.quaternion.z,
      this._webgpugroup.quaternion.w
    );
    acc.multiplyScalar(
      this.getAcceleration(this.AnimationFSMService_.state.value)
    );
    if (this.Input ) {
      this.UpdateFSM(this.Input);

      if (this.Input._keys.left) {
        _A.set(0, 1, 0);
        _Q.setFromAxisAngle(
          _A,
          4.0 * Math.PI * deltaTime * this.acceleration_.y
        );
        _R.multiply(_Q);
        //this.body.quaternion.set(_R.x, _R.y, _R.z, _R.w);
      }

      if (this.Input._keys.right) {
        _A.set(0, 1, 0);
        _Q.setFromAxisAngle(
          _A,
          4.0 * -Math.PI * deltaTime * this.acceleration_.y
        );
        _R.multiply(_Q);
        //   this.body.quaternion.set(_R.x, _R.y, _R.z, _R.w);
      }

      if (this.Input._keys.forward) {
        velocity.z += acc.z * deltaTime;
      }

      if (this.Input._keys.backward) {
        velocity.z -= acc.z * deltaTime;
      }
      if (this.state != "Executing"    && this.state != "EndExecuting" )
      controlObject.quaternion.copy(_R);

      const oldPosition = new THREE.Vector3();
      oldPosition.copy(controlObject.position);

      const forward = new THREE.Vector3(0, 0, 1);
      forward.applyQuaternion(controlObject.quaternion);
      forward.normalize();

      const forwardDir = forward.clone().multiplyScalar(Math.sign(velocity.z));

      const sideways = new THREE.Vector3(1, 0, 0);
      sideways.applyQuaternion(controlObject.quaternion);
      sideways.normalize();

      sideways.multiplyScalar(velocity.x * deltaTime);
      forward.multiplyScalar(velocity.z * deltaTime);

      this.body.velocity.x = ((forwardDir.x * acc.z) / this.body.mass) * 10;
      this.body.velocity.z = ((forwardDir.z * acc.z) / this.body.mass) * 10;

      const contactNormal = new CANNON.Vec3();
      const upAxis = new CANNON.Vec3(0, 1, 0);
      const frontAxis = new CANNON.Vec3(0, 0, 1);

      this.body.addEventListener("collide", (e) => {
        const contact = e.contact;
        if (contact.bi.id == this.body.id) {
          contact.ni.negate(contactNormal);
        } else {
          contactNormal.copy(contact.ni);
        }

        if (contactNormal.dot(upAxis) > 0.7) {
          if (!this.canJump) {
            //	console.log("can jump");
          }

          this.canJump = true;
        }
        // if (contactNormal.dot(frontAxis) > 0.5) {
        // 	console.log(contact);

        // 	this.isColliding_ = true;

        // 	//move the player back a bit in the negative forward direction
        // 	//controlObject.position.addScaledVector(forward, -3);
        // 	// forward.multiplyScalar(-3);
        // 		//this.body.position.z -= 0.1;
        // 	//console.log("colliding with a wall");
        // }
        // else{
        // 	this.isColliding_ = false;

        // }

        //check if colliding with a wall
      });

      if (this.body.velocity.y > 0.1 && this.canJump == true) {
        //	this.body.velocity.y = 0;
      }

      if (!this.canJump && this.AnimationFSMService_.state.value != "Falling") {
        this.AnimationFSMService_.send("FALL");
        //console.log("falling");
      } else if (
        this.canJump &&
        this.AnimationFSMService_.state.value == "Falling"
      ) {
        this.AnimationFSMService_.send("LAND");
        //	console.log(" landed");
      }

      const pos = controlObject.position.clone();

      pos.add(forward);
      pos.add(sideways);

      if (
        this.isColliding_ &&
        this.AnimationFSMService_.state.value != "Pushing" &&
        this.AnimationFSMService_.state.value != "Executing" &&
        this.AnimationFSMService_.state.value != "Kicking"
      ) {
        this.AnimationFSMService_.send("PUSH");
      }

      controlObject.position.set(
        this.body.position.x,
        this.body.position.y,
        this.body.position.z
      );

      this._entity.Position = controlObject.position;

      this._entity.Quaternion = controlObject.quaternion;
    } 

     

    //calculate the distance between the entity and the camera
    const distance = this._entity.Position.distanceTo(
      this._entity._entityManager._mc.camera.position
    );
    //hide the opacity of this._titlebar if the distance is greater than 10

    if (distance > 10) {
      this._titlebar.style.opacity = "0";
      this._titlebar.style.pointerEvents = "none";
    } else {
      this._titlebar.style.opacity = "1";
      this._titlebar.style.pointerEvents = "auto";
    }
  }

  async Destroy() {
    for (let i = this._webgpugroup.children.length - 1; i >= 0; i--) {
      //find all instances of css2dobject and remove them
      if (this._webgpugroup.children[i] instanceof CSS2DObject) {
        this._webgpugroup.remove(this._webgpugroup.children[i]);
      }
    }

    this._entity._entityManager._mc.webgpuscene.remove(this._webgpugroup);
    for (let i = this._css2dgroup.children.length - 1; i >= 0; i--) {
      //find all instances of css2dobject and remove them
      if (this._css2dgroup.children[i] instanceof CSS2DObject) {
        this._css2dgroup.remove(this._css2dgroup.children[i]);
      }
    }

    for (let i = this._css3dgroup.children.length - 1; i >= 0; i--) {
      //find all instances of css2dobject and remove them
      if (this._css3dgroup.children[i] instanceof CSS2DObject) {
        this._css3dgroup.remove(this._css3dgroup.children[i]);
      }
    }
    this._entity._entityManager._mc.annoationsScene.remove(this._css2dgroup);
  }

  getAcceleration(state: string) {
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
        return 0 ;
        setTimeout(() => {
          return 0;
        }, 75);
        return 5;
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

  // async Walk(point : THREE.Vector3 , chain = true) {
	// 	//check if parent has an input component
       
 
	// 	const walkTask2: ITask = {
	// 		name: "Walk Task",
	// 		topic: "Walking",
	// 		updateFrequency: 5, // Update every 100 milliseconds

	// 		completionCriterion: function () {
	// 			const controlObject = new THREE.Object3D();
	// 			controlObject.position.copy(this._entity.position);
	// 			controlObject.quaternion.copy( this._entity.quaternion);
	// 			controlObject.lookAt( point);
	// 			const distance = controlObject.position.distanceTo(
	// 				this.context.location
	// 			);
		 
	// 			if (distance < 1) {
 
	// 				return true;
	// 			}
	// 		}, // Complete when the current number is 17
	// 		stopCondition: function () {
	// 			return false;
	// 		}, // Never stop unless completed
	// 		update: function () {
	// 			//red
	// 			const mat = new THREE.MeshStandardMaterial({
	// 				color: 0xff0000,
	// 				side: THREE.DoubleSide,
	// 			});

	// 			const controlObject = new THREE.Object3D();
	// 			controlObject.position.copy(this.context.parent.group_.position);
	// 			controlObject.quaternion.copy(this.context.parent.group_.quaternion);
	// 			controlObject.lookAt(this.context.location);
 
	// 			const targetDirection = new THREE.Vector3()
	// 				.subVectors(
	// 					this.context.location,
	// 					this.context.parent.group_.position
	// 				)
	// 				.normalize();
	// 			const currentDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(
	// 				this.context.parent.group_.quaternion
	// 			);
	// 			const crossProduct = new THREE.Vector3().crossVectors(
	// 				currentDirection,
	// 				targetDirection
	// 			);
	// 			const deadZone = 0.05; // Change this value according to required dead zone size.
  //       this.Input._keys.right = true;
	// 			// try {
	// 			// 	if (crossProduct.y < -deadZone) {
	// 			// 		// Needs to turn right
	// 			// 		input._keys.right = true;
	// 			// 		input._keys.left = false;
	// 			// 	} else if (crossProduct.y > deadZone) {
	// 			// 		// Needs to turn left
	// 			// 		input._keys.right = false;
	// 			// 		input._keys.left = true;
	// 			// 	} else {
	// 			// 		// Within the dead zone, maintain current direction
	// 			// 		//we might be facing the wrong direction , so we need to check the deviation of the target position from the current position and press either left or right
	// 			// 		const deviation = controlObject.quaternion.angleTo(
	// 			// 			this.context.parent.group_.quaternion
	// 			// 		);
	// 			// 		if (Math.abs(deviation) > 1) {
	// 			// 			input._keys.left = true;
	// 			// 			input._keys.right = false;
	// 			// 		} else {
	// 			// 			input._keys.left = false;
	// 			// 			input._keys.right = false;
	// 			// 		}
	// 			// 	}
	// 			// 	input._keys.forward = true;
	// 			// } catch (error) {
	// 			// 	console.log(error);
	// 			// }
		 
	// 		},
	// 		stop: function () {
	// 			try {
	// 				this.context.parent.input._keys.forward = false;
	// 				this.context.parent.input._keys.left = false;
	// 				this.context.parent.input._keys.right = false;
	// 			} catch (error) {}

	// 			if (removelater) {
	// 				this.context.parent.Parent.RemoveComponent("CharacterInput");
	// 			}

	// 			this.context.parent.AnimationFSMService_.send("STOP");

	// 			console.log(`The random task is done.`);
	// 			//remove the waypoint
	// 			this.context.parent.params_.scene.remove(this.context.waypoint);
	// 			//remove bezier and text
	// 			this.context.parent.params_.scene.remove(this.context.bezier);
	// 			this.context.parent.params_.scene.remove(this.context.myText);
	// 		},
	// 		lastUpdate: 0, // The last time the task was updated
	// 		context: {
	// 			location: point, // A property to store the target point to walk to
	// 			parent: this,
	// 			waypoint: waypoint,
	// 			bezier: this.bezier,
	// 			myText: myText,
	// 			callback: this.tm.Queue,
	// 		},
	// 	};
	// 	if (chain) this.tm.Clear();
	// 	this.tm.enqueueTask(walkTask2);
	// }

  async walkTo(point: THREE.Vector3) {
    //add component to entity

  }

}

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
  keyMap: { [key: string]: string };
  HandleKeyDown: (event: KeyboardEvent) => void;
  HandleKeyUp: (event: KeyboardEvent) => void;

  constructor(params?: { input: any }) {
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
    console.log(language + " " + platform + " " + navigator.userAgent);
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
    console.log(key + "from " + this._entity + " " + this._entity._name);
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
 
  constructor( ) {
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

 

export { KeyboardInput, CharacterComponent , AIInput};
