import { Entity } from "../Entity.js";
import { Component } from "../Component.js";
import * as CANNON from "cannon-es";
import * as THREE from "three";
import { LoadingManager } from "../LoadingManager";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

import {
  SoundGeneratorAudioListener,
  SineWaveSoundGenerator,
  EngineSoundGenerator,
  AudioSoundGenerator,
} from "../Sound_generator_worklet_wasm.js";
import Engine from "../Engine.js";
import UIkit from "uikit";
import Icons from "uikit/dist/js/uikit-icons";
import { SkeletonUtils } from "three/examples/jsm/Addons.js";
class CarComponent extends Component {
  body: CANNON.Body;
  vehicle: CANNON.RaycastVehicle;
  steeringTween: any;
  input: any;
  throttle: any;
  maxSteerVal = 0.1;
  steerStep = 0.025;
  maxBreakForce = 500;
  soundCarEngine: any;
  engine: Engine;
  joystick: boolean;
  gear: number;
  carWorker: Worker;
  loadingManager: THREE.LoadingManager;
  carChassis: any;
  doorOpen: boolean;
  initialPositionSet: boolean;
  Driver: Entity;
  rpm: number;
  mass: any;
  scene: THREE.Scene;
  steeringValue: number;
  physicsManager: any;
  world: any;
  wheelMeshes: any;
  wheelMaterial: any;
  group_: THREE.Group<THREE.Object3DEventMap>;
  maxForce: number;
  listener: any;
  CarMesh: THREE.Mesh<
    THREE.BoxGeometry,
    THREE.MeshLambertMaterial,
    THREE.Object3DEventMap
  >;
  _mesh: any;
  wheelBodies: any[];
  Manager: any;
  Parent: any;
  Input: any;
  _webgpugroup: any;
  private _titlebar: any;
  private _css2dgroup: any;
  constructor(params: any) {
    super();
    this._webgpugroup = new THREE.Group();
    this._css2dgroup = new THREE.Group();

    //  this.name = "PhysicsComponent";
    // this.Parent.Position
    this.wheelBodies = [];
    this.wheelMeshes = [];
  }

  ReloadEngine() {
    this.carWorker?.postMessage({
      type: "reload",
      filename: "car.js",
    });
  }
  openDoor() {
    if (!this.doorOpen) {
      //find mesh child with name : "DriverDoor"
      const door = this.carChassis.getObjectByName("DriverDoor");
      const window = this.carChassis.getObjectByName("glass001");
      let temp = { x: 0, y: 0 };
      if (door && window) {
        // let tween = new TWEEN.Tween(temp ).to(
        // 	{
        // 		x:50 ,
        // 		y : 140

        // 	}
        // ).onUpdate(
        // 	door.translateX( 50)

        // ).start()
        // 				{ x: 100 }, 500 ).start()
        // 				}

        // 			else {

        door.rotateZ(-Math.PI / 3);
        door.translateZ(0);
        door.translateY(140);
        door.translateX(50);

        window.rotateZ(-Math.PI / 3);
        window.translateZ(0);
        window.translateY(140);
        window.translateX(50);
        this.doorOpen = true;
        //door.position.set(0, 0, 2);
      }
    }
  }
  closeDoor() {
    if (this.doorOpen) {
      const door = this.carChassis.getObjectByName("DriverDoor");
      const window = this.carChassis.getObjectByName("glass001");
      if (door && window) {
        door.translateZ(0);
        door.translateY(-140);
        door.translateX(-50);
        door.rotateZ(Math.PI / 3);

        window.translateZ(0);
        window.translateY(-140);
        window.translateX(-50);
        window.rotateZ(Math.PI / 3);
        this.doorOpen = false;
        //door.position.set(0, 0, 2);
      }
    }
  }
  soundReady() {
    this.soundCarEngine = new EngineSoundGenerator({
      listener: this.listener,
      parameters: {
        cylinders: 2,

        intakeWaveguideLength: 100,
        exhaustWaveguideLength: 100,
        extractorWaveguideLength: 100,

        intakeOpenReflectionFactor: 0.01,
        intakeClosedReflectionFactor: 0.95,

        exhaustOpenReflectionFactor: 0.01,
        exhaustClosedReflectionFactor: 0.95,
        ignitionTime: 0.216,

        straightPipeWaveguideLength: 128,
        straightPipeReflectionFactor: 0.01,

        mufflerElementsLength: [10, 300, 20, 25],
        action: 0.1,

        outletWaveguideLength: 15,
        outletReflectionFactor: 0.02,
      },
      clamp: true,
      gain: 0.02,
      gainEngineBlockVibrations: 0.02,
      gainOutlet: 0.02,
    });
    // let gainNode = this.soundCarEngine.gain;
    // gainNode.gain.value = 0.02 ;
    // this.soundCarEngine.gainEngineBlockVibrations.gain.value =0.02;
    // this.soundCarEngine.gainOutlet.gain.value = 0.02 ;

    this._webgpugroup.add(this.soundCarEngine);
  }
  createnameTag() {
   
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

    let name = this._titlebar.querySelector("#name");
    if ( name){
     name.addEventListener("click", () => {
      this.Reset();
      this.ReloadEngine();
     });

  }

  
  }
  async CreateCar() {
    this.body = new CANNON.Body({
      mass: 5500,
      shape: new CANNON.Box(new CANNON.Vec3(2.75, 0.5, 1)),
      //material: carBodyMaterial,
      //collisionFilterGroup: 4,
    });
    this.body.sleepSpeedLimit = 0.1; // Body will feel sleepy if speed<1 (speed == norm of velocity)
    //add mesh to body
    const carGeo = new THREE.BoxGeometry(5.5, 1, 2);

    //
    this.CarMesh = new THREE.Mesh(
      carGeo,
      new THREE.MeshLambertMaterial({
        color: "#949494",
        flatShading: true,
        side: THREE.DoubleSide,
        wireframe: true,
        //		map: texture,
      })
    );

    //	this.carChassis = await    LoadingManager.loadGLTF("models/gltf/dirty_car/scene.gltf")
    this.carChassis = this.CarMesh;
    console.log("carChassis", this.carChassis);
    //this.carChassis.scale.set(0.010, 0.01, 0.010);
    //	this.carChassis.position.set(0, -1.0, 0);
    //rotate the car chassis 90 degrees on the x axis
    //this.carChassis.rotation.y =- Math.PI / 2;
    this._webgpugroup.add(this.carChassis);

    this.CarMesh.castShadow = true;
    this.CarMesh.receiveShadow = true;

    this._entity._entityManager._mc.webgpuscene.add(this._webgpugroup);
    //this._webgpugroup.add(this.CarMesh);

    this.body.position.set(0, 5, 0);
    this.body.angularVelocity.set(0, 0, 0);
  
    this.vehicle = new CANNON.RaycastVehicle({
      chassisBody: this.body,
      // indexRightAxis: 0,
      // indexUpAxis: 1,
      // indexForwardAxis:2,
    });

    const wheelOptions = {
      radius: 0.8,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionStiffness: 15,
      suspensionRestLength: 0.4,
      frictionSlip: 0.52,
      dampingRelaxation: 0.3,
      dampingCompression: 1.4,
      maxSuspensionForce: 150000,
      rollInfluence: 0.6,
      axleLocal: new CANNON.Vec3(0, 0, 1),
      chassisConnectionPointLocal: new CANNON.Vec3(-1, 0, 1),
      maxSuspensionTravel: 2.3,
      customSlidingRotationalSpeed: 30,
      useCustomSlidingRotationalSpeed: false,
      //	material : this.wheelMaterial,
    };

    wheelOptions.chassisConnectionPointLocal.set(-1.85, -0.5, 1.0);
    // wheelOptions.radius = 0.8;
    // wheelOptions.maxSuspensionTravel= 1.3;

    this.vehicle.addWheel(wheelOptions);

    wheelOptions.chassisConnectionPointLocal.set(-1.85, -0.5, -1);
    // wheelOptions.radius = 0.8;
    // wheelOptions.maxSuspensionTravel= 1.3;

    this.vehicle.addWheel(wheelOptions);

    wheelOptions.chassisConnectionPointLocal.set(1.65, -0.5, 1.0);
    // wheelOptions.radius = 0.8;
    // wheelOptions.maxSuspensionTravel= 2.6;
    // wheelOptions.suspensionStiffness= 60;

    this.vehicle.addWheel(wheelOptions);

    wheelOptions.chassisConnectionPointLocal.set(1.65, -0.5, -1);
    // wheelOptions.radius = 0.8;
    // wheelOptions.maxSuspensionTravel= 2.6;
    // wheelOptions.suspensionStiffness= 60;
    this.vehicle.addWheel(wheelOptions);

    // wheelOptions.chassisConnectionPointLocal.set(0, -0.5, -0);
    // this.vehicle.addWheel(wheelOptions);

    this.vehicle.addToWorld(this.world);

    //   const wheelMaterial = new CANNON.Material('wheel')
    //create wheel mesh

    this.vehicle.wheelInfos.forEach(async (wheel) => {
      const cylinderShape = new CANNON.Cylinder(
        wheel.radius,
        wheel.radius,
        wheel.radius / 2,
        30
      );
      const wheelBody = new CANNON.Body({
        mass: 0,
        material: this.wheelMaterial,
      });
      wheelBody.type = CANNON.Body.KINEMATIC;
      wheelBody.collisionFilterGroup = 0; // turn off collisions
      const quaternion = new CANNON.Quaternion().setFromEuler(
        -Math.PI / 2,
        0,
        0
      );

      let wheelMesh2 = await LoadingManager.loadGLTF("models/gltf/wheel.gltf");

      let wheelMesh1 = SkeletonUtils.clone(wheelMesh2);
	  wheelMesh1.scale.set(1.3, 1.3, 1.3);

      this.wheelMeshes.push(wheelMesh1);
      wheelMesh1.position.copy(
        new THREE.Vector3(
          wheel.chassisConnectionPointLocal.x,
          wheel.chassisConnectionPointLocal.y,
          wheel.chassisConnectionPointLocal.z
        )
      );
      this._entity._entityManager._mc.webgpuscene.add(wheelMesh1);

      wheelBody.addShape(cylinderShape, new CANNON.Vec3(), quaternion);
      this.wheelBodies.push(wheelBody);
      this.world.addBody(wheelBody);
    });

    this.carWorker = new Worker("./workers/dynamicloader.js?" + Date.now());
    this.carWorker.onmessage = (e) => {
      //	console.log("Message received from worker", e.data);
      if (e.data.type === "boot") {
        this.carWorker.postMessage({
          type: "init",
          filename: "car.js",
        });
      }
      if (e.data.type === "tick") {
        this.rpm = e.data.rpm;
        this.gear = e.data.gear;
        //apply forces
        this.vehicle.applyEngineForce(-e.data.engineForce1, 1);
        this.vehicle.applyEngineForce(-e.data.engineForce2, 2);
        this.vehicle.applyEngineForce(-e.data.engineForce3, 3);
        this.vehicle.applyEngineForce(-e.data.engineForce0, 0);

        //apply steering
        this.vehicle.setSteeringValue(e.data.steeringValue, 0);
        this.vehicle.setSteeringValue(e.data.steeringValue, 1);

        //apply brakes
        this.vehicle.setBrake(e.data.brakeForce, 0);
        this.vehicle.setBrake(e.data.brakeForce, 1);
        this.vehicle.setBrake(e.data.brakeForce, 2);
        this.vehicle.setBrake(e.data.brakeForce, 3);

        //apply suspension
      }
      if (e.data.type === "wheelupdate") {
        console.log(e.data.wheelOptions);

        let wheelOptions = e.data.wheelOptions;

    
        for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
          this.vehicle.wheelInfos[i].radius = wheelOptions.radius;
          this.vehicle.wheelInfos[i].suspensionStiffness =
            wheelOptions.suspensionStiffness;
          this.vehicle.wheelInfos[i].suspensionRestLength =
            wheelOptions.suspensionRestLength;
          this.vehicle.wheelInfos[i].frictionSlip = wheelOptions.frictionSlip;
          this.vehicle.wheelInfos[i].dampingRelaxation =
            wheelOptions.dampingRelaxation;
          this.vehicle.wheelInfos[i].dampingCompression =
            wheelOptions.dampingCompression;
          this.vehicle.wheelInfos[i].maxSuspensionForce =
            wheelOptions.maxSuspensionForce;
          this.vehicle.wheelInfos[i].rollInfluence = wheelOptions.rollInfluence;
          this.vehicle.wheelInfos[i].maxSuspensionTravel =
            wheelOptions.maxSuspensionTravel;
          this.vehicle.wheelInfos[i].customSlidingRotationalSpeed =
            wheelOptions.customSlidingRotationalSpeed;
          this.vehicle.wheelInfos[i].useCustomSlidingRotationalSpeed =
            wheelOptions.useCustomSlidingRotationalSpeed;

          this.wheelBodies.forEach((wheelBody) => {
            wheelBody.shapes.forEach((shape) => {
              if (shape instanceof CANNON.Cylinder) {
                shape.radiusTop = wheelOptions.radius;
                shape.radiusBottom = wheelOptions.radius;
                shape.height = wheelOptions.radius / 2;
                shape.updateBoundingSphereRadius();
              }
            });
          });
        }
 
      }
      if (e.data.type === "soundupdate") {
        console.log("soundupdate", e.data);
        if (this.soundCarEngine) {
          this.soundCarEngine?.stop();
          this._webgpugroup.remove(this.soundCarEngine);
        }
        console.log("soundupdate", e.data.mufflerElementsLength);

        this.loadingManager.onLoad = function () {
          this.soundCarEngine = new EngineSoundGenerator({
            listener: this.listener,

            //postMessage({ type: 'soundupdate' , soundoptions : soundoptions , clamp : clamp , gain : gain , gainEngineBlockVibrations : gainEngineBlockVibrations , gainOutlet : gainOutlet });

            parameters: e.data.soundoptions,
            clamp: e.data.clamp,
            gain: e.data.gain,
            gainEngineBlockVibrations: e.data.gainEngineBlockVibrations,
            gainOutlet: e.data.gainOutlet,
          });
          //  let gainNode = this.soundCarEngine.gain;
          //  gainNode.gain.value = 0.2 ;

          //   this.soundCarEngine.gainEngineBlockVibrations.gain.value =0.2;

          // 	  this.soundCarEngine.gainOutlet.gain.value = 0.2 ;

          //  this._webgpugroup.add(this.soundCarEngine);

          // this.soundCarEngine.gain.value = 0.001 ;
          // this.soundCarEngine.gainEngineBlockVibrations.gain.value = 0.001
          // this.soundCarEngine.gainOutlet.gain.value = 0.001

          this.soundCarEngine.play();
          //remove existing this.soundCarEngine from this._webgpugroup

          this._webgpugroup.add(this.soundCarEngine);
        }.bind(this);

        EngineSoundGenerator.load(this.loadingManager, this.listener, ".");
      }
    };
  }

  async InitComponent(entity: Entity): Promise<void> {
    this._entity = entity;
    return Promise.resolve();
  }
  async InitEntity(): Promise<void> {
    this.listener = this._entity._entityManager._mc.listener;
    this._entity._entityManager._mc.annoationsScene.add(this._css2dgroup);
    this.createnameTag();
    this.mass = 550;
    //this.input = params.input;

    this._webgpugroup = new THREE.Group();
    this.steeringValue = 0;
    this.physicsManager = this._entity._entityManager._mc.physicsmanager;
    this.world = this.physicsManager.world;
    //wheel meshes
    this.wheelMaterial = this.physicsManager.wheelMaterial;

    this.engine = new Engine();

    this.maxForce = 5000;
    this.maxSteerVal = 0.4;
    this.throttle = { x: 0, y: 0 };
    this.rpm = 0;
    this.gear = 0;
    this.joystick = false;
    //
    this.loadingManager = new THREE.LoadingManager();
    this.initialPositionSet = false;
    this._entity._RegisterHandler(
      "inputinitialized",
      (data: { input: any }) => {
        this.Input = data.input;
        if (this.Input) {
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

    });

    this._entity._RegisterHandler("quaternion", (data: any) => {
      let q = data as THREE.Quaternion;

      this._webgpugroup?.quaternion.set(q.x, q.y, q.z, q.w);
    });
    await this.CreateCar();
    return Promise.resolve();
  }

  interact(data: any) {
    console.log("interact");
    if (this.doorOpen) this.closeDoor();
    else this.openDoor();

  }

  //

  Reset() {
    this.body.position.set(
      this.body.position.x,
      this.body.position.y + 10,
      this.body.position.z
    );
    this.body.quaternion.set(0, 0, 0, 1);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
  }

  Update(dt: number) {
    if (this.soundCarEngine) {
      let rpmParam = this.soundCarEngine.worklet.parameters.get("rpm");
      rpmParam.value = this.rpm;
    }

    let speed = this.body.velocity.length();

    if (this.Input) {
      this.carWorker?.postMessage({
        type: "update",
        input: this.Input._keys,
        speed: speed,
        rpm: this.rpm,
        dt: dt,
      });
    }

    //

    if (this.vehicle && this.body && this.wheelBodies.length > 0) {
      // window.alert("update")
      for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
        this.vehicle.updateWheelTransform(i);
        let transform = this.vehicle.wheelInfos[i].worldTransform;
        let wheelBody = this.wheelBodies[i];
        wheelBody.position = new CANNON.Vec3(
          transform.position.x,
          transform.position.y,
          transform.position.z
        );
        wheelBody.quaternion.copy(transform.quaternion);
        this.wheelMeshes[i].position.copy(transform.position);
        this.wheelMeshes[i].quaternion.copy(transform.quaternion);
        this.wheelMeshes[i].rotateY(Math.PI / 2);
      }
    }

    this._entity.Position = new THREE.Vector3(
      this.body.position.x,
      this.body.position.y,
      this.body.position.z
    );
    this._entity.Quaternion = new THREE.Quaternion(
      this.body.quaternion.x,
      this.body.quaternion.y,
      this.body.quaternion.z,
      this.body.quaternion.w
    );
    const distance = this._entity.Position.distanceTo(
      this._entity._entityManager._mc.camera.position
    );
    if (distance > 15) {
      
      this._titlebar.style.opacity = "0";
      this._titlebar.style.pointerEvents = "none";
    } else {
      this._titlebar.style.opacity = "1";
      this._titlebar.style.pointerEvents = "auto";
    }
  }



  Destroy() {
    this.world.removeBody(this.body);
    this.world.removeBody(this.vehicle);
    this.vehicle.removeFromWorld(this.world);
    //remove wheels from world
    for (let i = 0; i < this.wheelBodies.length; i++) {
      this.world.removeBody(this.wheelBodies[i]);
    }
    //remove the wheel meshes
    this.wheelMeshes.forEach((wheel) => {
      this._entity._entityManager._mc.webgpuscene.remove(wheel);
    });

    //remove the car mesh
    this._entity._entityManager._mc.webgpuscene.remove(this._webgpugroup);
    if (this.soundCarEngine) {
      this.soundCarEngine.stop();
    }

    if (this.carWorker) {
      this.carWorker.terminate();
    }

    return Promise.resolve();
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

  constructor() {
    super();
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
  }

  Update(deltaTime: number): void {}
}

export { CarComponent };
