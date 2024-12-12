import { Component } from "../Component";
import * as THREE from "three";
import { Entity } from "../Entity";
import { LoadingManager } from "../LoadingManager";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { createMachine, interpret, t } from "xstate";
import * as CANNON from "cannon-es";
import { StaticCLI } from "../../SimpleCLI";
 
import { MeshPhongNodeMaterial,PointsNodeMaterial ,  uniform, skinning , MeshPhysicalNodeMaterial, MeshBasicNodeMaterial ,MeshStandardNodeMaterial , LineBasicNodeMaterial, vec2, distance, NodeMaterial, smoothstep, Break, materialReference, float, sub, VolumeNodeMaterial, vec3, tslFn, all   } from 'three/tsl';
import {   reflector, uv, texture, color , mix } from 'three/tsl';
 
import { CodeEditor } from "./CodeEditor";
 
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import SimpleBar from "simplebar";
let CE = new CodeEditor();
let uva= uv( 0 );
let vec2a= vec2( 0.0, 0.0 );
let dist = distance(  vec2a, vec2a );
let nm = new NodeMaterial();
 const st=  smoothstep( 0.0, 1.0, 0.5 );
 const breaknode = Break( 0.5 );
const perlin = new ImprovedNoise();
const range = materialReference('range', 'float');
let a = float( 1.0 );
let b = sub( a, 0.5 );
 const material = new VolumeNodeMaterial({
  side: THREE.BackSide,
  transparent: true
});
tslFn( material, 'color', vec3( 1.0, 0.0, 0.0 ) );

let mat= new MeshBasicNodeMaterial( { color: "rgb(200, 200, 200)" } )
 class CharacterComponent extends Component {
    _model: THREE.Object3D;
  private _modelpath: string;

  private _animationspathslist: { url: string; shiftTracks: boolean }[];
  private _animation: THREE.AnimationClip;
  private _mixer: THREE.AnimationMixer;
  private _webgpugroup: THREE.Group;
  private _css2dgroup: THREE.Group;
  private _css3dgroup: THREE.Group;
  private _titlebar: HTMLElement;

  animations_: { string: THREE.AnimationClip };
  body: CANNON.Body;
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
  htmldialogueelement: HTMLDivElement;
  state: string;
  task: string;
  worker: Worker;
  uiElement: any;
  currentStep: number;
  websocket: WebSocket;
   workspace : DynamicsCompressorNode
  document : { htmltext : string}
   workerloop = null;
  behaviourscriptname: string;
  activationCircle: THREE.Line<THREE.CircleGeometry, THREE.LineBasicMaterial, THREE.Object3DEventMap>;
   arrows: [] = [];
   hostname: string;
   isDriving: any;
   vehicle: any;
   carcomponent: any;
  

  constructor({ modelpath, animationspathslist, behaviourscriptname = "" }) {
    super();
    let mat =       new MeshPhongNodeMaterial( { color: "rgb(200, 200, 200)", shininess: 150 } )
    console.log("mat", mat)
    const mirrorReflector = reflector();
    const fogColor = color(0xcccccc);  // Light grey fog
    const foggyReflection = mix(mirrorReflector, fogColor, 150);

    this._modelpath = modelpath;
    this.task = "N";
    this._animationspathslist = animationspathslist;
    this.canJump = true;
    this.isColliding_ = false;
    this.document = { htmltext : ""};
    this.behaviourscriptname = behaviourscriptname;
    this.hostname = window.location.hostname;
    this._webgpugroup = new THREE.Group();
    this._css2dgroup = new THREE.Group();
    // if (behaviourscriptname !== "")
    //   this.LoadWorker(behaviourscriptname);
  }
  fetch(url: string) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url);
      xhr.onload = () => resolve(xhr.responseText);
      xhr.onerror = () => reject(xhr.statusText);
      xhr.send();
    });
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
    // //console.log(this.animations_);
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
          //cast and receive shadows
           child.castShadow = true;
        child.receiveShadow = true;
        //  //get current color of the mesh
        //  let color = child.material.color;
        //   let material2 = new MeshPhysicalNodeMaterial( { color: color, roughness: 0.02, clearcoat:0.1, clearcoatRoughness: 0.09 , metalness: 0.89 , flatShading: true ,side : THREE.FrontSide ,   reflectivity : 0.1 , transmission : 0.0095 , opacity: 1, transparent: false , sheen: 50  , depthWrite: true, depthTest: true,  } );
        //  child.material =   Math.random() > 0.99 ? material : material2;
       
          //hide the mesh
         //  child.visible = false;
        //  const materialPoints = new PointsNodeMaterial({ size: 0.05, color: new THREE.Color(0x0011ff) });
      //    child.updateMatrixWorld(true); // Force update matrix and children
        //  // create a skinning node
        //      const animatedskinning =  skinning( child ) ;
        //     materialPoints.positionNode = animatedskinning;
        //   child.geometry.computeBoundsTree();
        //   let boundsViz = new MeshBVHHelper( child );
          //this._group.attach(materialPoints);

          //set scale and rotation of the points

          //adjust scale and rotation of the points
        //  materialPoints.positionNode = uniform( child.scale );

        //    materialPoints.positionNode = skinningReference( child );
        //    //materialPoints.positionNode = uniform( child.position );

        //      child.updateMatrixWorld(true); // Force update matrix and children
        //  this._pointCloud = new THREE.Points(child.geometry, materialPoints);

         //  this._webgpugroup.add(this._pointCloud);
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

    this.setupCollisionDetection()

    // this.walktopos( new THREE.Vector3( Math.random() * 150, 0, Math.random() * 190));
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
            // 		// 	//console.log("BOREDOM_DELAY");
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
                  //	//console.log("BOREDOM_DELAY");
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
            // // //console.log(this.animations_);
            // //console.log(this.AnimationFSMService_.state.value);
            // //console.log(this.AnimationFSMService_._state.history.value);
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
            //console.log("backward walking");
            //console.log(this.animations_);
            //console.log(this.AnimationFSMService_.state.value);
            //console.log(this.AnimationFSMService_._state.history.value);
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
                curAction.crossFadeFrom(prevAction, 0.35, false);
                curAction.play();
              } else {
                const actionprev =
                  this.animations_[context.lastplayedanimation];

                curAction.time = 0.0;
                curAction.enabled = true;
                curAction.setEffectiveTimeScale(1.0);
                curAction.setEffectiveWeight(1.0);
                curAction.crossFadeFrom(actionprev, 0.35, false);
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
            ////console.log("start executing + " + context.targetanimation);

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
            //		//console.log(context.lastplayedanimation);
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


          StartPushing: (context, event) => {

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
          }
          ,

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

          StartMounting: (context, event) => {
            this._entity._entityManager._mc.physicsmanager.world.removeBody(this.body);
            this.isDriving = true;


            // Get the door and its position
            let door = this.vehicle.carChassis.getObjectByName("DriverDoor");
            let doorPosition = new THREE.Vector3();
            door.updateMatrixWorld(true); // Ensure world matrix is updated
            door.getWorldPosition(doorPosition);

            // Set the position of the character to the door
            this._entity.Position = new THREE.Vector3(
              doorPosition.x,
              doorPosition.y  ,
              doorPosition.z
            );

            this.body.position.copy(
              new CANNON.Vec3(
                doorPosition.x,
                doorPosition.y + 20,
                doorPosition.z
              )
            );
  
       
        
        
            // Animation handling
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
        
            // Set up timers for door and state management
            setTimeout(() => {
                this.AnimationFSMService_.send("MOUNTED");
            }, curAction.getClip().duration * 1000);
        
            setTimeout(() => {
                this.vehicle.closeDoor();
            }, curAction.getClip().duration * 1000 - 800);
        
            setTimeout(() => {
                this.vehicle.openDoor();
            }, 400);
        } ,
          StartDriving: (context, event) => {

            let ac1 = this.animations_[this.AnimationFSMService_.state.value];
            let ac2 = this.animations_[this.AnimationFSMService_._state.history.value];
             
            const curAction = this._mixer.clipAction(ac1);
            const prevAction = this._mixer.clipAction(ac2);

            curAction.time = 0.0;
            curAction.enabled = true;
            curAction.clampWhenFinished = true;
            //playonce :
            curAction.setEffectiveTimeScale(1.0);
            curAction.setEffectiveWeight(1.0);
            curAction.crossFadeFrom(prevAction, 0.25, true);
            curAction.play();
          },
          StartUnmounting: (context, event) => {
            //stop the driving animation
            //	let idleAction = this.animations_["DrivingIdle"];
            //idleAction.stop();
            const ac1 =
              this.animations_[this.AnimationFSMService_.state.value];

            const ac2 =
              this.animations_[
                this.AnimationFSMService_._state.history.value
              ];

            const curAction = this._mixer.clipAction(ac1);
            const prevAction = this._mixer.clipAction(ac2);

            curAction.reset();
            curAction.setLoop(THREE.LoopOnce, 1);
            curAction.clampWhenFinished = true;
            curAction.time = 0.0;
            curAction.enabled = true;
            // curAction.setEffectiveTimeScale(1.0);
            curAction.setEffectiveWeight(1.0);
            curAction.crossFadeFrom(prevAction, 0.25, true);

            curAction.play();

            setTimeout(() => {
              //  get the current position of tthis.bones_["mixamorigLeftToe_End"]
              //  and set the position of the body to it

              //  get the current position of tthis.bones_["mixamorigLeftToe_End"]

              //get
              //	 this.spineCollider.updateMatrixWorld();

              const door =
                this.vehicle.carChassis.getObjectByName("DriverDoor");
              if (door) {
                //get the position of the door

                const doorQuaternion = door.getWorldQuaternion(
                  new THREE.Quaternion()
                );
                doorQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), doorQuaternion.y - Math.PI / 2);
                let doorPosition = new THREE.Vector3();
                door.updateMatrixWorld(true);
                door.getWorldPosition(doorPosition);

                doorPosition.add(
                  new THREE.Vector3(2, 0, 0).applyQuaternion(doorQuaternion)
                );

               
                this._entity.Position = new THREE.Vector3(
                  doorPosition.x  ,
                  doorPosition.y,
                  doorPosition.z
                );
                this.body.position.copy(
                  new CANNON.Vec3(
                    doorPosition.x,
                    doorPosition.y,
                    doorPosition.z
                  )
                );
                this._webgpugroup.position.copy(
                  new THREE.Vector3(
                    doorPosition.x,
                    doorPosition.y,
                    doorPosition.z
                  )
                );
                this._entity._entityManager._mc.physicsmanager.world.addBody(this.body);
                this.isDriving = false;
              }
            

              this.AnimationFSMService_.send("UNMOUNTED");
            }, curAction.getClip().duration * 1000);

            setTimeout(() => {
              this.vehicle.closeDoor();
            }, curAction.getClip().duration * 1000 - 1700);

            setTimeout(() => {
              this.vehicle.openDoor();
            }, 900);
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
      !input._keys.shift && !this.isColliding_
    ) {
      this.AnimationFSMService_.send("WALK");
    }
    else if (
      input._keys.forward &&
      this.AnimationFSMService_.state.value !== "Pushing" &&
      this.isColliding_
    ) {
      this.AnimationFSMService_.send("STOP");
    }
    
     
    if (
      input._keys.forward &&
      this.AnimationFSMService_.state.value == "Pushing" &&
      input._keys.shift
    ) {
      this.AnimationFSMService_.send("WALK");
    }

    if (!input._keys.forward && this.AnimationFSMService_.state.value == "Pushing") {
      this.AnimationFSMService_.send("STAND");
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
  


  StepToPosition(locationposition: THREE.Vector3) {
    //steps to position, if position is reached returns true

    const controlObject = new THREE.Object3D();
    controlObject.position.copy(this._entity.Position);
    controlObject.quaternion.copy(this._entity.Quaternion);
    controlObject.lookAt(locationposition);
    const distance = controlObject.position.distanceTo(locationposition);
    //rotation
    const targetDirection = new THREE.Vector3()
      .subVectors(locationposition, this._entity.Position)
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
    if (distance > 1) {
      //     console.log("walking");
      try {
        if (this.state == "Walking" || this.state == "Running") {
          //shift
          if (distance > 8) {
            this.Input._keys.shift = true;
          } else {
            this.Input._keys.shift = false;
          }
        } else {
          this.Input._keys.forward = true;
        }
      } catch (error) {
        console.log(error);
        return false;
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
          .subVectors(locationposition, controlObject.position)
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
            return false;
          }
        } catch (error) {
          console.log(error);
        }
      }

      return false;
    } else {
      try {
        this.Input._keys.shift = false;
        this.Input._keys.forward = false;
        this.Input._keys.left = false;
        this.Input._keys.right = false;
        //remove the interval from the array

        return true;
      } catch (error) {
        console.log(error);
        return false;
      }
    }
    //console.log(distance);
  }

  
  loadscript(script: string) {
    this.worker?.terminate();
    let blob = new Blob([script], { type: "application/javascript" });
    let url = URL.createObjectURL(blob);
    this.worker = new Worker(url);
    this.worker.onmessage = (e) => {
      //	//console.log("Message received from worker", e.data);

 
  

      if (e.data.type === "input") {
        this.Input = { _keys: e.data.input };
        this.UpdateFSM(this.Input);
      }
      if (e.data.type === "jssetup") {
        try {
          let res = eval(e.data.js).bind(this)();
          console.log(res);
          this.worker.postMessage({
            type: "feedback",
            data: res,
          });
        } catch (error) {
          console.error(error);
        }
      }

 
    };
 

  

  }



  LoadWorker(scriptname: string) {
    //send stop command to worker if it is running
    if (this.worker) {
      this.worker.postMessage({
        type: "stop",
      });
    }

    this.worker = new Worker("./workers/dynamicloader.js?" + Date.now());

    this.worker.onmessage = (e) => {
      //	//console.log("Message received from worker", e.data);

      if (e.data.type === "setupdialogue") {
        console.log("setupdialogue");
        try {
          eval(e.data.js).bind(this)();
        }
        catch(error){
          console.error(error);
        }      

      
      }
      if (e.data.type === "boot") {
        this.worker.postMessage({
          type: "init",
          filename: scriptname ? scriptname : "botbasicbehavior.js",
          watch: true,
        });
      }

      if (e.data.type === "input") {
        this.Input = { _keys: e.data.input };
        this.UpdateFSM(this.Input);
      }

      //jssetup

      if (e.data.type === "jssetup") {
        try {
          let res = eval(e.data.js).bind(this)();
          console.log(res);
          this.worker.postMessage({
            type: "feedback",
            data: res,
          });
        } catch (error) {
          console.error(error);
        }
      }
    };
  }


 
  StopScript() {
    if (this.worker) {
      this.worker.postMessage({
        type: "stop",
      });
    }
    this.workerloop= null
  }
 
  // walktopos(locationposition: THREE.Vector3) {
  //   if (this.taskintervals) {
  //     for (let i = 0; i < this.taskintervals.length; i++) {
  //       clearInterval(this.taskintervals[i]);
  //     }
  //   }

  //   let interval = setInterval(() => {

  //      const controlObject = new THREE.Object3D();
  //     controlObject.position.copy(this._entity.Position);
  //     controlObject.quaternion.copy(this._entity.Quaternion);
  //     controlObject.lookAt(locationposition);
  //     const distance = controlObject.position.distanceTo(locationposition);
  //     //rotation
  //     const targetDirection = new THREE.Vector3()
  //       .subVectors(locationposition, this._entity.Position)
  //       .normalize();
  //     const currentDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(
  //       this._entity.Quaternion
  //     );
  //     const crossProduct = new THREE.Vector3().crossVectors(
  //       currentDirection,
  //       targetDirection
  //     );
  //     const deadZone = 0.05; // Change this value according to required dead zone size.
  //     console.log(distance)
  //     //  //console.log(distance);
  //     if (distance > 1.7) {
  //       //console.log("walking");
  //       try {
  //         if (
  //           this.AnimationFSMService_.state.value == "Walking" ||
  //           this.AnimationFSMService_.state.value == "Running"
  //         ) {
  //           //shift
  //           if (distance > 8) {
  //             this.Input._keys.shift = true;
  //           }
  //         } else {
  //           this.Input._keys.shift = false;
  //         }
  //       } catch (error) {
  //         console.log(error);
  //       }

  //       if (crossProduct.y < -deadZone) {
  //         // Needs to turn right
  //         this.Input._keys.right = true;
  //         this.Input._keys.left = false;
  //       } else if (crossProduct.y > deadZone) {
  //         // Needs to turn left
  //         this.Input._keys.right = false;
  //         this.Input._keys.left = true;
  //       } else {
  //         // Within the dead zone, maintain current direction
  //         //we might be facing the wrong direction , so we need to check the deviation of the target position from the current position and press either left or right
  //         const deviation = controlObject.quaternion.angleTo(
  //           this._entity.Quaternion
  //         );
  //         if (Math.abs(deviation) > 1) {
  //           this.Input._keys.left = true;
  //           this.Input._keys.right = false;
  //         } else {
  //           this.Input._keys.left = false;
  //           this.Input._keys.right = false;
  //         }

  //         this.Input._keys.forward = true;

  //         const targetDirection = new THREE.Vector3()
  //           .subVectors(locationposition, controlObject.position)
  //           .normalize();
  //         const currentDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(
  //           this._entity.Quaternion
  //         );
  //         const crossProduct = new THREE.Vector3().crossVectors(
  //           currentDirection,
  //           targetDirection
  //         );
  //         const deadZone = 0.05; // Change this value according to required dead zone size.

  //         try {
  //           if (crossProduct.y < -deadZone) {
  //             // Needs to turn right
  //             this.Input._keys.right = true;
  //             this.Input._keys.left = false;
  //           } else if (crossProduct.y > deadZone) {
  //             // Needs to turn left
  //             this.Input._keys.right = false;
  //             this.Input._keys.left = true;
  //           } else {
  //             // Within the dead zone, maintain current direction
  //             //we might be facing the wrong direction , so we need to check the deviation of the target position from the current position and press either left or right
  //             const deviation = controlObject.quaternion.angleTo(
  //               this._entity.Quaternion
  //             );
  //             if (Math.abs(deviation) > 1) {
  //               this.Input._keys.left = true;
  //               this.Input._keys.right = false;
  //             } else {
  //               this.Input._keys.left = false;
  //               this.Input._keys.right = false;
  //             }
  //           }
  //           this.Input._keys.forward = true;
  //         } catch (error) {
  //           //console.log(error);
  //         }
  //       }
  //     } else {
  //       try {
  //         this.Input._keys.shift = false;
  //         this.Input._keys.forward = false;
  //         this.Input._keys.left = false;
  //         this.Input._keys.right = false;
  //         clearInterval(interval);
  //         return;
  //       } catch (error) {
  //         ////console.log(error);
  //       }
  //     }
  //   }, 5);

  //   this.taskintervals.push(interval);

   
  // }

  async walkToPos(locationPosition: THREE.Vector3, timeout = 20000) {
       //create a red arrow above the  target position and pointing down 
    

    return new Promise((resolve, reject) => {
      // Clear any existing intervals
      if (this.taskintervals) {
        for (let i = 0; i < this.taskintervals.length; i++) {
          clearInterval(this.taskintervals[i]);
          //remove the arrow
          //remove all arrows
          for (let i = 0; i < this.arrows.length; i++) {
            this._entity._entityManager._mc.webgpuscene.remove(this.arrows[i]);
          }
        }
      }
      let arrow = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), locationPosition.clone().add(new THREE.Vector3(0,1,0)), 1, 0xff0000 , 1.0, 0.65);
      //assign a physics material to the arrow
      let material = new  MeshStandardNodeMaterial({ color: 0xff0000 });
      // arrow.line.material = material;
        arrow.cone.material = material;
      arrow.castShadow = true;
      arrow.receiveShadow = true;
      this.arrows.push(arrow);

      this._entity._entityManager._mc.webgpuscene.add(arrow);


      // Setup the interval to check position
      const interval = setInterval(() => {
       locationPosition.y = this._entity.Position.y;
        const controlObject = new THREE.Object3D();
        controlObject.position.copy(this._entity.Position);
        controlObject.quaternion.copy(this._entity.Quaternion);
        controlObject.lookAt(locationPosition);
        const distance = controlObject.position.distanceTo(locationPosition);
  
        const targetDirection = new THREE.Vector3()
          .subVectors(locationPosition, this._entity.Position)
          .normalize();
        const currentDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(this._entity.Quaternion);
        const crossProduct = new THREE.Vector3().crossVectors(currentDirection, targetDirection);
        const deadZone = 0.05;
  
        if (distance > 0.1) {
          try {
            const isWalkingOrRunning = this.AnimationFSMService_.state.value === "Walking" || this.AnimationFSMService_.state.value === "Running";
            this.Input._keys.shift = isWalkingOrRunning && distance > 8;
  
            if (crossProduct.y < -deadZone) {
              this.Input._keys.right = true;
              this.Input._keys.left = false;
            } else if (crossProduct.y > deadZone) {
              this.Input._keys.right = false;
              this.Input._keys.left = true;
            } else {
              const deviation = controlObject.quaternion.angleTo(this._entity.Quaternion);
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
            console.error("Error during walking logic:", error);
          }
        } else {
          
          this._entity._entityManager._mc.webgpuscene. remove(arrow);

          // Target reached, stop and resolve
          clearInterval(interval);
          this.Input._keys.shift = false;
          this.Input._keys.forward = false;
          this.Input._keys.left = false;
          this.Input._keys.right = false;
          resolve(true);
        }
      }, 5);
  
      this.taskintervals.push(interval);
  
      // Setup the timeout
      setTimeout(() => {

        //if it is the last interval ; then reset the keys
        if (this.taskintervals.length == 1) {
          this.Input._keys.shift = false;
          this.Input._keys.forward = false;
          this.Input._keys.left = false;
          this.Input._keys.right = false;
        }
        clearInterval(interval);

 
       
        resolve('Timeout reached before reaching the target position');
      }, timeout);
    });
  }




  createNameTag() {
    const nameTag = document.createElement("div");
    nameTag.className = "name-tag";
  
    const namet = document.createElement("div");
    namet.className = "name";
    namet.style.fontSize = "16px";
    namet.style.fontWeight = "bold";
    namet.style.color = "#333";
    namet.textContent = this._entity.name;
    namet.id = "name";
    namet.style.cursor = "pointer";
  
    const status = document.createElement("div");
    status.className = "status";
    status.style.fontSize = "12px";
    status.style.fontWeight = "regular";
    status.style.color = "#666";
    status.style.marginTop = "-2px";
    status.textContent = "Online";
  
    this._titlebar = document.createElement("div");
    this._titlebar.style.display = "flex";
    this._titlebar.style.flexDirection = "column";
    this._titlebar.style.alignItems = "flex-start";
    this._titlebar.appendChild(nameTag);
    this._titlebar.style.transition = "opacity 0.5s";
  
    const cliContainer = document.createElement("div");
    cliContainer.id = "clicontainer";
    cliContainer.style.display = "none";
    cliContainer.style.position = "absolute";
    cliContainer.style.bottom = "100%";
    cliContainer.style.left = " 0%";
     //cliContainer.style.transform = "translateX(-50%)";
    cliContainer.style.minWidth = "40vw";
    cliContainer.style.maxWidth = "80vw";
    cliContainer.style.maxHeight = "50vh";
     cliContainer.style.overflowY = " auto";

     //rounder corners
      cliContainer.style.borderRadius = "5px";
     
     //create a simple bar
  
    cliContainer.style.scrollbarWidth = "none";
    cliContainer.style.transition = "opacity 0.3s ease-in-out";
 
   
  
    const inlineContainer = document.createElement("div");
    inlineContainer.className = "uk-inline";
    inlineContainer.style.display = "flex";
    inlineContainer.style.alignItems = "left";

  
    const dropIcon = document.createElement("span");
    dropIcon.id = "dropIcon";
    dropIcon.className = "uk-icon";
    dropIcon.setAttribute("uk-icon", "icon: chevron-down; ratio: 0.8");
    dropIcon.style.marginRight = "5px";
    inlineContainer.appendChild(dropIcon);

    const resetIcon = document.createElement("span");
    resetIcon.id = "resetIcon";
    resetIcon.className = "uk-icon";
    resetIcon.setAttribute("uk-icon", "icon: refresh; ratio: 0.8");
    resetIcon.style.marginRight = "5px";
    inlineContainer.appendChild(resetIcon);

    const killicon = document.createElement("span");
    killicon.id = "killicon";
    killicon.className = "uk-icon";
    killicon.setAttribute("uk-icon", "icon: close; ratio: 0.8");
    killicon.style.marginRight = "5px";
    killicon.style.cursor = "pointer";
    killicon.style.color = "red";

    
    const nameElement = document.createElement("div");
    nameElement.id = "name";
    nameElement.style.cursor = "pointer";
    nameElement.style.fontSize = "smaller";
    nameElement.textContent = this._entity.name;
    inlineContainer.appendChild(killicon);
    inlineContainer.appendChild(nameElement);
    this._titlebar.appendChild(inlineContainer);

    this._titlebar.appendChild(cliContainer);
 


    this.uiElement = cliContainer;
    this.uiElement.addEventListener('update', this.updatePosition.bind(this));

 
    const label = new CSS2DObject(this._titlebar);
    label.position.set(0, 2,-1.5);
    this._css2dgroup.add(label);
  
    if (nameElement && dropIcon && resetIcon) {
      nameElement.addEventListener("click", () => {
        this._entity._entityManager._mc.MainEntity = this._entity;
                this.face();
        this.toggleDropdown();
      });

      resetIcon.addEventListener("click", () => {
        this.Reset();
      });
  
      dropIcon.addEventListener("click", ()  => {
        this.toggleDropdown();
      });
    }
    if (killicon) {
      killicon.addEventListener("click", () => {
        this._entity.kill();
      });
    }
    this.resetConsole();


    

  
    // this.uiElement.addEventListener("wheel", (event) => {
    //   event.preventDefault();
    //   this.uiElement.scrollTop += event.deltaY;
    // });
  }
  updatePosition() {
    if (this.uiElement && this._titlebar) {
      const rect = this._titlebar.getBoundingClientRect();
      const uiRect = this.uiElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
  
      // Reset transforms and positions
      this.uiElement.style.transform = '';
      this.uiElement.style.top = '';
      this.uiElement.style.bottom = '100%';  // Default position above the name tag
  
      // Check if there's enough horizontal space
      if (rect.left + uiRect.width > viewportWidth) {
        // Not enough horizontal space, position below the name tag
        this.uiElement.style.top = '100%';
        this.uiElement.style.bottom = 'auto';
      }
  
      // After positioning, check for any remaining overflow
      const updatedRect = this.uiElement.getBoundingClientRect();
  
      // Adjust horizontal position if needed
      if (updatedRect.right > viewportWidth) {
        const overflowX = updatedRect.right - viewportWidth;
        this.uiElement.style.transform = `translateX(-${overflowX}px)`;
      } else if (updatedRect.left < 0) {
        this.uiElement.style.transform = `translateX(${Math.abs(updatedRect.left)}px)`;
      }
  
      // Adjust vertical position if needed
      if (updatedRect.top < 0) {
        this.uiElement.style.top = '0';
        this.uiElement.style.bottom = 'auto';
      } else if (updatedRect.bottom > viewportHeight) {
        const overflowY = updatedRect.bottom - viewportHeight;
        if (this.uiElement.style.top === '100%') {
          // If it's below the name tag, move it up
          this.uiElement.style.top = `calc(100% - ${overflowY}px)`;
        } else {
          // If it's above the name tag, move it down
          this.uiElement.style.bottom = `calc(100% + ${overflowY}px)`;
        }
      }

      // Ensure the icons container is always on top of the CLI container
      const inlineContainer = this._titlebar.querySelector('.uk-inline');
      if (inlineContainer) {
        inlineContainer.style.position = 'relative';
        inlineContainer.style.zIndex = '10'; // High z-index to keep it above the CLI container
      }
    }
  }
  resetConsole(){
    
    let inithtml = /*html*/ `
    <div class="uk-card uk-card-secondary uk-card-body">
      <h3 class="uk-card-title">Greetings !</h3>
      <p class="content">I am your personal coder.</p>
      <button id="loadEnvironment" class="uk-button-default uk-margin-small-right">
        Load Script
        
    </div>


    
  `;
   
  
  StaticCLI.typeSync(this.uiElement, inithtml, 5, true);
  
  
  let button = this.uiElement.querySelector("#loadEnvironment");
   button.addEventListener("click", () => {
    this.Reset();
  }
  );
  }
  
  toggleDropdown() {
    let dropIcon = this._titlebar.querySelector("#dropIcon");
    if (this.uiElement.style.display === "none") {
      this.uiElement.style.display = "block";
      this.uiElement.style.opacity = "0";
      setTimeout(() => {
        this.uiElement.style.opacity = "1";
      }, 0);
      dropIcon.setAttribute("uk-icon", "icon: chevron-up; ratio: 0.8");
    } else {
      this.uiElement.style.opacity = "0";
      setTimeout(() => {
        this.uiElement.style.display = "none";
      }, 300);
      dropIcon.setAttribute("uk-icon", "icon: chevron-down; ratio: 0.8");
    }
  } 
 
 
 
  Reset() {
    this.resetConsole();
    if (!this.worker) {
      if (this.behaviourscriptname !== "") {
      this.LoadWorker( this.behaviourscriptname);
      }
    }
    this.worker?.postMessage({
      type: "reload",
      filename: this.behaviourscriptname,
    });

    if (this.workerloop){
      this.workerloop = null;
    }

    //clear all intervals
    if (this.taskintervals) {
      for (let i = 0; i < this.taskintervals.length; i++) {
        clearInterval(this.taskintervals[i]);
      }
    }
    //reset inputs
    this.Input._keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      space: false,
      shift: false,
    };

    this.task = "notask";
  }
  async InitEntity(): Promise<void> {
    //   <div class="uk-width-expand">
    //   <h4 class="uk-comment-title uk-margin-remove"><a class="uk-link-reset" href="#">Hamza Ben Hassen</a></h4>
    //   <ul class="uk-comment-meta uk-subnav uk-subnav-divider uk-margin-remove-top">
    //     <li><a href="#">Electrical Engineer</a></li>

    //   </ul>

    //   <button class="uk-button" id="contactbutton">Contact </button>
    // </div>
    this.createNameTag();
    //this.toggleUI()
    //console.log("InitEntity CharacterComponent");

    this._entity._entityManager._mc.webgpuscene.add(this._webgpugroup);
    this._entity._entityManager._mc.annoationsScene.add(this._css2dgroup);
    this._entity._entityManager._mc.physicsmanager.world.addBody(this.body);

    //register handler for     this._entity.Broadcast({ topic: "inputinitialized", data: {input : this} }); async (data: any) => {
    this._entity._RegisterHandler("walk", async (data: any) => {
     await this.walkToPos(data.position);
    });

    //register handler for     this._entity.Broadcast({ topic: "inputinitialized", data: {input : this} });
    this._entity._RegisterHandler(
      "inputinitialized",
      (data: { input: any }) => {
        this.Input = data.input;
        if (this.Input) {
          //console.log("input initialized");
        }
      }
    );



    this._entity._RegisterHandler("inputdestroyed", (data: any) => {
      this.Input = null;
      //console.log("input destroyed");
    });

    this._entity._RegisterHandler("loadscript", (data: any) => {
      this.LoadWorker(data.scriptname);
    });

    this._entity._RegisterHandler("position", (data: any) => {
      let p = data as THREE.Vector3;

      this.body.position.set(p.x, p.y, p.z);

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
    this._entity._RegisterHandler("zoom", async () => {
      await this.zoom();
    });
    this._entity._RegisterHandler("face", async () => {
      await this.face();
    });
  }


  respond(message : string){
    StaticCLI.typeSync(
      this.uiElement,
       message,
      1,
      false
    );


  }



  activate(){
    
     //create a animating circle around the character at the position of the character , this circle will be used to show the character is selected
     //a threejs mesh with a circle geometry and a line basic material

 

    

  }

  deactivate(){
      
    this._webgpugroup.remove(this.activationCircle);
    }

  async zoom(radius = 8) {
    let p = this._entity.Position.clone(); // Make sure to clone so you don't accidentally modify the original position
    p.y += 1.5;
    // let quat = this._entity.Quaternion.clone();
    // quat.x += -0.9 + Math.random() * 0.6;
    // quat.y += -2.9 + Math.random() * 9.6;
    // quat.z += -0.9 + Math.random() * 3.6;

    this._entity._entityManager._mc.zoomTo(p, radius);
  }

  async face(radius = 8) {
    let p = this._entity.Position.clone(); // Make sure to clone so you don't accidentally modify the original position
    p.y += 1.5;
    
    let quat = this._entity.Quaternion.clone();
    //add a small 20 degree rotation around y offset 
    quat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 1), 20 * (-Math.PI / 180)));
    //rotate quat around y 180 degrees
    quat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));
    await this._entity._entityManager._mc.zoomTo(p, radius, quat);
  }

  private setupCollisionDetection(): void {
    this.body.addEventListener("collide", (event) => {
      const contact = event.contact;

      // Ensure we're detecting collision on the character's body
      if (contact.bi === this.body || contact.bj === this.body) {
        // Get the other body involved in the collision
        const otherBody = contact.bi === this.body ? contact.bj : contact.bi;

        // Get the collision normal
        const normal = contact.ni.clone();
        if (contact.bi !== this.body) {
          normal.negate(); // Ensure the normal is pointing from our body to the other body
        }
        let forwardDirection: CANNON.Vec3 = new CANNON.Vec3(0, 0, -1);
        // Check if the collision is roughly in front of the character
        this.body.quaternion.vmult( forwardDirection, forwardDirection);
        const angle = normal.dot( forwardDirection);

        // You can adjust this threshold to fine-tune what's considered "in front"
        if (angle < -0.9) { // Collision is in front if the angle is close to -1
         console.log("colliding with a wall");
         this.isColliding_ = true;
        }
        else{
          this.isColliding_ = false;
        }
      }
    });
  }

  async mountvehicle(vehicle: any)  
  {
    this.vehicle = vehicle;   

     this.AnimationFSMService_.send("DRIVE");
    

 
  }

  async unmountvehicle() {
    this.AnimationFSMService_.send("STOPDRIVING");
  }
  
 
  async Update(deltaTime: number): Promise<void> {
    
    //update state name in the title bar
    // this._titlebar.querySelector(".status").textContent =
    //   this.state + " " + this.task;

		if (this.isDriving) {
      if (this.Input._keys.attack1 ) {
         
        //check if an entity is in front of the player
        if ( this.carcomponent){

          this.unmountvehicle();          
          
         } 
       }

			if (
				this.AnimationFSMService_.state.value == "Driving" ||
				this.AnimationFSMService_.state.value == "Unmounting"
			) {
				//position the player on the vehicle , lower the player a bit so it looks like he is sitting and rotate 90 degrees to the right
				let offset = new THREE.Vector3(0.1, -0.75, 0.5);
				this._webgpugroup.position.copy(this.vehicle._entity.Position);
				this._webgpugroup.quaternion.copy(this.vehicle._entity.Quaternion);
				//apply offset considering the rotation of the vehicle
				offset.applyQuaternion(this.vehicle._entity.Quaternion);

				this._webgpugroup.position.add(offset);
				this._webgpugroup.rotateY(-Math.PI / 2);

				this._entity.Position = this._webgpugroup.position;
				this._entity.Quaternion = this._webgpugroup.quaternion;
			}
			if (this.AnimationFSMService_.state.value == "Mounting") {
				//position the player on the vehicle , lower the player a bit so it looks like he is sitting and rotate 90 degrees to the right
				let offset = new THREE.Vector3(0.1, -1.25, 0.9);
				this._webgpugroup.position.copy(this. vehicle._entity.Position);
				this._webgpugroup.quaternion.copy(this.vehicle._entity.Quaternion);
				//apply offset considering the rotation of the vehicle
				offset.applyQuaternion(this.vehicle._entity.Quaternion);

				this._webgpugroup.position.add(offset);
				this._webgpugroup.rotateY(Math.PI);

        this._entity.Position = this._webgpugroup.position;
        this._entity.Quaternion = this._webgpugroup.quaternion;
				//	this.Parent.SetQuaternion(this.group_.quaternion);
			}

			// this.group_.position.copy(this.vehicle.Parent.Position);
			// this.group_.quaternion.copy(this.vehicle.Parent.Quaternion);
			// this.Parent.SetPosition(this.group_.position);
			// this.Parent.SetQuaternion(this.group_.quaternion);
			if (this._mixer) {
				this._mixer.update(deltaTime);
			}
      if (this.workerloop ){
        this.workerloop();
      }
      if (this.Input)
			this.UpdateFSM(this.Input);

			return;
		}



    if (this.workerloop ){
      this.workerloop();
  }
    this._mixer.update(deltaTime);


    //check if no current front collision
    if (!this.body.collisionResponse) {
      this.isColliding_ = false;
    }

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
    if (this.Input) {
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
      if (this.state != "Executing" && this.state != "EndExecuting")
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
            //	//console.log("can jump");
          }

          this.canJump = true;
        }
      
      });

    
 
     
      

      if (this.body.velocity.y > 0.1 && this.canJump == true) {
        //	this.body.velocity.y = 0;
      }

      if (!this.canJump && this.AnimationFSMService_.state.value != "Falling") {
        this.AnimationFSMService_.send("FALL");
        ////console.log("falling");
      } else if (
        this.canJump &&
        this.AnimationFSMService_.state.value == "Falling"
      ) {
        this.AnimationFSMService_.send("LAND");
        //	//console.log(" landed");
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

      if (this.Input._keys.attack1 ) {
         
        //check if an entity is in front of the player
        if ( this.carcomponent){

          this.mountvehicle (this.carcomponent);          
          
         } 
  }
    
    }

    //calculate the distance between the entity and the camera
    const distance = this._entity.Position.distanceTo(
      this._entity._entityManager._mc.camera.position
    );

    if (this.worker) {
      this.worker.postMessage({
        type: "update",
        position: this._entity.Position,
        quaternion: [
          this._entity.Quaternion.x,
          this._entity.Quaternion.y,
          this._entity.Quaternion.z,
          this._entity.Quaternion.w,
        ],
        target:
          this._entity._entityManager._mc.UIManager.attentionCursor.position,
        state: this.state,
        dt: deltaTime,
      });
    }
    //hide the opacity of this._titlebar if the distance is greater than 10
    if (this._titlebar){

    if (distance > 35) {
      this._titlebar.style.opacity = "0";
      this._titlebar.style.pointerEvents = "none";
    } else {
      this._titlebar.style.opacity = "1";
      this._titlebar.style.pointerEvents = "auto";
      this.uiElement.dispatchEvent(new Event('update'));

    }
  }}




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

    // for (let i = this._css3dgroup.children.length - 1; i >= 0; i--) {
    //   //find all instances of css2dobject and remove them
    //   if (this._css3dgroup.children[i] instanceof CSS2DObject) {
    //     this._css3dgroup.remove(this._css3dgroup.children[i]);
    //   }
    // }
    this._entity._entityManager._mc.annoationsScene.remove(this._css2dgroup);
  }

  getAcceleration(state: string) {
    switch (state) {
      case "Ideling":
        return 0;
      case "Walking":
        if (this.isColliding_) {
          return 0;
        }
        return 4;
      case "Running":
        if (this.isColliding_) {
          return 0;
        }
        return 9;
      case "BackwardWalking":
        return 1.45;
      case "SlowWalking":
        return 1.35;
      case "Landing":
        return 0;
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
 
}

export { CharacterComponent };
